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
      // 1. Завантажити НАЛАШТУВАННЯ з 'devices.settings'
      const result: any = await supabase
        .from('devices')
        .select('settings')
        .eq('device_id', deviceId)
        .single();

      if (result.error) throw new Error(`Помилка завантаження налаштувань: ${result.error.message}`);
      setSettings(result.data?.settings as DeviceSettings);

      // 2. Завантажити СТАНИ з 'device_controls'
      const { data: controlsData, error: controlsError } = await supabase
        .from('device_controls')
        .select('*')
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
      const result: any = await supabase
        .from('devices')
        .update({ settings: newSettings } as any)
        .eq('device_id', deviceId);

      if (result.error) throw result.error;
      setSettings(newSettings);
      toast.success('Налаштування збережено в Supabase!');
    } catch (error: any) {
      toast.error(`Помилка збереження: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Функція оновлення стану, яка оновлює 'device_controls' в Supabase
  const updateControl = async (controlName: string, value: any) => {
    if (!deviceId) return;
    
    // Оптимістичне оновлення UI
    setControls(prev => {
      const existing = prev.find(c => c.control_name === controlName);
      if (existing) {
        return prev.map(c =>
          c.control_name === controlName
            ? { ...c, value }
            : c
        );
      }
      return [...prev, { 
        id: crypto.randomUUID(),
        device_id: deviceId,
        control_name: controlName, 
        control_type: typeof value === 'boolean' ? 'switch' : 'slider',
        value,
        updated_at: new Date().toISOString()
      }];
    });

    // Запит до Supabase
    try {
      const { error } = await supabase
        .from('device_controls')
        .upsert({
          device_id: deviceId,
          control_name: controlName,
          control_type: typeof value === 'boolean' ? 'switch' : 'slider',
          value,
        }, {
          onConflict: 'device_id,control_name'
        });

      if (error) throw error;
      
      toast.success('Керування оновлено', {
        description: `${controlName} оновлено`,
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
