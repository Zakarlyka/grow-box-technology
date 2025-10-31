import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Droplets, Lightbulb, Wind, Flame, Clock, Snowflake, CloudRain } from 'lucide-react';
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
  { name: 'air_conditioner', label: 'Кондиціонер', icon: Snowflake, color: 'text-blue-300', hasIntensity: true },
  { name: 'humidifier', label: 'Зволожувач повітря', icon: CloudRain, color: 'text-indigo-400', hasIntensity: true },
];

export function DeviceControls({ deviceId }: DeviceControlsProps) {
  const { controls, loading, updateControl } = useDeviceControls(deviceId);
  const [localIntensities, setLocalIntensities] = useState<Record<string, number>>({});
  
  // Temperature control settings
  const [targetTemp, setTargetTemp] = useState(26.0);
  const [hysteresis, setHysteresis] = useState(2.0);
  
  // Irrigation settings (automatic watering)
  const [minSoilMoisture, setMinSoilMoisture] = useState(30);
  const [maxSoilMoisture, setMaxSoilMoisture] = useState(80);
  const [irrigationDuration, setIrrigationDuration] = useState(10);
  const [irrigationPause, setIrrigationPause] = useState(1);
  
  // Ventilation timer settings
  const [ventWorkMinutes, setVentWorkMinutes] = useState(2);
  const [ventPauseMinutes, setVentPauseMinutes] = useState(5);
  
  // Light schedule settings
  const [lightStartTime, setLightStartTime] = useState('08:00');
  const [lightEndTime, setLightEndTime] = useState('20:00');
  
  // Ventilation interval settings
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
        {/* Temperature Control Settings */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
          <Label className="text-base mb-3 block">Автоматичне керування температурою</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Бажана Температура (°C)</Label>
              <Input
                type="number"
                step="0.1"
                value={targetTemp}
                onChange={(e) => setTargetTemp(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Гістерезис (+/- °C)</Label>
              <Input
                type="number"
                step="0.1"
                value={hysteresis}
                onChange={(e) => setHysteresis(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Температура буде підтримуватися в діапазоні {(targetTemp - hysteresis).toFixed(1)}°C - {(targetTemp + hysteresis).toFixed(1)}°C
            <br />
            Нижче мінімуму - увімкнеться обігрівач, вище максимуму - кондиціонер
          </p>
        </div>

        {/* Irrigation Settings (Automatic Watering) */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center gap-3 mb-3">
            <Droplets className="h-5 w-5 text-blue-400" />
            <Label className="text-base">Налаштування Поливу</Label>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs text-muted-foreground">Мін. Вологість Ґрунту (%)</Label>
              <Input
                type="number"
                value={minSoilMoisture}
                onChange={(e) => setMinSoilMoisture(Number(e.target.value))}
                min={0}
                max={100}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Макс. Вологість Ґрунту (%)</Label>
              <Input
                type="number"
                value={maxSoilMoisture}
                onChange={(e) => setMaxSoilMoisture(Number(e.target.value))}
                min={0}
                max={100}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Тривалість Поливу (СЕК)</Label>
              <Input
                type="number"
                value={irrigationDuration}
                onChange={(e) => setIrrigationDuration(Number(e.target.value))}
                min={1}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Пауза між Поливами (ХВ)</Label>
              <Input
                type="number"
                value={irrigationPause}
                onChange={(e) => setIrrigationPause(Number(e.target.value))}
                min={1}
                className="mt-1"
              />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-xs text-blue-300">
              • Полив вмикається, якщо вологість &lt; {minSoilMoisture}%
            </p>
            <p className="text-xs text-blue-300">
              • Полив вимикається, якщо вологість &gt; {maxSoilMoisture}%
            </p>
            <p className="text-xs text-blue-300">
              • Помпа працює {irrigationDuration} сек, потім пауза {irrigationPause} хв для вбирання води
            </p>
          </div>
        </div>

        {/* Ventilation Timer Settings */}
        <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
          <div className="flex items-center gap-3 mb-3">
            <Wind className="h-5 w-5 text-cyan-400" />
            <Label className="text-base">Таймер Провітрювання</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Час Роботи (ХВ)</Label>
              <Input
                type="number"
                value={ventWorkMinutes}
                onChange={(e) => setVentWorkMinutes(Number(e.target.value))}
                min={1}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Час Паузи (ХВ)</Label>
              <Input
                type="number"
                value={ventPauseMinutes}
                onChange={(e) => setVentPauseMinutes(Number(e.target.value))}
                min={1}
                className="mt-1"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Витяжка буде працювати {ventWorkMinutes} хв, потім {ventPauseMinutes} хв пауза
          </p>
        </div>

        {/* Device Controls with Toggles */}
        <div className="space-y-3">
          <Label className="text-base block">Керування приладами</Label>
          {CONTROLS.map((control) => {
            const state = getControlState(control.name);
            const intensity = localIntensities[control.name] ?? state.intensity;
            const Icon = control.icon;

            return (
              <div key={control.name} className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/40 transition-colors">
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
                  <div className="pl-4 pr-4 py-3 space-y-3 bg-muted/20 rounded-lg border border-border/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">
                        {control.name === 'light' 
                          ? 'Інтенсивність освітлення' 
                          : control.name === 'ventilation'
                          ? 'Швидкість вентилятора'
                          : 'Інтенсивність'}
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
                    
                    {/* Light schedule settings */}
                    {control.name === 'light' && (
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border/30">
                        <div>
                          <Label className="text-xs text-muted-foreground">Початок</Label>
                          <Input
                            type="time"
                            value={lightStartTime}
                            onChange={(e) => setLightStartTime(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Кінець</Label>
                          <Input
                            type="time"
                            value={lightEndTime}
                            onChange={(e) => setLightEndTime(e.target.value)}
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
        </div>
      </CardContent>
    </Card>
  );
}
