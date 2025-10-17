import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Droplets, Lightbulb, Wind, Flame, Clock } from 'lucide-react';
import { useDeviceControls } from '@/hooks/useDeviceControls';
import { useState } from 'react';

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
];

export function DeviceControls({ deviceId }: DeviceControlsProps) {
  const { controls, loading, updateControl } = useDeviceControls(deviceId);
  const [localIntensities, setLocalIntensities] = useState<Record<string, number>>({});

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
                <div className="pl-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">
                      Інтенсивність
                    </Label>
                    <span className="text-sm font-medium">{intensity}%</span>
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
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
