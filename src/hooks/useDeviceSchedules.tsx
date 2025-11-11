import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DeviceSchedule } from '@/types';

export function useDeviceSchedules(deviceId: string) {
  const [schedules, setSchedules] = useState<DeviceSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    if (!deviceId) return;

    try {
      const { data, error } = await supabase
        .from('device_schedules')
        .select('*')
        .eq('device_id', deviceId)
        .eq('enabled', true);

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`schedules-${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_schedules',
          filter: `device_id=eq.${deviceId}`,
        },
        (payload) => {
          console.log('Schedule change:', payload);
          fetchSchedules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId]);

  return {
    schedules,
    loading,
    fetchSchedules,
  };
}
