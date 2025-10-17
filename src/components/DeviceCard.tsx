import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Droplets, Sprout, Sun, Wifi, WifiOff } from 'lucide-react';
import { Device } from '@/hooks/useDevices';
import { useDeviceLogs } from '@/hooks/useDeviceLogs';
import { useNavigate } from 'react-router-dom';

interface DeviceCardProps {
  device: Device;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const { latestLog } = useDeviceLogs(device.id);
  const navigate = useNavigate();

  const isOnline = device.status === 'online';

  const SensorValue = ({ icon: Icon, label, value, unit }: any) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
      <div className="flex items-center space-x-2">
        <Icon className="h-4 w-4 text-accent" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-lg font-semibold text-foreground">
        {value !== null && value !== undefined ? `${value}${unit}` : '--'}
      </span>
    </div>
  );

  return (
    <Card 
      className="gradient-card border-border/50 hover:border-primary/50 transition-all cursor-pointer"
      onClick={() => navigate(`/device/${device.id}`)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{device.name}</CardTitle>
          <Badge 
            variant={isOnline ? 'default' : 'destructive'}
            className="flex items-center gap-1"
          >
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Offline
              </>
            )}
          </Badge>
        </div>
        {device.location && (
          <p className="text-sm text-muted-foreground">{device.location}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        <SensorValue
          icon={Thermometer}
          label="Температура"
          value={latestLog?.temperature?.toFixed(1) || device.last_temp?.toFixed(1)}
          unit="°C"
        />
        
        <SensorValue
          icon={Droplets}
          label="Вологість повітря"
          value={latestLog?.humidity?.toFixed(0) || device.last_hum?.toFixed(0)}
          unit="%"
        />
        
        <SensorValue
          icon={Sprout}
          label="Вологість ґрунту"
          value={latestLog?.soil_moisture?.toFixed(0)}
          unit="%"
        />
        
        <SensorValue
          icon={Sun}
          label="Рівень освітлення"
          value={latestLog?.light_level?.toFixed(0)}
          unit="%"
        />

        {device.last_seen && (
          <div className="pt-2 border-t border-border/30">
            <p className="text-xs text-muted-foreground text-center">
              Останнє оновлення: {new Date(device.last_seen).toLocaleString('uk-UA')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
