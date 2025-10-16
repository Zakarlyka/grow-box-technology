import { useState, useEffect, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Droplet, Sun, Wind, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { debounce } from 'lodash';

interface Device {
  id: string;
  device_id: string;
}

interface DeviceControlsProps {
  device: Device;
  isOnline: boolean;
}

export function DeviceControls({ device, isOnline }: DeviceControlsProps) {
  const [lightIntensity, setLightIntensity] = useState([80]);
  const [fanSpeed, setFanSpeed] = useState([60]);
  const [relayStates, setRelayStates] = useState({
    relay_1: false, // Освітлення
    relay_2: false, // Обігрівач
    relay_3: false, // Помпа
    relay_5: false, // Вентиляція
  });

  // Fetch current relay states on mount
  useEffect(() => {
    const fetchCurrentStates = async () => {
      const { data } = await supabase
        .from('device_controls')
        .select('control_name, value, intensity')
        .eq('device_id', device.id)
        .eq('control_type', 'relay')
        .order('created_at', { ascending: false });

      if (data) {
        const states: Record<string, boolean> = {};
        const seen = new Set<string>();
        
        // Get the latest state for each relay
        data.forEach(control => {
          if (!seen.has(control.control_name)) {
            states[control.control_name] = control.value;
            seen.add(control.control_name);
          }
        });
        
        setRelayStates(prev => ({ ...prev, ...states }));
      }

      // Fetch slider values
      const { data: sliderData } = await supabase
        .from('device_controls')
        .select('control_name, intensity')
        .eq('device_id', device.id)
        .eq('control_type', 'slider')
        .order('created_at', { ascending: false })
        .limit(2);

      if (sliderData) {
        sliderData.forEach(control => {
          if (control.control_name === 'light_intensity' && control.intensity !== null) {
            setLightIntensity([control.intensity]);
          } else if (control.control_name === 'fan_speed' && control.intensity !== null) {
            setFanSpeed([control.intensity]);
          }
        });
      }
    };

    fetchCurrentStates();
  }, [device.id]);

  // Realtime subscription for relay state updates
  useEffect(() => {
    const channel = supabase
      .channel('device-controls-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_controls',
          filter: `device_id=eq.${device.id}`
        },
        (payload) => {
          if (payload.new.control_type === 'relay') {
            setRelayStates(prev => ({
              ...prev,
              [payload.new.control_name]: payload.new.value
            }));
          } else if (payload.new.control_type === 'slider') {
            if (payload.new.control_name === 'light_intensity') {
              setLightIntensity([payload.new.intensity]);
            } else if (payload.new.control_name === 'fan_speed') {
              setFanSpeed([payload.new.intensity]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [device.id]);

  const handleSwitchChange = async (controlName: string, checked: boolean) => {
    if (!isOnline) {
      toast({
        title: "Пристрій офлайн",
        description: "Неможливо надіслати команду",
        variant: "destructive",
      });
      return;
    }

    // Optimistically update UI
    setRelayStates(prev => ({ ...prev, [controlName]: checked }));

    try {
      const { error } = await supabase.from('device_controls').insert([{
        device_id: device.id,
        control_name: controlName,
        control_type: 'relay',
        value: checked
      }]);

      if (error) throw error;

      toast({
        title: "Команду надіслано",
        description: `${controlName} ${checked ? 'увімкнено' : 'вимкнено'}`,
      });
    } catch (error) {
      console.error('Control error:', error);
      // Revert optimistic update on error
      setRelayStates(prev => ({ ...prev, [controlName]: !checked }));
      toast({
        title: "Помилка",
        description: "Не вдалося надіслати команду",
        variant: "destructive",
      });
    }
  };

  // Debounced slider save function
  const debouncedSliderSave = useCallback(
    debounce(async (controlName: string, value: number) => {
      try {
        await supabase.from('device_controls').insert([{
          device_id: device.id,
          control_name: controlName,
          control_type: 'slider',
          intensity: value
        }]);
        
        toast({
          title: "Налаштування збережено",
          description: `${controlName === 'light_intensity' ? 'Інтенсивність світла' : 'Швидкість вентилятора'}: ${value}%`,
        });
      } catch (error) {
        console.error('Slider control error:', error);
        toast({
          title: "Помилка",
          description: "Не вдалося зберегти налаштування",
          variant: "destructive",
        });
      }
    }, 500), // 500ms delay
    [device.id]
  );

  const handleSliderChange = (controlName: string, value: number[]) => {
    if (!isOnline) return;
    
    // Update UI immediately
    if (controlName === 'light_intensity') {
      setLightIntensity(value);
    } else if (controlName === 'fan_speed') {
      setFanSpeed(value);
    }
    
    // Save to database with debounce
    debouncedSliderSave(controlName, value[0]);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">Керування</h3>
      
      {/* Control Switches */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border rounded-lg">
          <div className="flex items-center gap-2">
            <Droplet className="h-4 w-4 text-primary" />
            <span className="text-sm">Водяна помпа</span>
          </div>
          <Switch 
            checked={relayStates.relay_3}
            disabled={!isOnline}
            onCheckedChange={(checked) => handleSwitchChange('relay_3', checked)}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-secondary/30 border border-success/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-success" />
            <span className="text-sm">Система освітлення</span>
          </div>
          <Switch 
            checked={relayStates.relay_1}
            disabled={!isOnline}
            onCheckedChange={(checked) => handleSwitchChange('relay_1', checked)}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-secondary/30 border border-success/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-success" />
            <span className="text-sm">Вентиляція</span>
          </div>
          <Switch 
            checked={relayStates.relay_5}
            disabled={!isOnline}
            onCheckedChange={(checked) => handleSwitchChange('relay_5', checked)}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border rounded-lg">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-warning" />
            <span className="text-sm">Обігрівач</span>
          </div>
          <Switch 
            checked={relayStates.relay_2}
            disabled={!isOnline}
            onCheckedChange={(checked) => handleSwitchChange('relay_2', checked)}
          />
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-4 pt-2">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Інтенсивність світла</span>
            <span className="text-sm text-primary font-semibold">{lightIntensity[0]}%</span>
          </div>
          <Slider 
            value={lightIntensity}
            onValueChange={(value) => {
              setLightIntensity(value);
              handleSliderChange('light_intensity', value);
            }}
            max={100} 
            step={1}
            disabled={!isOnline}
            className="cursor-pointer"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Швидкість вентилятора</span>
            <span className="text-sm text-success font-semibold">{fanSpeed[0]}%</span>
          </div>
          <Slider 
            value={fanSpeed}
            onValueChange={(value) => {
              setFanSpeed(value);
              handleSliderChange('fan_speed', value);
            }}
            max={100} 
            step={1}
            disabled={!isOnline}
            className="cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
