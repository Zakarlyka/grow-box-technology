import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SensorReading {
  id: string;
  device_id: string;
  temperature?: number;
  humidity?: number;
  soil_moisture?: number;
  light?: number;
  ph?: number;
  ec?: number;
  co2?: number;
  timestamp: string;
}

export type TimeRange = '1h' | '6h' | '24h' | '7d' | 'custom';

export function useSensorData(deviceId?: string, timeRange: TimeRange = '24h', customStartDate?: Date, customEndDate?: Date) {
  const [sensorData, setSensorData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSensorData = async () => {
    try {
      // Calculate time range
      const now = new Date();
      let startDate: Date;

      if (timeRange === 'custom' && customStartDate && customEndDate) {
        startDate = customStartDate;
      } else {
        const hoursMap: Record<string, number> = {
          '1h': 1,
          '6h': 6,
          '24h': 24,
          '7d': 168
        };
        const hours = hoursMap[timeRange] || 24;
        startDate = new Date(now.getTime() - hours * 60 * 60 * 1000);
      }

      let query = supabase
        .from('sensor_data')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false })
        .limit(1000);

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
      .channel('device-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_logs',
          filter: deviceId ? `device_id=eq.${deviceId}` : undefined,
        },
        (payload) => {
          console.log('New sensor data:', payload);
          setSensorData((prev) => [payload.new as SensorReading, ...prev.slice(0, 999)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId, timeRange, customStartDate, customEndDate]);

  const exportToCSV = () => {
    if (sensorData.length === 0) return;

    const headers = ['Timestamp', 'Temperature (°C)', 'Humidity (%)', 'Soil Moisture (%)', 'Light (%)', 'pH', 'EC', 'CO2'];
    const rows = sensorData.map(reading => [
      reading.timestamp,
      reading.temperature?.toFixed(1) || '',
      reading.humidity?.toFixed(1) || '',
      reading.soil_moisture?.toFixed(1) || '',
      reading.light?.toFixed(1) || '',
      reading.ph?.toFixed(2) || '',
      reading.ec?.toFixed(2) || '',
      reading.co2?.toFixed(0) || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sensor_data_${deviceId || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    sensorData,
    loading,
    fetchSensorData,
    exportToCSV,
  };
}
