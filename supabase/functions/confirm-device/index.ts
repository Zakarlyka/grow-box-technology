import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { device_token, device_id, name, type, location } = await req.json();

    if (!device_token || !device_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: device_token and device_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Confirming device:', { device_id, device_token });

    // Verify token in pending_devices
    const { data: pendingDevice, error: tokenError } = await supabase
      .from('pending_devices')
      .select('*')
      .eq('device_token', device_token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !pendingDevice) {
      console.error('Invalid or expired token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create device record
    const { data: newDevice, error: deviceError } = await supabase
      .from('devices')
      .insert({
        user_id: pendingDevice.user_id,
        device_id: device_id,
        name: name || 'New Device',
        type: type || 'grow_box',
        location: location || null,
        status: 'online',
        last_seen: new Date().toISOString(),
      })
      .select()
      .single();

    if (deviceError) {
      console.error('Error creating device:', deviceError);
      return new Response(
        JSON.stringify({ error: 'Failed to create device', details: deviceError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete used token
    const { error: deleteError } = await supabase
      .from('pending_devices')
      .delete()
      .eq('device_token', device_token);

    if (deleteError) {
      console.error('Error deleting token:', deleteError);
    }

    console.log('Device confirmed successfully:', newDevice);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Device confirmed',
        device: newDevice,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in confirm-device function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
