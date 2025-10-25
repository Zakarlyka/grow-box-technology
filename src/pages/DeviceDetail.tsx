import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Thermometer, 
  Droplets, 
  Sprout, 
  Sun,
  Wifi,
  WifiOff,
  Trash2
} from 'lucide-react';
import { useDevices } from '@/hooks/useDevices';
import { useDeviceLogs } from '@/hooks/useDeviceLogs';
import { DeviceControls } from '@/components/DeviceControls';
import { LogsTable } from '@/components/LogsTable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart-simple';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { devices, loading, deleteDevice } = useDevices();
  const device = devices.find(d => d.id === id);
  const { logs, latestLog } = useDeviceLogs(id);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (id) {
      await deleteDevice(id);
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground">Завантаження...</p>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-xl text-muted-foreground mb-4">Пристрій не знайдено</p>
        <Button onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Повернутися
        </Button>
      </div>
    );
  }

  const isOnline = device.status === 'online';

  // Prepare chart data
  const chartData = logs.slice(0, 24).reverse().map(log => ({
    time: new Date(log.timestamp).toLocaleTimeString('uk-UA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    temperature: log.temperature || 0,
    humidity: log.humidity || 0,
    soil_moisture: log.soil_moisture || 0,
    light_level: log.light_level || 0,
  }));

  const SensorCard = ({ icon: Icon, label, value, unit, color }: any) => (
    <Card className="gradient-card border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">
                {value !== null && value !== undefined ? `${value}${unit}` : '--'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {device.name}
            </h1>
            {device.location && (
              <p className="text-muted-foreground">{device.location}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Видалити
          </Button>
        </div>
      </div>

      {/* Sensor Values */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SensorCard
          icon={Thermometer}
          label="Температура"
          value={latestLog?.temperature?.toFixed(1) || device.last_temp?.toFixed(1)}
          unit="°C"
          color="text-red-400"
        />
        <SensorCard
          icon={Droplets}
          label="Вологість повітря"
          value={latestLog?.humidity?.toFixed(0) || device.last_hum?.toFixed(0)}
          unit="%"
          color="text-blue-400"
        />
        <SensorCard
          icon={Sprout}
          label="Вологість ґрунту"
          value={latestLog?.soil_moisture?.toFixed(0)}
          unit="%"
          color="text-green-400"
        />
        <SensorCard
          icon={Sun}
          label="Рівень освітлення"
          value={latestLog?.light_level?.toFixed(0)}
          unit="%"
          color="text-yellow-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart */}
        <Card className="gradient-card border-border/50">
          <CardHeader>
            <CardTitle>Історія показників (24 год)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="temperature" 
                        stroke="hsl(0 75% 60%)" 
                        strokeWidth={2} 
                        name="Температура"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="humidity" 
                        stroke="hsl(210 100% 56%)" 
                        strokeWidth={2}
                        name="Вологість"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="soil_moisture" 
                        stroke="hsl(120 60% 45%)" 
                        strokeWidth={2}
                        name="Вологість ґрунту"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Немає даних для відображення</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Device Controls */}
        <DeviceControls deviceId={device.id} />
      </div>

      {/* Logs Table */}
      <LogsTable deviceId={device.id} />

      {device.last_seen && (
        <p className="text-sm text-muted-foreground text-center">
          Останнє оновлення: {new Date(device.last_seen).toLocaleString('uk-UA')}
        </p>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити пристрій?</AlertDialogTitle>
            <AlertDialogDescription>
              Цю дію неможливо скасувати. Пристрій "{device.name}" буде видалено назавжди разом з усіма даними.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
