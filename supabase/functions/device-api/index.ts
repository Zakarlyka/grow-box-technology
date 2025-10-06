import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const sensorDataSchema = {
  temperature: { min: -50, max: 100 },
  humidity: { min: 0, max: 100 },
  soil_moisture: { min: 0, max: 100 },
  light_level: { min: 0, max: 100000 },
  water_level: { min: 0, max: 100 },
  ph_level: { min: 0, max: 14 },
  ec_level: { min: 0, max: 10000 },
};

function validateSensorData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    
    if (typeof value !== 'number') {
      errors.push(`${key} must be a number`);
      continue;
    }
    
    const schema = sensorDataSchema[key as keyof typeof sensorDataSchema];
    if (schema) {
      if (value < schema.min) errors.push(`${key} must be at least ${schema.min}`);
      if (value > schema.max) errors.push(`${key} must be at most ${schema.max}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

interface DeviceLogRequest {
  device_id: string;
  temperature?: number;
  humidity?: number;
  soil_moisture?: number;
  light_level?: number;
  water_level?: number;
  ph_level?: number;
  ec_level?: number;
}

interface DeviceActionRequest {
  device_id: string;
  control_name: string;
  value?: boolean;
  intensity?: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const segments = url.pathname.split('/').filter(Boolean);
    
    // GET /device-api/device/:id/logs - Get device sensor logs
    if (req.method === 'GET' && segments[1] === 'device' && segments[3] === 'logs') {
      const deviceId = segments[2];
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);
      const hours = Math.min(parseInt(url.searchParams.get('hours') || '24'), 168);
      
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);

      // Verify device ownership
      const { data: device } = await supabase
        .from('devices')
        .select('id')
        .eq('device_id', deviceId)
        .eq('user_id', user.id)
        .single();

      if (!device) {
        return new Response(
          JSON.stringify({ error: 'Device not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: logs, error } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('device_id', device.id)
        .gte('timestamp', cutoffTime.toISOString())
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return new Response(JSON.stringify({ logs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /device-api/device/:id/log - Add sensor data
    if (req.method === 'POST' && segments[1] === 'device' && segments[3] === 'log') {
      const deviceId = segments[2];
      const logData: DeviceLogRequest = await req.json();

      // Validate sensor data
      const validation = validateSensorData(logData);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: 'Validation failed', details: validation.errors }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify device ownership
      const { data: device } = await supabase
        .from('devices')
        .select('id, user_id')
        .eq('device_id', deviceId)
        .eq('user_id', user.id)
        .single();

      if (!device) {
        return new Response(
          JSON.stringify({ error: 'Device not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update device last_seen
      await supabase
        .from('devices')
        .update({ 
          last_seen: new Date().toISOString(),
          status: 'online'
        })
        .eq('id', device.id);

      // Insert sensor data
      const { data, error } = await supabase
        .from('sensor_data')
        .insert({
          device_id: device.id,
          temperature: logData.temperature,
          humidity: logData.humidity,
          soil_moisture: logData.soil_moisture,
          light_level: logData.light_level,
          water_level: logData.water_level,
          ph_level: logData.ph_level,
          ec_level: logData.ec_level,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Check for alerts
      if (logData.temperature !== undefined || logData.humidity !== undefined) {
        await checkAlerts(supabase, device.id, logData);
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /device-api/device/:id/settings - Get device settings
    if (req.method === 'GET' && segments[1] === 'device' && segments[3] === 'settings') {
      const deviceId = segments[2];

      const { data: device, error } = await supabase
        .from('devices')
        .select('configuration, device_controls(*)')
        .eq('device_id', deviceId)
        .eq('user_id', user.id)
        .single();

      if (error || !device) {
        return new Response(
          JSON.stringify({ error: 'Device not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ settings: device }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /device-api/device/:id/settings - Update device settings
    if (req.method === 'PUT' && segments[1] === 'device' && segments[3] === 'settings') {
      const deviceId = segments[2];
      const settings = await req.json();

      const { data: device } = await supabase
        .from('devices')
        .select('id')
        .eq('device_id', deviceId)
        .eq('user_id', user.id)
        .single();

      if (!device) {
        return new Response(
          JSON.stringify({ error: 'Device not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('devices')
        .update({ 
          configuration: settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', device.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /device-api/device/:id/action - Control device
    if (req.method === 'POST' && segments[1] === 'device' && segments[3] === 'action') {
      const deviceId = segments[2];
      const actionData: DeviceActionRequest = await req.json();

      // Validate control data
      if (!actionData.control_name || actionData.control_name.length > 50) {
        return new Response(
          JSON.stringify({ error: 'Invalid control name' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (actionData.intensity !== undefined && (actionData.intensity < 0 || actionData.intensity > 100)) {
        return new Response(
          JSON.stringify({ error: 'Intensity must be between 0 and 100' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: device } = await supabase
        .from('devices')
        .select('id')
        .eq('device_id', deviceId)
        .eq('user_id', user.id)
        .single();

      if (!device) {
        return new Response(
          JSON.stringify({ error: 'Device not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update or insert device control
      const { data, error } = await supabase
        .from('device_controls')
        .upsert({
          device_id: device.id,
          control_name: actionData.control_name,
          control_type: actionData.intensity !== undefined ? 'slider' : 'switch',
          value: actionData.value,
          intensity: actionData.intensity,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'device_id,control_name'
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /device-api/device/:id/schedules - Get device schedules
    if (req.method === 'GET' && segments[1] === 'device' && segments[3] === 'schedules') {
      const deviceId = segments[2];

      const { data: device } = await supabase
        .from('devices')
        .select('id')
        .eq('device_id', deviceId)
        .eq('user_id', user.id)
        .single();

      if (!device) {
        return new Response(
          JSON.stringify({ error: 'Device not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: schedules, error } = await supabase
        .from('device_schedules')
        .select('*')
        .eq('device_id', device.id)
        .eq('is_active', true);

      if (error) throw error;

      return new Response(JSON.stringify({ schedules }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }), 
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in device-api function:', {
      error: error.message,
      stack: error.stack,
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred processing your request',
        code: 'INTERNAL_ERROR'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

async function checkAlerts(supabase: any, deviceId: string, data: DeviceLogRequest) {
  try {
    // Get device owner's notification settings
    const { data: device } = await supabase
      .from('devices')
      .select('user_id, notification_settings(*)')
      .eq('id', deviceId)
      .single();

    if (!device?.notification_settings) return;

    const settings = device.notification_settings;
    let alertTriggered = false;
    let alertMessage = '';

    if (data.temperature !== undefined) {
      if (settings.temperature_min && data.temperature < settings.temperature_min) {
        alertTriggered = true;
        alertMessage += `Temperature too low: ${data.temperature}°C (min: ${settings.temperature_min}°C). `;
      }
      if (settings.temperature_max && data.temperature > settings.temperature_max) {
        alertTriggered = true;
        alertMessage += `Temperature too high: ${data.temperature}°C (max: ${settings.temperature_max}°C). `;
      }
    }

    if (data.humidity !== undefined) {
      if (settings.humidity_min && data.humidity < settings.humidity_min) {
        alertTriggered = true;
        alertMessage += `Humidity too low: ${data.humidity}% (min: ${settings.humidity_min}%). `;
      }
      if (settings.humidity_max && data.humidity > settings.humidity_max) {
        alertTriggered = true;
        alertMessage += `Humidity too high: ${data.humidity}% (max: ${settings.humidity_max}%). `;
      }
    }

    if (alertTriggered && (settings.email_enabled || settings.push_enabled)) {
      console.log(`Alert triggered for device ${deviceId}: ${alertMessage}`);
      // TODO: Call notification system
    }
  } catch (error) {
    console.error('Error checking alerts:', error);
  }
}

serve(handler);
