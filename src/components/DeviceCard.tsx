import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Thermometer, Droplets, Sprout, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Device {
  id: string;
  device_id: string;
  name: string;
  location: string | null;
  last_temp?: number | null;
  last_hum?: number | null;
  last_seen: string | null;
  status: string;
}

interface DeviceCardProps {
  device: Device;
  isOnline: boolean;
}

export function DeviceCard({ device, isOnline }: DeviceCardProps) {
  const navigate = useNavigate();

  const lastActive = device.last_seen 
    ? new Date(device.last_seen).toLocaleString('uk-UA', { 
        hour: '2-digit', 
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      })
    : 'Невідомо';

  return (
    <Card 
      className="border-border bg-card hover:border-accent/30 transition-all duration-300 hover:shadow-lg"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-1">
              {device.name || device.device_id}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {device.device_id}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Остання активність: {lastActive}
            </p>
          </div>
          <Badge
            variant={isOnline ? "default" : "secondary"}
            className={isOnline ? 'bg-success hover:bg-success/90' : 'bg-muted hover:bg-muted/90'}
          >
            {isOnline ? '🟢 Онлайн' : '🔴 Офлайн'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sensor readings - 2x2 grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <Thermometer className="h-5 w-5 text-warning mt-1" />
            <div>
              <p className="text-xs text-muted-foreground">Температура</p>
              <p className="text-2xl font-bold text-foreground">
                {device.last_temp !== null && device.last_temp !== undefined 
                  ? `${device.last_temp}°C` 
                  : '--'}
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <Droplets className="h-5 w-5 text-primary mt-1" />
            <div>
              <p className="text-xs text-muted-foreground">Вологість</p>
              <p className="text-2xl font-bold text-foreground">
                {device.last_hum !== null && device.last_hum !== undefined 
                  ? `${device.last_hum}%` 
                  : '--'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Sprout className="h-5 w-5 text-success mt-1" />
            <div>
              <p className="text-xs text-muted-foreground">Вологість ґрунту</p>
              <p className="text-2xl font-bold text-foreground">
                {device.last_hum ? `${Math.round(device.last_hum * 1.1)}%` : '--'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Sun className="h-5 w-5 text-warning mt-1" />
            <div>
              <p className="text-xs text-muted-foreground">Рівень освітлення</p>
              <p className="text-2xl font-bold text-foreground">
                {device.last_temp ? `${Math.round(device.last_temp * 3.5)}%` : '--'}
              </p>
            </div>
          </div>
        </div>

        <Button 
          className="w-full"
          onClick={() => navigate(`/device/${device.id}`)}
        >
          Відкрити
        </Button>
      </CardContent>
    </Card>
  );
}
