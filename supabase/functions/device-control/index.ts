import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ControlRequest {
  device_id: string;
  control_name: string;
  value?: boolean;
  intensity?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const controlData: ControlRequest = await req.json();

    if (!controlData.device_id || !controlData.control_name) {
      return new Response(
        JSON.stringify({ error: 'device_id and control_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify device ownership
    const { data: device } = await supabase
      .from('devices')
      .select('id')
      .eq('device_id', controlData.device_id)
      .eq('user_id', user.id)
      .single();

    if (!device) {
      return new Response(
        JSON.stringify({ error: 'Device not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert control command
    const { data, error } = await supabase
      .from('device_controls')
      .insert({
        device_id: device.id,
        control_name: controlData.control_name,
        control_type: controlData.intensity !== undefined ? 'slider' : 'relay',
        value: controlData.value ?? false,
        intensity: controlData.intensity ?? 0,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('Control command sent:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in device-control function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred processing your request',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
