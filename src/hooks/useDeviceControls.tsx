import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type DeviceSettings, type DeviceControl } from '@/types';
import { toast } from 'sonner';

export function useDeviceControls(deviceId: string | null) {
  const [settings, setSettings] = useState<DeviceSettings | null>(null);
  const [controls, setControls] = useState<DeviceControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    
    try {
      // 1. Завантажити НАЛАШТУВАННЯ з 'devices.configuration'
      const { data: deviceData, error: deviceError } = await supabase
        .from('devices')
        .select('configuration')
        .eq('device_id', deviceId)
        .single();

      if (deviceError) throw new Error(`Помилка завантаження налаштувань: ${deviceError.message}`);
      setSettings(deviceData?.configuration as unknown as DeviceSettings);

      // 2. Завантажити СТАНИ з 'device_controls'
      const { data: controlsData, error: controlsError } = await supabase
        .from('device_controls')
        .select('control_name, value, intensity')
        .eq('device_id', deviceId);

      if (controlsError) throw new Error(`Помилка завантаження станів: ${controlsError.message}`);
      setControls(controlsData || []);

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchData();

    if (!deviceId) return;

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
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, deviceId]);

  // Функція збереження, яка оновлює 'devices.configuration' в Supabase
  const saveSettings = async (newSettings: DeviceSettings) => {
    if (!deviceId) return;
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('devices')
        .update({ configuration: newSettings as any })
        .eq('device_id', deviceId);

      if (error) throw error;
      setSettings(newSettings);
      toast.success('Налаштування збережено в Supabase!');
    } catch (error: any) {
      toast.error(`Помилка збереження: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Функція оновлення стану, яка оновлює 'device_controls' в Supabase
  const updateControl = async (controlName: string, value: boolean, intensity?: number) => {
    if (!deviceId) return;
    
    // Оптимістичне оновлення UI
    setControls(prev => {
      const existing = prev.find(c => c.control_name === controlName);
      if (existing) {
        return prev.map(c =>
          c.control_name === controlName
            ? { ...c, value, intensity: intensity ?? c.intensity }
            : c
        );
      }
      return [...prev, { control_name: controlName, value, intensity: intensity ?? 50 }];
    });

    // Запит до Supabase
    try {
      const { error } = await supabase
        .from('device_controls')
        .upsert({
          device_id: deviceId,
          control_name: controlName,
          control_type: intensity !== undefined ? 'slider' : 'switch',
          value,
          intensity: intensity ?? 50,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'device_id,control_name'
        });

      if (error) throw error;
      
      toast.success('Керування оновлено', {
        description: `${controlName} ${value ? 'увімкнено' : 'вимкнено'}`,
      });
    } catch (error: any) {
      toast.error(`Помилка перемикача: ${error.message}`);
      fetchData(); // Відкат
    }
  };

  return {
    settings,
    controls,
    loading,
    isSaving,
    saveSettings,
    updateControl,
  };
}
