import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Droplets, Lightbulb, Wind, Flame, Clock, Snowflake, CloudRain } from 'lucide-react';
import { useDeviceControls } from '@/hooks/useDeviceControls';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface DeviceControlsProps {
  deviceId: string;
}

interface ControlConfig {
  name: string;
  label: string;
  icon: any;
  color: string;
  hasIntensity?: boolean;
}

const CONTROLS: ControlConfig[] = [
  { name: 'water_pump', label: 'Водяна помпа', icon: Droplets, color: 'text-blue-400', hasIntensity: false },
  { name: 'light', label: 'Освітлення', icon: Lightbulb, color: 'text-yellow-400', hasIntensity: true },
  { name: 'ventilation', label: 'Вентиляція', icon: Wind, color: 'text-cyan-400', hasIntensity: true },
  { name: 'heater', label: 'Обігрівач', icon: Flame, color: 'text-orange-400', hasIntensity: true },
  { name: 'air_conditioner', label: 'Кондиціонер', icon: Snowflake, color: 'text-blue-300', hasIntensity: true },
  { name: 'humidifier', label: 'Зволожувач повітря', icon: CloudRain, color: 'text-indigo-400', hasIntensity: true },
];

export function DeviceControls({ deviceId }: DeviceControlsProps) {
  const { controls, loading, updateControl } = useDeviceControls(deviceId);
  const [localIntensities, setLocalIntensities] = useState<Record<string, number>>({});
  const [irrigating, setIrrigating] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  
  // Temperature control settings
  const [tempMin, setTempMin] = useState(24);
  const [tempMax, setTempMax] = useState(26);
  
  // Pump duration setting
  const [pumpDuration, setPumpDuration] = useState(30);
  
  // Light schedule settings
  const [lightStartTime, setLightStartTime] = useState('08:00');
  const [lightEndTime, setLightEndTime] = useState('20:00');
  
  // Ventilation interval settings
  const [ventOnMinutes, setVentOnMinutes] = useState(5);
  const [ventOffMinutes, setVentOffMinutes] = useState(2);

  const getControlState = (controlName: string) => {
    const control = controls.find(c => c.control_name === controlName);
    return {
      value: control?.value || false,
      intensity: control?.intensity || 50,
    };
  };

  const handleToggle = async (controlName: string, checked: boolean) => {
    const state = getControlState(controlName);
    await updateControl(controlName, checked, state.intensity);
  };

  const handleIntensityChange = (controlName: string, value: number[]) => {
    setLocalIntensities(prev => ({ ...prev, [controlName]: value[0] }));
  };

  const handleIntensityCommit = async (controlName: string) => {
    const state = getControlState(controlName);
    const intensity = localIntensities[controlName] ?? state.intensity;
    await updateControl(controlName, state.value, intensity);
  };

  const handleStartIrrigation = async () => {
    setIrrigating(true);
    setRemainingTime(pumpDuration);
    
    // Turn on water pump
    await updateControl('water_pump', true, 100);
    
    toast({
      title: 'Полив розпочато',
      description: `Водяна помпа увімкнена на ${pumpDuration} секунд`,
    });
  };

  // Countdown timer for irrigation
  useEffect(() => {
    if (remainingTime > 0) {
      const timer = setTimeout(() => {
        setRemainingTime(remainingTime - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (irrigating && remainingTime === 0) {
      // Turn off water pump after 30 seconds
      updateControl('water_pump', false, 0);
      setIrrigating(false);
      toast({
        title: 'Полив завершено',
        description: 'Водяна помпа вимкнена',
      });
    }
  }, [remainingTime, irrigating]);

  if (loading) {
    return (
      <Card className="gradient-card border-border/50">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Завантаження...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Керування пристроєм
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Temperature Control Settings */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
          <Label className="text-base mb-3 block">Автоматичне керування температурою</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Мін. температура (°C)</Label>
              <Input
                type="number"
                value={tempMin}
                onChange={(e) => setTempMin(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Макс. температура (°C)</Label>
              <Input
                type="number"
                value={tempMax}
                onChange={(e) => setTempMax(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Якщо температура нижче {tempMin}°C - увімкнеться обігрівач
            <br />
            Якщо температура вище {tempMax}°C - увімкнеться кондиціонер
          </p>
        </div>

        {/* Quick Irrigation Button */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Droplets className="h-5 w-5 text-blue-400" />
              <Label className="text-base">Швидкий полив</Label>
            </div>
            {irrigating && (
              <Badge variant="default" className="bg-blue-500">
                {remainingTime}с
              </Badge>
            )}
          </div>
          <Button
            onClick={handleStartIrrigation}
            disabled={irrigating || loading}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            {irrigating ? 'Полив триває...' : 'Запустити полив (30с)'}
          </Button>
          <div className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/30">
            <p className="text-xs text-green-400">
              встановити час помпу в секундах (варіпредел при встановленні 10 сек - помпа працює 10 сек і вимикається)
            </p>
          </div>
        </div>

        {CONTROLS.map((control) => {
          const state = getControlState(control.name);
          const intensity = localIntensities[control.name] ?? state.intensity;
          const Icon = control.icon;

          return (
            <div key={control.name} className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${control.color}`} />
                  <Label htmlFor={control.name} className="text-base cursor-pointer">
                    {control.label}
                  </Label>
                </div>
                <Switch
                  id={control.name}
                  checked={state.value}
                  onCheckedChange={(checked) => handleToggle(control.name, checked)}
                />
              </div>

              {control.hasIntensity && state.value && (
                <div className="pl-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">
                      {control.name === 'light' 
                        ? 'Тривалість світлового дня' 
                        : control.name === 'ventilation'
                        ? 'Швидкість обертання вентилятора'
                        : 'Інтенсивність'}
                    </Label>
                    <span className="text-sm font-medium">
                      {control.name === 'light' 
                        ? `${Math.round(intensity * 24 / 100)} год` 
                        : `${intensity}%`}
                    </span>
                  </div>
                  <Slider
                    value={[intensity]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(value) => handleIntensityChange(control.name, value)}
                    onValueCommit={() => handleIntensityCommit(control.name)}
                    className="w-full"
                  />
                  
                  {/* Light schedule settings */}
                  {control.name === 'light' && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Початок світлення</Label>
                        <Input
                          type="time"
                          value={lightStartTime}
                          onChange={(e) => setLightStartTime(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Кінець світлення</Label>
                        <Input
                          type="time"
                          value={lightEndTime}
                          onChange={(e) => setLightEndTime(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Ventilation interval settings */}
                  {control.name === 'ventilation' && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Працює (хв)</Label>
                        <Input
                          type="number"
                          value={ventOnMinutes}
                          onChange={(e) => setVentOnMinutes(Number(e.target.value))}
                          min={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Вимкнено (хв)</Label>
                        <Input
                          type="number"
                          value={ventOffMinutes}
                          onChange={(e) => setVentOffMinutes(Number(e.target.value))}
                          min={1}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
