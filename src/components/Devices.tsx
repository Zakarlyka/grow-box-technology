import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  Sprout,
  Power,
  Fan,
  Lightbulb,
  Plus,
  Settings,
  MoreVertical,
  Activity
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  temperature: number;
  humidity: number;
  soilMoisture: number;
  lightLevel: number;
  lastSeen: string;
  controls: {
    waterPump: boolean;
    lightSystem: boolean;
    ventilation: boolean;
    heater: boolean;
    lightIntensity: number;
    fanSpeed: number;
  };
}

export function Devices() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    // Simulate device data
    const mockDevices: Device[] = [
      {
        id: 'esp32-grow-001',
        name: 'Grow Box Alpha',
        type: 'ESP32 GrowBox',
        status: 'online',
        temperature: 24.5,
        humidity: 65,
        soilMoisture: 72,
        lightLevel: 85,
        lastSeen: '2 minutes ago',
        controls: {
          waterPump: false,
          lightSystem: true,
          ventilation: true,
          heater: false,
          lightIntensity: 80,
          fanSpeed: 60,
        }
      },
      {
        id: 'esp32-grow-002',
        name: 'Grow Box Beta',
        type: 'ESP32 GrowBox',
        status: 'online',
        temperature: 23.1,
        humidity: 68,
        soilMoisture: 68,
        lightLevel: 90,
        lastSeen: '1 minute ago',
        controls: {
          waterPump: true,
          lightSystem: true,
          ventilation: false,
          heater: true,
          lightIntensity: 95,
          fanSpeed: 40,
        }
      },
      {
        id: 'esp32-grow-003',
        name: 'Grow Box Gamma',
        type: 'ESP32 GrowBox',
        status: 'offline',
        temperature: 22.8,
        humidity: 62,
        soilMoisture: 45,
        lightLevel: 0,
        lastSeen: '2 hours ago',
        controls: {
          waterPump: false,
          lightSystem: false,
          ventilation: false,
          heater: false,
          lightIntensity: 0,
          fanSpeed: 0,
        }
      }
    ];

    setDevices(mockDevices);
  }, []);

  const updateDeviceControl = (deviceId: string, controlKey: string, value: boolean | number) => {
    setDevices(prev => prev.map(device => 
      device.id === deviceId 
        ? { 
            ...device, 
            controls: { ...device.controls, [controlKey]: value }
          }
        : device
    ));
  };

  const ControlCard = ({ 
    title, 
    icon: Icon, 
    isActive, 
    onToggle, 
    deviceId, 
    disabled = false 
  }: any) => (
    <div className={`p-3 rounded-lg border transition-all duration-200 ${
      isActive 
        ? 'bg-gradient-to-r from-accent/20 to-primary/20 border-accent/50 glow-accent' 
        : 'bg-muted/20 border-border/50'
    } ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className={`h-4 w-4 ${isActive ? 'text-accent' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Switch 
          checked={isActive} 
          onCheckedChange={onToggle}
          disabled={disabled}
        />
      </div>
    </div>
  );

  const SensorValue = ({ label, value, unit, icon: Icon, color = 'text-muted-foreground' }: any) => (
    <div className="flex items-center space-x-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}{unit}</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('devices.title')}
          </h1>
          <p className="text-muted-foreground">
            Manage and control your ESP32 devices
          </p>
        </div>
        <Button className="gradient-primary">
          <Plus className="mr-2 h-4 w-4" />
          {t('devices.addDevice')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {devices.map((device) => (
          <Card key={device.id} className="gradient-card border-border/50 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{device.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{device.id}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={device.status === 'online' ? 'default' : 'destructive'}
                    className={device.status === 'online' ? 'animate-pulse-glow' : ''}
                  >
                    {device.status === 'online' ? t('devices.online') : t('devices.offline')}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Configure
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Activity className="mr-2 h-4 w-4" />
                        View Logs
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('devices.lastSeen')}: {device.lastSeen}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Sensor Data */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                <SensorValue
                  label={t('dashboard.temperature')}
                  value={device.temperature.toFixed(1)}
                  unit="°C"
                  icon={Thermometer}
                  color="text-primary"
                />
                <SensorValue
                  label={t('dashboard.humidity')}
                  value={device.humidity}
                  unit="%"
                  icon={Droplets}
                  color="text-accent"
                />
                <SensorValue
                  label={t('dashboard.soilMoisture')}
                  value={device.soilMoisture}
                  unit="%"
                  icon={Sprout}
                  color="text-success"
                />
                <SensorValue
                  label={t('dashboard.lightLevel')}
                  value={device.lightLevel}
                  unit="%"
                  icon={Sun}
                  color="text-warning"
                />
              </div>

              {/* Controls */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">{t('devices.controls')}</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <ControlCard
                    title={t('controls.waterPump')}
                    icon={Power}
                    isActive={device.controls.waterPump}
                    onToggle={(checked: boolean) => updateDeviceControl(device.id, 'waterPump', checked)}
                    deviceId={device.id}
                    disabled={device.status === 'offline'}
                  />
                  <ControlCard
                    title={t('controls.lightSystem')}
                    icon={Lightbulb}
                    isActive={device.controls.lightSystem}
                    onToggle={(checked: boolean) => updateDeviceControl(device.id, 'lightSystem', checked)}
                    deviceId={device.id}
                    disabled={device.status === 'offline'}
                  />
                  <ControlCard
                    title={t('controls.ventilation')}
                    icon={Fan}
                    isActive={device.controls.ventilation}
                    onToggle={(checked: boolean) => updateDeviceControl(device.id, 'ventilation', checked)}
                    deviceId={device.id}
                    disabled={device.status === 'offline'}
                  />
                  <ControlCard
                    title={t('controls.heater')}
                    icon={Thermometer}
                    isActive={device.controls.heater}
                    onToggle={(checked: boolean) => updateDeviceControl(device.id, 'heater', checked)}
                    deviceId={device.id}
                    disabled={device.status === 'offline'}
                  />
                </div>

                {/* Sliders */}
                {device.status === 'online' && (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-muted-foreground">Light Intensity</label>
                        <span className="text-sm text-primary">{device.controls.lightIntensity}%</span>
                      </div>
                      <Slider
                        value={[device.controls.lightIntensity]}
                        onValueChange={(value) => updateDeviceControl(device.id, 'lightIntensity', value[0])}
                        max={100}
                        step={1}
                        className="w-full"
                        disabled={!device.controls.lightSystem}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-muted-foreground">Fan Speed</label>
                        <span className="text-sm text-accent">{device.controls.fanSpeed}%</span>
                      </div>
                      <Slider
                        value={[device.controls.fanSpeed]}
                        onValueChange={(value) => updateDeviceControl(device.id, 'fanSpeed', value[0])}
                        max={100}
                        step={1}
                        className="w-full"
                        disabled={!device.controls.ventilation}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}