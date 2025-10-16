import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Droplet, Sun, Wind, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

  const handleSwitchChange = async (controlName: string, checked: boolean) => {
    if (!isOnline) {
      toast({
        title: "Пристрій офлайн",
        description: "Неможливо надіслати команду",
        variant: "destructive",
      });
      return;
    }

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
      toast({
        title: "Помилка",
        description: "Не вдалося надіслати команду",
        variant: "destructive",
      });
    }
  };

  const handleSliderChange = async (controlName: string, value: number[]) => {
    if (!isOnline) return;

    try {
      await supabase.from('device_controls').insert([{
        device_id: device.id,
        control_name: controlName,
        control_type: 'slider',
        intensity: value[0]
      }]);
    } catch (error) {
      console.error('Slider control error:', error);
    }
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
            defaultChecked
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
            defaultChecked
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
