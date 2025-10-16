import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteRequest {
  device_id: string;
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

    const deleteData: DeleteRequest = await req.json();

    if (!deleteData.device_id) {
      return new Response(
        JSON.stringify({ error: 'device_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify device ownership
    const { data: device } = await supabase
      .from('devices')
      .select('id, device_id')
      .eq('device_id', deleteData.device_id)
      .eq('user_id', user.id)
      .single();

    if (!device) {
      return new Response(
        JSON.stringify({ error: 'Device not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete related records first (due to foreign keys)
    await supabase.from('device_controls').delete().eq('device_id', device.id);
    await supabase.from('device_logs').delete().eq('device_id', device.device_id);
    await supabase.from('sensor_data').delete().eq('device_id', device.id);
    await supabase.from('device_schedules').delete().eq('device_id', device.id);

    // Delete the device
    const { error: deleteError } = await supabase
      .from('devices')
      .delete()
      .eq('id', device.id);

    if (deleteError) throw deleteError;

    console.log('Device deleted:', device.device_id);

    return new Response(
      JSON.stringify({ success: true, message: 'Device and related data deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in device-delete function:', error);
    
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
