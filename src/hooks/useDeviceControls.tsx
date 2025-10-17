import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from './use-toast';

export interface DeviceControl {
  id: string;
  device_id: string;
  control_type: string;
  control_name: string;
  value: boolean;
  intensity?: number;
  schedule?: any;
  created_at?: string;
  updated_at?: string;
}

export function useDeviceControls(deviceId: string) {
  const [controls, setControls] = useState<DeviceControl[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchControls = async () => {
    if (!deviceId) return;

    try {
      const { data, error } = await supabase
        .from('device_controls')
        .select('*')
        .eq('device_id', deviceId);

      if (error) throw error;
      setControls(data || []);
    } catch (error: any) {
      console.error('Error fetching controls:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateControl = async (controlName: string, value: boolean, intensity?: number) => {
    try {
      const { data, error } = await supabase
        .from('device_controls')
        .upsert({
          device_id: deviceId,
          control_name: controlName,
          control_type: intensity !== undefined ? 'slider' : 'switch',
          value,
          intensity,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'device_id,control_name'
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setControls(prev => {
        const existing = prev.find(c => c.control_name === controlName);
        if (existing) {
          return prev.map(c => c.control_name === controlName ? data : c);
        }
        return [...prev, data];
      });

      toast({
        title: 'Керування оновлено',
        description: `${controlName} ${value ? 'увімкнено' : 'вимкнено'}`,
      });
    } catch (error: any) {
      console.error('Error updating control:', error);
      toast({
        title: 'Помилка',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchControls();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`controls-${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_controls',
          filter: `device_id=eq.${deviceId}`,
        },
        (payload) => {
          console.log('Control change:', payload);
          fetchControls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId]);

  return {
    controls,
    loading,
    updateControl,
    fetchControls,
  };
}
