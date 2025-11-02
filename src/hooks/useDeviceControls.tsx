import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export interface DeviceSettings {
  target_temp?: number;
  temp_hyst?: number;
  target_hum?: number;
  hum_hyst?: number;
  is_ac_installed?: boolean;
  vent_work_minutes?: number;
  vent_pause_minutes?: number;
  min_soil_moisture?: number;
  max_soil_moisture?: number;
  irrigation_duration_sec?: number;
  irrigation_pause_min?: number;
  light_start_time?: string;
  light_end_time?: string;
}

export function useDeviceControls(deviceId: string) {
  const [controls, setControls] = useState<DeviceControl[]>([]);
  const [settings, setSettings] = useState<DeviceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const fetchSettings = () => {
    if (!deviceId) return;

    try {
      const stored = localStorage.getItem(`device_settings_${deviceId}`);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    }
  };

  const saveSettings = async (newSettings: DeviceSettings) => {
    if (!deviceId) return;

    setIsSaving(true);
    try {
      localStorage.setItem(`device_settings_${deviceId}`, JSON.stringify(newSettings));
      setSettings(newSettings);
      
      toast.success('Налаштування збережено', {
        description: 'Всі зміни успішно застосовано',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Помилка збереження', {
        description: error.message,
      });
    } finally {
      setIsSaving(false);
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

      toast.success('Керування оновлено', {
        description: `${controlName} ${value ? 'увімкнено' : 'вимкнено'}`,
      });
    } catch (error: any) {
      console.error('Error updating control:', error);
      toast.error('Помилка', {
        description: error.message,
      });
    }
  };

  useEffect(() => {
    fetchControls();
    fetchSettings();

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
    settings,
    loading,
    isSaving,
    updateControl,
    fetchControls,
    saveSettings,
  };
}
