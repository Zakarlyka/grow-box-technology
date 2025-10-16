import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { 
  Thermometer, 
  Droplets, 
  ArrowLeft,
  Lightbulb,
  Flame,
  CloudRain,
  Wind,
  Settings,
  Trash2,
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
} from "@/components/ui/alert-dialog";

interface Device {
  id: string;
  device_id: string;
  name: string;
  location: string | null;
  last_temp?: number | null;
  last_hum?: number | null;
  last_seen_at?: string | null;
  last_seen?: string | null;
  status: string;
  user_id: string;
}

interface DeviceControl {
  id: string;
  device_id: string;
  control_name: string;
  control_type: string;
  value: boolean;
  intensity?: number;
}

interface DeviceLog {
  id: string;
  device_id: string;
  metric: string;
  value: number;
  created_at: string;
}

interface ChartData {
  time: string;
  temperature?: number;
  humidity?: number;
}

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [device, setDevice] = useState<Device | null>(null);
  const [controls, setControls] = useState<DeviceControl[]>([]);
  const [logs, setLogs] = useState<DeviceLog[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loadingControls, setLoadingControls] = useState<Set<string>>(new Set());

  const fetchDevice = async () => {
    if (!id || !user) return;

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setDevice(data);
    } catch (error) {
      console.error('Error fetching device:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося завантажити пристрій",
        variant: "destructive",
      });
      navigate('/devices');
    }
  };

  const fetchControls = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('device_controls')
        .select('*')
        .eq('device_id', id);

      if (error) throw error;
      setControls(data || []);
    } catch (error) {
      console.error('Error fetching controls:', error);
    }
  };

  const fetchLogs = async () => {
    if (!device?.device_id) return;

    try {
      // Fetch logs from last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('device_logs')
        .select('*')
        .eq('device_id', device.device_id)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLogs(data || []);

      // Prepare chart data
      const tempData = data?.filter(l => l.metric === 'temperature') || [];
      const humData = data?.filter(l => l.metric === 'humidity') || [];
      
      const chartMap = new Map<string, ChartData>();
      
      [...tempData, ...humData].forEach(log => {
        const time = new Date(log.created_at).toLocaleTimeString('uk-UA', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        if (!chartMap.has(time)) {
          chartMap.set(time, { time });
        }
        
        const dataPoint = chartMap.get(time)!;
        if (log.metric === 'temperature') {
          dataPoint.temperature = log.value;
        } else if (log.metric === 'humidity') {
          dataPoint.humidity = log.value;
        }
      });

      setChartData(Array.from(chartMap.values()));
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      fetchDevice();
      fetchControls();
    }
  }, [id, user]);

  useEffect(() => {
    if (device) {
      fetchLogs();
    }
  }, [device]);

  // Realtime subscriptions
  useEffect(() => {
    if (!id) return;

    const deviceChannel = supabase
      .channel(`device-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'devices', filter: `id=eq.${id}` },
        (payload) => {
          setDevice(payload.new as Device);
        }
      )
      .subscribe();

    const logsChannel = supabase
      .channel(`logs-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'device_logs', filter: `device_id=eq.${device?.device_id}` },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    const controlsChannel = supabase
      .channel(`controls-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'device_controls', filter: `device_id=eq.${id}` },
        () => {
          fetchControls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(deviceChannel);
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(controlsChannel);
    };
  }, [id]);

  const toggleControl = async (controlName: string, currentValue: boolean) => {
    if (!id || !isOnline) return;

    setLoadingControls(prev => new Set(prev).add(controlName));

    try {
      const existingControl = controls.find(c => c.control_name === controlName);

      if (existingControl) {
        const { error } = await supabase
          .from('device_controls')
          .update({ value: !currentValue })
          .eq('id', existingControl.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('device_controls')
          .insert({
            device_id: id,
            control_name: controlName,
            control_type: 'switch',
            value: true
          });

        if (error) throw error;
      }

      toast({
        title: "Успіх",
        description: `${controlName} ${!currentValue ? 'увімкнено' : 'вимкнено'}`,
      });
    } catch (error) {
      console.error('Toggle error:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося змінити стан",
        variant: "destructive",
      });
    } finally {
      setLoadingControls(prev => {
        const next = new Set(prev);
        next.delete(controlName);
        return next;
      });
    }
  };

  const getControlValue = (controlName: string): boolean => {
    return controls.find(c => c.control_name === controlName)?.value || false;
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Пристрій видалено",
        description: "Пристрій успішно видалено",
      });
      navigate('/devices');
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося видалити пристрій",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Пристрій не знайдено</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if device is online based on status and last_seen_at (5 minute timeout)
  const lastSeen = device.last_seen_at || device.last_seen;
  const isOnline = device.status === 'online' && 
    lastSeen !== null && 
    new Date(lastSeen).getTime() > Date.now() - 5 * 60 * 1000;

  const lastSeenText = lastSeen
    ? new Date(lastSeen).toLocaleString('uk-UA')
    : 'Немає даних';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/devices')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">Панель пристрою</p>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {device.name || device.device_id}
            </h1>
            <p className="text-muted-foreground">{device.location || 'Не вказано'}</p>
          </div>
        </div>
        <div className="text-right">
          <Badge variant={isOnline ? 'default' : 'destructive'} className="text-lg px-4 py-2 mb-2">
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </Badge>
          <p className="text-xs text-muted-foreground">Останнє оновлення:</p>
          <p className="text-sm font-mono">{lastSeenText}</p>
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 transition-all hover:shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  Температура
                </p>
                <p className="text-5xl font-bold transition-all duration-500 animate-fade-in">
                  {device.last_temp !== null && device.last_temp !== undefined ? `${device.last_temp}°C` : '--'}
                </p>
                {!isOnline && <p className="text-xs text-muted-foreground mt-2">Немає підключення</p>}
              </div>
              <Thermometer className={`h-16 w-16 transition-all ${isOnline ? 'text-primary animate-pulse' : 'text-muted-foreground opacity-30'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 transition-all hover:shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  Вологість
                </p>
                <p className="text-5xl font-bold transition-all duration-500 animate-fade-in">
                  {device.last_hum !== null && device.last_hum !== undefined ? `${device.last_hum}%` : '--'}
                </p>
                {!isOnline && <p className="text-xs text-muted-foreground mt-2">Немає підключення</p>}
              </div>
              <Droplets className={`h-16 w-16 transition-all ${isOnline ? 'text-accent animate-pulse' : 'text-muted-foreground opacity-30'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="control" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="control">Керування</TabsTrigger>
          <TabsTrigger value="analytics">Графіки</TabsTrigger>
          <TabsTrigger value="logs">Логи</TabsTrigger>
          <TabsTrigger value="settings">Налаштування</TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Керування пристроєм</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className={`p-4 transition-all ${getControlValue('relay_1') ? 'bg-primary/10 border-primary' : ''} ${!isOnline ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Lightbulb className={`h-6 w-6 ${getControlValue('relay_1') ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Switch
                    checked={getControlValue('relay_1')}
                    disabled={!isOnline || loadingControls.has('relay_1')}
                    onCheckedChange={() => toggleControl('relay_1', getControlValue('relay_1'))}
                  />
                </div>
                <p className="text-sm font-medium">
                  💡 Освітлення
                  {loadingControls.has('relay_1') && <span className="ml-2 animate-spin">⏳</span>}
                </p>
              </Card>

              <Card className={`p-4 transition-all ${getControlValue('relay_2') ? 'bg-primary/10 border-primary' : ''} ${!isOnline ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Flame className={`h-6 w-6 ${getControlValue('relay_2') ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Switch
                    checked={getControlValue('relay_2')}
                    disabled={!isOnline || loadingControls.has('relay_2')}
                    onCheckedChange={() => toggleControl('relay_2', getControlValue('relay_2'))}
                  />
                </div>
                <p className="text-sm font-medium">
                  🔥 Обігрів
                  {loadingControls.has('relay_2') && <span className="ml-2 animate-spin">⏳</span>}
                </p>
              </Card>

              <Card className={`p-4 transition-all ${getControlValue('relay_3') ? 'bg-primary/10 border-primary' : ''} ${!isOnline ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Droplets className={`h-6 w-6 ${getControlValue('relay_3') ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Switch
                    checked={getControlValue('relay_3')}
                    disabled={!isOnline || loadingControls.has('relay_3')}
                    onCheckedChange={() => toggleControl('relay_3', getControlValue('relay_3'))}
                  />
                </div>
                <p className="text-sm font-medium">
                  💧 Полив
                  {loadingControls.has('relay_3') && <span className="ml-2 animate-spin">⏳</span>}
                </p>
              </Card>

              <Card className={`p-4 transition-all ${getControlValue('relay_4') ? 'bg-primary/10 border-primary' : ''} ${!isOnline ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <CloudRain className={`h-6 w-6 ${getControlValue('relay_4') ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Switch
                    checked={getControlValue('relay_4')}
                    disabled={!isOnline || loadingControls.has('relay_4')}
                    onCheckedChange={() => toggleControl('relay_4', getControlValue('relay_4'))}
                  />
                </div>
                <p className="text-sm font-medium">
                  🌫 Зволожувач
                  {loadingControls.has('relay_4') && <span className="ml-2 animate-spin">⏳</span>}
                </p>
              </Card>

              <Card className={`p-4 transition-all ${getControlValue('relay_5') ? 'bg-primary/10 border-primary' : ''} ${!isOnline ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Wind className={`h-6 w-6 ${getControlValue('relay_5') ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Switch
                    checked={getControlValue('relay_5')}
                    disabled={!isOnline || loadingControls.has('relay_5')}
                    onCheckedChange={() => toggleControl('relay_5', getControlValue('relay_5'))}
                  />
                </div>
                <p className="text-sm font-medium">
                  💨 Вентилятор
                  {loadingControls.has('relay_5') && <span className="ml-2 animate-spin">⏳</span>}
                </p>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Історія даних (останні 24 години)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Немає даних для відображення</p>
                  <p className="text-sm mt-2">Дані з'являться після підключення пристрою</p>
                </div>
              ) : (
                <div className="h-[400px] w-full">
                  <ChartContainer config={{}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" className="opacity-30" />
                        <XAxis 
                          dataKey="time" 
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        {chartData[0]?.temperature !== undefined && (
                          <Line 
                            type="monotone" 
                            dataKey="temperature"
                            name="Температура (°C)"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                            activeDot={{ r: 6 }}
                            animationDuration={500}
                          />
                        )}
                        {chartData[0]?.humidity !== undefined && (
                          <Line 
                            type="monotone" 
                            dataKey="humidity"
                            name="Вологість (%)"
                            stroke="hsl(var(--accent))"
                            strokeWidth={3}
                            dot={{ fill: 'hsl(var(--accent))', r: 4 }}
                            activeDot={{ r: 6 }}
                            animationDuration={500}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Останні записи ({logs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Немає записів</p>
                ) : (
                  logs.map((log) => (
                    <div 
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
                    >
                      <div className="flex items-center gap-3">
                        {log.metric === 'temperature' ? (
                          <Thermometer className="h-4 w-4 text-primary" />
                        ) : (
                          <Droplets className="h-4 w-4 text-accent" />
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
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Налаштування пристрою
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Device ID:</p>
                  <p className="font-mono">{device.device_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Останнє з'єднання:</p>
                  <p>{device.last_seen_at ? new Date(device.last_seen_at).toLocaleString('uk-UA') : '-'}</p>
                </div>
              </div>
              
              <div className="pt-6 border-t">
                <Button 
                  variant="destructive" 
                  onClick={() => setDeleteDialogOpen(true)}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Видалити пристрій
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити пристрій?</AlertDialogTitle>
            <AlertDialogDescription>
              Ця дія незворотна. Всі дані пристрою будуть видалені назавжди.
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
