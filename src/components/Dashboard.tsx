import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  Sprout,
  Cpu,
  Activity,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart-simple';

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
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [devices, setDevices] = useState<DeviceStatus[]>([]);

  // Simulate real-time data
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
      
      setSensorData(newData);
    };

    const generateDevices = () => {
      const deviceList: DeviceStatus[] = [
        {
          id: 'grow-001',
          name: 'Grow Box #1',
          status: 'online',
          temperature: 24.5,
          humidity: 65,
          soilMoisture: 72,
          lightLevel: 85,
          lastSeen: '2 min ago'
        },
        {
          id: 'grow-002',
          name: 'Grow Box #2',
          status: 'online',
          temperature: 23.1,
          humidity: 68,
          soilMoisture: 68,
          lightLevel: 90,
          lastSeen: '1 min ago'
        },
        {
          id: 'grow-003',
          name: 'Grow Box #3',
          status: 'offline',
          temperature: 22.8,
          humidity: 62,
          soilMoisture: 45,
          lightLevel: 0,
          lastSeen: '2 hours ago'
        }
      ];
      
      setDevices(deviceList);
    };

    generateData();
    generateDevices();
    
    const interval = setInterval(() => {
      generateData();
      // Update device data slightly
      setDevices(prev => prev.map(device => ({
        ...device,
        temperature: device.status === 'online' ? device.temperature + (Math.random() - 0.5) * 2 : device.temperature,
        humidity: device.status === 'online' ? Math.max(0, Math.min(100, device.humidity + (Math.random() - 0.5) * 5)) : device.humidity,
      })));
    }, 5000);

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
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {t('dashboard.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('dashboard.totalDevices')}
          value={totalDevices}
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
                  <LineChart data={sensorData}>
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
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center space-x-3">
                  <div className={`h-3 w-3 rounded-full ${
                    device.status === 'online' ? 'bg-success animate-pulse-glow' : 'bg-destructive'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">{device.name}</p>
                    <p className="text-xs text-muted-foreground">{device.lastSeen}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={device.status === 'online' ? 'default' : 'destructive'}>
                    {device.status === 'online' ? t('devices.online') : t('devices.offline')}
                  </Badge>
                  {device.status === 'online' && (
                    <div className="text-xs text-muted-foreground">
                      {device.temperature.toFixed(1)}°C
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}