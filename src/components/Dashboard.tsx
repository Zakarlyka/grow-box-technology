import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Thermometer, 
  Droplets, 
  Cpu,
  Activity,
  ArrowUpDown,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart-simple';

interface SensorData {
  time: string;
  [key: string]: number | string;
}

interface DeviceStatus {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  temperature: number;
  humidity: number;
  lastSeen: string;
  connectedAt: Date;
}

type SortOption = 'name' | 'type' | 'date' | 'age';

export function Dashboard() {
  const { t } = useTranslation();
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('name');

  useEffect(() => {
    const generateData = () => {
      const now = new Date();
      const newData: SensorData[] = [];
      
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        const dataPoint: SensorData = {
          time: time.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
        };
        
        // Generate data for each device
        devices.forEach((device) => {
          if (device.status === 'online') {
            dataPoint[`${device.id}_temp`] = device.temperature + (Math.random() - 0.5) * 4;
            dataPoint[`${device.id}_humidity`] = device.humidity + (Math.random() - 0.5) * 10;
          }
        });
        
        newData.push(dataPoint);
      }
      
      setSensorData(newData);
    };

    const generateDevices = () => {
      const now = new Date();
      const deviceList: DeviceStatus[] = [
        {
          id: 'grow-001',
          name: 'Grow Box #1',
          type: 'ESP32',
          status: 'online',
          temperature: 24.5,
          humidity: 65,
          lastSeen: '2 хв тому',
          connectedAt: new Date(now.getTime() - 2 * 60 * 1000)
        },
        {
          id: 'grow-002',
          name: 'Grow Box #2',
          type: 'ESP32',
          status: 'online',
          temperature: 23.1,
          humidity: 68,
          lastSeen: '1 хв тому',
          connectedAt: new Date(now.getTime() - 1 * 60 * 1000)
        },
        {
          id: 'grow-003',
          name: 'Grow Box #3',
          type: 'ESP32',
          status: 'offline',
          temperature: 22.8,
          humidity: 62,
          lastSeen: '2 години тому',
          connectedAt: new Date(now.getTime() - 120 * 60 * 1000)
        }
      ];
      
      setDevices(deviceList);
    };

    generateDevices();
    generateData();
    
    const interval = setInterval(() => {
      setDevices(prev => prev.map(device => ({
        ...device,
        temperature: device.status === 'online' ? device.temperature + (Math.random() - 0.5) * 2 : device.temperature,
        humidity: device.status === 'online' ? Math.max(0, Math.min(100, device.humidity + (Math.random() - 0.5) * 5)) : device.humidity,
      })));
      generateData();
    }, 5000);

    return () => clearInterval(interval);
  }, [devices.length]);

  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const totalDevices = devices.length;

  const sortedDevices = useMemo(() => {
    const sorted = [...devices];
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'type':
        return sorted.sort((a, b) => a.type.localeCompare(b.type));
      case 'date':
        return sorted.sort((a, b) => b.connectedAt.getTime() - a.connectedAt.getTime());
      case 'age':
        return sorted.sort((a, b) => a.connectedAt.getTime() - b.connectedAt.getTime());
      default:
        return sorted;
    }
  }, [devices, sortBy]);

  const deviceColors = [
    { temp: 'hsl(var(--primary))', humidity: 'hsl(var(--accent))' },
    { temp: 'hsl(var(--success))', humidity: 'hsl(var(--warning))' },
    { temp: '#8b5cf6', humidity: '#ec4899' },
  ];

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

      {/* Combined Device Status Block */}
      <Card className="gradient-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Cpu className="h-5 w-5 text-accent" />
              <span>Статус пристроїв</span>
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Всього:</span>
                <Badge variant="outline">{totalDevices}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Онлайн:</span>
                <Badge variant="default" className="animate-pulse-glow">{onlineDevices}</Badge>
              </div>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">За назвою</SelectItem>
                  <SelectItem value="type">За типом</SelectItem>
                  <SelectItem value="date">За датою (нові)</SelectItem>
                  <SelectItem value="age">За віком (старі)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedDevices.map((device, index) => (
            <div key={device.id} className="p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`h-3 w-3 rounded-full ${
                    device.status === 'online' ? 'bg-success animate-pulse-glow' : 'bg-destructive'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">{device.name}</p>
                    <p className="text-xs text-muted-foreground">{device.type} • {device.lastSeen}</p>
                  </div>
                </div>
                <Badge variant={device.status === 'online' ? 'default' : 'destructive'}>
                  {device.status === 'online' ? t('devices.online') : t('devices.offline')}
                </Badge>
              </div>
              
              {device.status === 'online' && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="flex items-center space-x-2 p-2 rounded bg-background/50">
                    <Thermometer className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Температура</p>
                      <p className="text-lg font-bold" style={{ color: deviceColors[index % deviceColors.length].temp }}>
                        {device.temperature.toFixed(1)}°C
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded bg-background/50">
                    <Droplets className="h-4 w-4 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">Вологість</p>
                      <p className="text-lg font-bold" style={{ color: deviceColors[index % deviceColors.length].humidity }}>
                        {device.humidity.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Real-time Charts Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t('dashboard.realTimeData')}</h2>
        
        {/* Combined Chart for All Devices */}
        <Card className="gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary" />
              <span>Температура та Вологість (всі пристрої)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ChartContainer config={{}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sensorData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                    {devices.filter(d => d.status === 'online').map((device, index) => (
                      <Line 
                        key={`${device.id}_temp`}
                        type="monotone" 
                        dataKey={`${device.id}_temp`}
                        name={`${device.name} - Темп.`}
                        stroke={deviceColors[index % deviceColors.length].temp}
                        strokeWidth={2}
                      />
                    ))}
                    {devices.filter(d => d.status === 'online').map((device, index) => (
                      <Line 
                        key={`${device.id}_humidity`}
                        type="monotone" 
                        dataKey={`${device.id}_humidity`}
                        name={`${device.name} - Волог.`}
                        stroke={deviceColors[index % deviceColors.length].humidity}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Individual Device Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          {devices.filter(d => d.status === 'online').map((device, index) => (
            <Card key={device.id} className="gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base">{device.name}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" style={{ borderColor: deviceColors[index % deviceColors.length].temp }}>
                      {device.temperature.toFixed(1)}°C
                    </Badge>
                    <Badge variant="outline" style={{ borderColor: deviceColors[index % deviceColors.length].humidity }}>
                      {device.humidity.toFixed(0)}%
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ChartContainer config={{}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sensorData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey={`${device.id}_temp`}
                          name="Температура"
                          stroke={deviceColors[index % deviceColors.length].temp}
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey={`${device.id}_humidity`}
                          name="Вологість"
                          stroke={deviceColors[index % deviceColors.length].humidity}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}