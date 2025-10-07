import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Thermometer, 
  Droplets, 
  Cpu,
  Activity,
  ArrowUpDown,
  Plus,
  Wifi,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart-simple';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SensorData {
  time: string;
  [key: string]: number | string;
}

interface DeviceStatus {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  temperature?: number;
  humidity?: number;
  lastSeen: Date;
  connectedAt: Date;
}

type SortOption = 'name' | 'type' | 'date' | 'age';

export function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [generatedDeviceId, setGeneratedDeviceId] = useState('');

  // Завантаження пристроїв з бази даних
  useEffect(() => {
    if (!user) return;

    const fetchDevices = async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching devices:', error);
        toast.error('Помилка завантаження пристроїв');
        return;
      }

      if (data) {
        const mappedDevices: DeviceStatus[] = data.map(d => ({
          id: d.id,
          name: d.name,
          type: d.type,
          status: d.status as 'online' | 'offline',
          lastSeen: new Date(d.last_seen || d.created_at),
          connectedAt: new Date(d.created_at),
          temperature: undefined,
          humidity: undefined,
        }));
        setDevices(mappedDevices);
      }
    };

    fetchDevices();
  }, [user]);

  // Підписка на реалтайм-зміни пристроїв
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('devices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Device change:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newDevice = payload.new as any;
            setDevices(prev => [...prev, {
              id: newDevice.id,
              name: newDevice.name,
              type: newDevice.type,
              status: newDevice.status as 'online' | 'offline',
              lastSeen: new Date(newDevice.last_seen || newDevice.created_at),
              connectedAt: new Date(newDevice.created_at),
              temperature: undefined,
              humidity: undefined,
            }]);
            toast.success(`Пристрій "${newDevice.name}" підключено!`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedDevice = payload.new as any;
            setDevices(prev => prev.map(d => 
              d.id === updatedDevice.id 
                ? {
                    ...d,
                    name: updatedDevice.name,
                    type: updatedDevice.type,
                    status: updatedDevice.status as 'online' | 'offline',
                    lastSeen: new Date(updatedDevice.last_seen || updatedDevice.updated_at),
                  }
                : d
            ));
          } else if (payload.eventType === 'DELETE') {
            const deletedDevice = payload.old as any;
            setDevices(prev => prev.filter(d => d.id !== deletedDevice.id));
            toast.info('Пристрій видалено');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Генерація симуляційних даних телеметрії
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
            dataPoint[`${device.id}_temp`] = 24 + (Math.random() - 0.5) * 4;
            dataPoint[`${device.id}_humidity`] = 65 + (Math.random() - 0.5) * 10;
          }
        });
        
        newData.push(dataPoint);
      }
      
      setSensorData(newData);
    };

    generateData();
    
    const interval = setInterval(() => {
      setDevices(prev => prev.map(device => ({
        ...device,
        temperature: device.status === 'online' ? 24 + (Math.random() - 0.5) * 2 : device.temperature,
        humidity: device.status === 'online' ? Math.max(0, Math.min(100, 65 + (Math.random() - 0.5) * 5)) : device.humidity,
      })));
      generateData();
    }, 5000);

    return () => clearInterval(interval);
  }, [devices.length]);

  const generateDeviceId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const deviceId = `ESP-${timestamp}-${random}`.toUpperCase();
    setGeneratedDeviceId(deviceId);
    setShowQRDialog(true);
  };

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
      {/* Заголовок з кнопкою підключення */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('dashboard.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.subtitle')}
          </p>
        </div>
        
        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogTrigger asChild>
            <Button onClick={generateDeviceId} className="gap-2">
              <Plus className="w-4 h-4" />
              Підключити новий
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                Підключення ESP8266
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4 py-4">
              {generatedDeviceId && (
                <>
                  <div className="p-4 bg-white rounded-lg">
                    <QRCodeSVG 
                      value={generatedDeviceId} 
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-mono bg-muted px-3 py-2 rounded">
                      {generatedDeviceId}
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="font-semibold">Інструкція:</p>
                      <ol className="text-left space-y-1 list-decimal list-inside">
                        <li>Підключіться до Wi-Fi порталу ESP8266</li>
                        <li>Скануйте QR-код камерою пристрою</li>
                        <li>Або введіть Device ID вручну</li>
                        <li>Пристрій автоматично з'явиться тут</li>
                      </ol>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Статус підключення (Реалтайм) */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Wifi className="w-5 h-5 text-primary animate-pulse" />
            Статус підключення
          </CardTitle>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Онлайн: {onlineDevices}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-muted" />
              <span>Всього: {totalDevices}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Реалтайм-моніторинг через Supabase Realtime
          </p>
        </CardContent>
      </Card>

      {/* Статус пристроїв */}
      <Card className="gradient-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Cpu className="h-5 w-5 text-accent" />
              <span>Пристрої</span>
            </CardTitle>
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
                    <p className="text-xs text-muted-foreground">
                      {device.type} • {new Date(device.lastSeen).toLocaleString('uk-UA')}
                    </p>
                  </div>
                </div>
                <Badge variant={device.status === 'online' ? 'default' : 'destructive'}>
                  {device.status === 'online' ? t('devices.online') : t('devices.offline')}
                </Badge>
              </div>
              
              {device.status === 'online' && device.temperature && device.humidity && (
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
        <h2 className="text-xl font-semibold">Дані у реальному часі</h2>
        
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
                    {device.temperature && (
                      <Badge variant="outline" style={{ borderColor: deviceColors[index % deviceColors.length].temp }}>
                        {device.temperature.toFixed(1)}°C
                      </Badge>
                    )}
                    {device.humidity && (
                      <Badge variant="outline" style={{ borderColor: deviceColors[index % deviceColors.length].humidity }}>
                        {device.humidity.toFixed(0)}%
                      </Badge>
                    )}
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
