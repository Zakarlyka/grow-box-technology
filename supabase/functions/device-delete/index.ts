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

    // Delete related records in correct order (due to foreign keys)
    console.log('Deleting related data for device:', device.id);

    // 1. Device controls
    const { count: controlsCount } = await supabase
      .from('device_controls')
      .delete({ count: 'exact' })
      .eq('device_id', device.id);
    console.log(`Deleted ${controlsCount || 0} device_controls records`);

    // 2. Device logs (using device.device_id - TEXT type)
    const { count: logsCount } = await supabase
      .from('device_logs')
      .delete({ count: 'exact' })
      .eq('device_id', device.device_id);
    console.log(`Deleted ${logsCount || 0} device_logs records`);

    // 3. Sensor data
    const { count: sensorCount } = await supabase
      .from('sensor_data')
      .delete({ count: 'exact' })
      .eq('device_id', device.id);
    console.log(`Deleted ${sensorCount || 0} sensor_data records`);

    // 4. Device schedules
    const { count: schedulesCount } = await supabase
      .from('device_schedules')
      .delete({ count: 'exact' })
      .eq('device_id', device.id);
    console.log(`Deleted ${schedulesCount || 0} device_schedules records`);

    // 5. Notifications related to this device
    const { count: notificationsCount } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .eq('device_id', device.id);
    console.log(`Deleted ${notificationsCount || 0} notifications records`);

    // 6. Device group membership
    const { count: groupMembersCount } = await supabase
      .from('device_group_members')
      .delete({ count: 'exact' })
      .eq('device_id', device.id);
    console.log(`Deleted ${groupMembersCount || 0} device_group_members records`);

    // Finally, delete the device itself
    const { error: deleteError } = await supabase
      .from('devices')
      .delete()
      .eq('id', device.id);

    if (deleteError) throw deleteError;

    console.log('Device and all related data deleted successfully:', device.device_id);
    console.log('Deletion performed by user:', user.id);

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
