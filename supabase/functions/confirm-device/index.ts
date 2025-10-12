import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConfirmRequest {
  deviceId: string;
  userId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client for auth check
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: ConfirmRequest = await req.json();
    const { deviceId } = body;

    if (!deviceId) {
      return new Response(
        JSON.stringify({ error: 'Missing deviceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[confirm-device] Checking device: ${deviceId} for user: ${user.id}`);

    // Create authenticated Supabase client with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        db: { schema: 'public' },
        auth: { persistSession: false }
      }
    );

    // Check if device exists with this device_id and belongs to authenticated user
    const { data: device, error: checkError } = await supabase
      .from('devices')
      .select('id, user_id, device_id, name, type, status, last_seen')
      .eq('device_id', deviceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking device:', checkError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: checkError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Device not found
    if (!device) {
      console.log(`[confirm-device] Device not found: ${deviceId}`);
      return new Response(
        JSON.stringify({ 
          status: 'not_found',
          error: 'Device not found. Register it first via /setup endpoint.',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check device_logs for recent activity (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: lastLog, error: logError } = await supabase
      .from('device_logs')
      .select('*')
      .eq('device_id', device.id)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (logError) {
      console.error('Error checking device logs:', logError);
    }

    // Determine device status
    const isConnected = lastLog !== null;
    const newStatus = isConnected ? 'online' : 'offline';

    console.log(`[confirm-device] Device ${deviceId} status: ${newStatus}, has recent log: ${!!lastLog}`);

    // Update device status and last_seen
    const { error: updateError } = await supabase
      .from('devices')
      .update({ 
        status: newStatus,
        last_seen: new Date().toISOString()
      })
      .eq('id', device.id);

    if (updateError) {
      console.error('Error updating device:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update device status', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return device status with optional last log
    return new Response(
      JSON.stringify({ 
        status: isConnected ? 'connected' : 'offline',
        device: {
          id: device.id,
          device_id: device.device_id,
          name: device.name,
          type: device.type,
          status: newStatus,
          last_seen: device.last_seen
        },
        last_log: lastLog || null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in confirm-device function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
