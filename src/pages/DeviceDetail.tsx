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
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('device_logs')
        .select('*')
        .eq('device_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

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

      setChartData(Array.from(chartMap.values()).reverse().slice(-20));
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
      fetchLogs();
    }
  }, [id, user]);

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
        { event: 'INSERT', schema: 'public', table: 'device_logs', filter: `device_id=eq.${id}` },
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
    if (!id) return;

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/devices')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {device.name || device.device_id}
            </h1>
            <p className="text-muted-foreground">{device.location || 'Не вказано'}</p>
          </div>
        </div>
        <Badge variant={device.status === 'online' ? 'default' : 'destructive'} className="text-lg px-4 py-2">
          {device.status === 'online' ? '🟢 Online' : '🔴 Offline'}
        </Badge>
      </div>

      {/* Main Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Температура</p>
                <p className="text-5xl font-bold">
                  {device.last_temp !== null && device.last_temp !== undefined ? `${device.last_temp}°C` : '-'}
                </p>
              </div>
              <Thermometer className="h-16 w-16 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Вологість</p>
                <p className="text-5xl font-bold">
                  {device.last_hum !== null && device.last_hum !== undefined ? `${device.last_hum}%` : '-'}
                </p>
              </div>
              <Droplets className="h-16 w-16 text-accent opacity-50" />
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
              <Card className={`p-4 transition-all ${getControlValue('light') ? 'bg-primary/10 border-primary' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Lightbulb className={`h-6 w-6 ${getControlValue('light') ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Switch
                    checked={getControlValue('light')}
                    onCheckedChange={() => toggleControl('light', getControlValue('light'))}
                  />
                </div>
                <p className="text-sm font-medium">💡 Освітлення</p>
              </Card>

              <Card className={`p-4 transition-all ${getControlValue('heater') ? 'bg-primary/10 border-primary' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Flame className={`h-6 w-6 ${getControlValue('heater') ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Switch
                    checked={getControlValue('heater')}
                    onCheckedChange={() => toggleControl('heater', getControlValue('heater'))}
                  />
                </div>
                <p className="text-sm font-medium">🔥 Нагрів</p>
              </Card>

              <Card className={`p-4 transition-all ${getControlValue('water') ? 'bg-primary/10 border-primary' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Droplets className={`h-6 w-6 ${getControlValue('water') ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Switch
                    checked={getControlValue('water')}
                    onCheckedChange={() => toggleControl('water', getControlValue('water'))}
                  />
                </div>
                <p className="text-sm font-medium">💧 Полив</p>
              </Card>

              <Card className={`p-4 transition-all ${getControlValue('humidifier') ? 'bg-primary/10 border-primary' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <CloudRain className={`h-6 w-6 ${getControlValue('humidifier') ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Switch
                    checked={getControlValue('humidifier')}
                    onCheckedChange={() => toggleControl('humidifier', getControlValue('humidifier'))}
                  />
                </div>
                <p className="text-sm font-medium">🌫 Зволожувач</p>
              </Card>

              <Card className={`p-4 transition-all ${getControlValue('fan') ? 'bg-primary/10 border-primary' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Wind className={`h-6 w-6 ${getControlValue('fan') ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Switch
                    checked={getControlValue('fan')}
                    onCheckedChange={() => toggleControl('fan', getControlValue('fan'))}
                  />
                </div>
                <p className="text-sm font-medium">💨 Вентилятор</p>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Графік змін (останні 50 записів)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Немає даних для відображення
                </div>
              ) : (
                <div className="h-[400px] w-full">
                  <ChartContainer config={{}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        {chartData[0]?.temperature !== undefined && (
                          <Line 
                            type="monotone" 
                            dataKey="temperature"
                            name="Температура (°C)"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                          />
                        )}
                        {chartData[0]?.humidity !== undefined && (
                          <Line 
                            type="monotone" 
                            dataKey="humidity"
                            name="Вологість (%)"
                            stroke="hsl(var(--accent))"
                            strokeWidth={2}
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
