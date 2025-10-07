import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SetupRequest {
  device_id: string;
  key: string;
  name?: string;
  type?: string;
  location?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SetupRequest = await req.json();
    const { device_id, key, name, type, location } = body;

    if (!device_id || !key) {
      return new Response(
        JSON.stringify({ error: 'Missing device_id or key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate key format (simple validation - you can enhance this)
    if (key.length < 16) {
      return new Response(
        JSON.stringify({ error: 'Invalid key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Setting up device ${device_id} for user ${user.id}`);

    // Check if device already exists
    const { data: existingDevice } = await supabase
      .from('devices')
      .select('id, user_id')
      .eq('device_id', device_id)
      .single();

    if (existingDevice) {
      // Device exists - check ownership
      if (existingDevice.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Device already registered to another user' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Update existing device
      const { error: updateError } = await supabase
        .from('devices')
        .update({
          name: name || `Device ${device_id.slice(-6)}`,
          type: type || 'grow_box',
          location: location || null,
          status: 'online',
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDevice.id);

      if (updateError) {
        console.error('Error updating device:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update device' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Device updated successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new device
    const { data: newDevice, error: insertError } = await supabase
      .from('devices')
      .insert({
        user_id: user.id,
        device_id: device_id,
        name: name || `Device ${device_id.slice(-6)}`,
        type: type || 'grow_box',
        location: location || null,
        status: 'online',
        last_seen: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating device:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to register device' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Device registered successfully:', newDevice.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Device registered successfully',
        device: {
          id: newDevice.id,
          device_id: newDevice.device_id,
          name: newDevice.name,
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Setup error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
