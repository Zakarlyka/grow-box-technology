import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  Sprout,
  Cpu,
  Activity,
  TrendingUp,
  Plus,
  Settings,
  Trash2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart-simple';
import { useDevices } from '@/hooks/useDevices';
import { useSensorData } from '@/hooks/useSensorData';
import { AddDeviceDialog } from './AddDeviceDialog';
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

interface SensorData {
  time: string;
  temperature: number;
  humidity: number;
  soilMoisture: number;
  lightLevel: number;
}

interface DeviceStatus {
  id: string;
  name: string;
  status: 'online' | 'offline';
  temperature: number;
  humidity: number;
  soilMoisture: number;
  lightLevel: number;
  lastSeen: string;
}

export function Dashboard() {
  const { t } = useTranslation();
  const { devices, loading, deleteDevice, fetchDevices } = useDevices();
  const { sensorData } = useSensorData();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);

  const handleDeleteClick = (deviceId: string) => {
    setDeviceToDelete(deviceId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deviceToDelete) {
      await deleteDevice(deviceToDelete);
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    }
  };

  // Mock sensor data for chart (in real app, use data from useSensorData)
  const [chartData, setChartData] = useState<SensorData[]>([]);

  // Generate mock chart data
  useEffect(() => {
    const generateData = () => {
      const now = new Date();
      const newData: SensorData[] = [];
      
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        newData.push({
          time: time.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
          temperature: 22 + Math.random() * 8,
          humidity: 60 + Math.random() * 20,
          soilMoisture: 45 + Math.random() * 30,
          lightLevel: Math.max(0, 80 + Math.sin(i / 4) * 60 + Math.random() * 20),
        });
      }
      
      setChartData(newData);
    };

    generateData();
    const interval = setInterval(generateData, 5000);
    return () => clearInterval(interval);
  }, []);

  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const totalDevices = devices.length;

  const StatCard = ({ title, value, unit, icon: Icon, trend }: any) => (
    <Card className="gradient-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-accent" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {value}{unit}
        </div>
        {trend && (
          <p className="text-xs text-success flex items-center mt-1">
            <TrendingUp className="h-3 w-3 mr-1" />
            +2.5% from last hour
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('dashboard.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <Button className="gradient-primary" onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('devices.addDevice')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('dashboard.totalDevices')}
          value={devices.length}
          unit=""
          icon={Cpu}
        />
        <StatCard
          title={t('dashboard.onlineDevices')}
          value={onlineDevices}
          unit=""
          icon={Activity}
        />
        <StatCard
          title={t('dashboard.temperature')}
          value="24.2"
          unit="°C"
          icon={Thermometer}
          trend={true}
        />
        <StatCard
          title={t('dashboard.humidity')}
          value="65"
          unit="%"
          icon={Droplets}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Real-time Chart */}
        <Card className="gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary" />
              <span>{t('dashboard.realTimeData')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ChartContainer config={{}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      content={<ChartTooltipContent />}
                    />
                    <Line type="monotone" dataKey="temperature" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="humidity" stroke="hsl(var(--accent))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Device Status */}
        <Card className="gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cpu className="h-5 w-5 text-accent" />
              <span>{t('dashboard.deviceStatus')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Завантаження...</div>
            ) : devices.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-2">Пристрої не знайдено</p>
                <Button onClick={() => setAddDialogOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Додати пристрій
                </Button>
              </div>
            ) : (
              devices.map((device) => {
                const lastSeen = device.last_seen 
                  ? new Date(device.last_seen).toLocaleString('uk-UA')
                  : 'Невідомо';
                
                return (
                  <div key={device.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`h-3 w-3 rounded-full ${
                        device.status === 'online' ? 'bg-success animate-pulse-glow' : 'bg-destructive'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{device.name}</p>
                        <p className="text-xs text-muted-foreground">{lastSeen}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={device.status === 'online' ? 'default' : 'destructive'}>
                        {device.status === 'online' ? (
                          <><Wifi className="h-3 w-3 mr-1" />{t('devices.online')}</>
                        ) : (
                          <><WifiOff className="h-3 w-3 mr-1" />{t('devices.offline')}</>
                        )}
                      </Badge>
                      {device.status === 'online' && device.last_temp && (
                        <div className="text-xs text-muted-foreground">
                          {device.last_temp.toFixed(1)}°C
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(device.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <AddDeviceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onDeviceAdded={fetchDevices}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити пристрій?</AlertDialogTitle>
            <AlertDialogDescription>
              Цю дію неможливо скасувати. Пристрій буде видалено назавжди.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}