import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Thermometer, 
  Droplets, 
  Cpu,
  Activity,
  Plus,
  Wifi,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart-simple';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Device {
  id: string;
  device_id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  last_seen: string;
  created_at: string;
}

interface DeviceLog {
  id: string;
  device_id: string;
  metric: string;
  value: number;
  created_at: string;
}

interface SensorData {
  time: string;
  temperature?: number;
  humidity?: number;
}

export function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [deviceLogs, setDeviceLogs] = useState<DeviceLog[]>([]);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);

  // Завантаження пристроїв
  const fetchDevices = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user.id)
      .order('last_seen', { ascending: false });

    if (error) {
      console.error('Error fetching devices:', error);
      toast.error('Помилка завантаження пристроїв');
      return;
    }

    if (data) {
      setDevices(data as Device[]);
      if (data.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(data[0].id);
      }
    }
    setLoading(false);
  };

  // Завантаження логів для вибраного пристрою
  const fetchDeviceLogs = async () => {
    if (!selectedDeviceId) return;

    const { data, error } = await supabase
      .from('device_logs')
      .select('*')
      .eq('device_id', selectedDeviceId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching device logs:', error);
      return;
    }

    if (data) {
      setDeviceLogs(data);
      
      // Підготовка даних для графіка
      const chartData: SensorData[] = data
        .reverse()
        .map(log => ({
          time: new Date(log.created_at).toLocaleTimeString('uk-UA', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          [log.metric]: log.value,
        }))
        .reduce((acc: SensorData[], curr) => {
          const existing = acc.find(item => item.time === curr.time);
          if (existing) {
            Object.assign(existing, curr);
          } else {
            acc.push(curr);
          }
          return acc;
        }, []);

      setSensorData(chartData);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [user]);

  useEffect(() => {
    fetchDeviceLogs();
  }, [selectedDeviceId]);

  // Realtime підписка на зміни пристроїв
  useEffect(() => {
    if (!user) return;

    const devicesChannel = supabase
      .channel('devices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchDevices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(devicesChannel);
    };
  }, [user]);

  // Realtime підписка на device_logs
  useEffect(() => {
    if (!selectedDeviceId) return;

    const logsChannel = supabase
      .channel('device-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_logs',
          filter: `device_id=eq.${selectedDeviceId}`,
        },
        () => {
          fetchDeviceLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(logsChannel);
    };
  }, [selectedDeviceId]);

  // Періодичний refetch
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDevices();
      if (selectedDeviceId) {
        fetchDeviceLogs();
      }
    }, 30000); // Кожні 30 секунд

    return () => clearInterval(interval);
  }, [selectedDeviceId]);

  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('dashboard.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.subtitle')}
          </p>
        </div>
        
        <Button onClick={() => navigate('/add-device')} className="gap-2">
          <Plus className="w-4 h-4" />
          Додати новий пристрій
        </Button>
      </div>

      {/* Статус підключення */}
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
              <span>Всього: {devices.length}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Таблиця пристроїв */}
      <Card className="gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-accent" />
            <span>Мої пристрої</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Немає підключених пристроїв</p>
              <Button 
                onClick={() => navigate('/add-device')} 
                className="mt-4"
                variant="outline"
              >
                Додати перший пристрій
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-sm font-semibold">Device ID</th>
                    <th className="text-left p-3 text-sm font-semibold">Назва</th>
                    <th className="text-left p-3 text-sm font-semibold">Статус</th>
                    <th className="text-left p-3 text-sm font-semibold">Останнє з'єднання</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => (
                    <tr 
                      key={device.id}
                      onClick={() => setSelectedDeviceId(device.id)}
                      className={`border-b border-border hover:bg-muted/50 cursor-pointer transition-colors ${
                        selectedDeviceId === device.id ? 'bg-muted' : ''
                      }`}
                    >
                      <td className="p-3 text-sm font-mono">{device.device_id}</td>
                      <td className="p-3 text-sm">{device.name}</td>
                      <td className="p-3">
                        <Badge variant={device.status === 'online' ? 'default' : 'destructive'}>
                          {device.status === 'online' ? 'Онлайн' : 'Офлайн'}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(device.last_seen).toLocaleString('uk-UA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Логи вибраного пристрою */}
      {selectedDevice && (
        <>
          <Card className="gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-primary" />
                <span>Графік даних: {selectedDevice.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sensorData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Немає даних для відображення
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ChartContainer config={{}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sensorData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        {sensorData[0]?.temperature !== undefined && (
                          <Line 
                            type="monotone" 
                            dataKey="temperature"
                            name="Температура (°C)"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                          />
                        )}
                        {sensorData[0]?.humidity !== undefined && (
                          <Line 
                            type="monotone" 
                            dataKey="humidity"
                            name="Вологість (%)"
                            stroke="hsl(var(--accent))"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <span>Останні 20 записів логів</span>
                </span>
                {deviceLogs.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Всього: {deviceLogs.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deviceLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Немає записів логів
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {deviceLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
                    >
                      <div className="flex items-center gap-3">
                        {log.metric === 'temperature' ? (
                          <Thermometer className="h-4 w-4 text-primary" />
                        ) : log.metric === 'humidity' ? (
                          <Droplets className="h-4 w-4 text-accent" />
                        ) : (
                          <Activity className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium capitalize">{log.metric}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString('uk-UA')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {log.value.toFixed(2)} {log.metric === 'temperature' ? '°C' : '%'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
