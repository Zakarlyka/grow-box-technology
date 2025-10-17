import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SensorReading {
  id: string;
  device_id: string;
  temperature?: number;
  humidity?: number;
  soil_moisture?: number;
  light_level?: number;
  timestamp: string;
}

export function useSensorData(deviceId?: string) {
  const [sensorData, setSensorData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSensorData = async () => {
    try {
      let query = supabase
        .from('sensor_data')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (deviceId) {
        query = query.eq('device_id', deviceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSensorData(data || []);
    } catch (error: any) {
      console.error('Error fetching sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensorData();

    // Subscribe to realtime sensor data
    const channel = supabase
      .channel('sensor-data-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_data',
          filter: deviceId ? `device_id=eq.${deviceId}` : undefined,
        },
        (payload) => {
          console.log('New sensor data:', payload);
          setSensorData((prev) => [payload.new as SensorReading, ...prev.slice(0, 99)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId]);

  return {
    sensorData,
    loading,
    fetchSensorData,
  };
}
