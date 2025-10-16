import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Sidebar } from '@/components/Sidebar';
import { DeviceControls } from '@/components/DeviceControls';
import { 
  Thermometer, 
  Droplets, 
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
  last_seen: string | null;
  status: string;
  user_id: string;
}

interface LogEntry {
  created_at: string;
  temp?: number;
  hum?: number;
}

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [device, setDevice] = useState<Device | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
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

  const fetchLogs = async () => {
    if (!device?.id) return;

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('sensor_data')
        .select('timestamp, temperature, humidity')
        .eq('device_id', device.id)
        .gte('timestamp', twentyFourHoursAgo)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Format data for chart
      const formattedLogs = data?.map(log => ({
        created_at: new Date(log.timestamp).toLocaleTimeString('uk-UA', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        temp: log.temperature,
        hum: log.humidity
      })) || [];

      setLogs(formattedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      fetchDevice();
    }
  }, [id, user]);

  useEffect(() => {
    if (device) {
      fetchLogs();
    }
  }, [device]);

  // Realtime subscriptions
  useEffect(() => {
    if (!id || !device?.device_id) return;

    const deviceChannel = supabase
      .channel(`device-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'devices', filter: `id=eq.${id}` },
        (payload) => {
          console.log('Device updated:', payload);
          setDevice(payload.new as Device);
        }
      )
      .subscribe();

    const logsChannel = supabase
      .channel(`sensor-data-${device.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_data', filter: `device_id=eq.${device.id}` },
        (payload) => {
          console.log('New sensor data:', payload);
          
          // Update device with latest readings
          if (payload.new && typeof payload.new === 'object' && 'temperature' in payload.new && 'humidity' in payload.new) {
            setDevice(prev => prev ? {
              ...prev,
              last_temp: payload.new.temperature,
              last_hum: payload.new.humidity
            } : null);
          }
          
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(deviceChannel);
      supabase.removeChannel(logsChannel);
    };
  }, [id, device?.device_id]);

  const sendCmd = async (command: string, value: string) => {
    if (!device?.device_id || !isOnline) {
      toast({
        title: "Помилка",
        description: "Пристрій не підключений",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('device_controls')
        .insert([{
          device_id: device.id,
          control_name: command,
          control_type: 'switch',
          value: value === 'on'
        }]);

      if (error) throw error;

      toast({
        title: "Команду надіслано",
        description: `${command} ${value === 'on' ? 'увімкнено' : 'вимкнено'}`,
      });
    } catch (error) {
      console.error('Send command error:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося надіслати команду",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!device?.device_id) return;

    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('device_id', device.device_id);

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

  const isOnline = device.status === 'online' && 
    device.last_seen !== null && 
    new Date(device.last_seen).getTime() > Date.now() - 5 * 60 * 1000;

  const lastSeenText = device.last_seen
    ? new Date(device.last_seen).toLocaleString('uk-UA')
    : 'Немає даних';

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
              Панель пристрою
            </p>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {device.name || device.device_id}
            </h1>
            {device.location && (
              <p className="text-muted-foreground">{device.location}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-4">
            <Badge variant={isOnline ? 'default' : 'destructive'} className="text-lg px-4 py-2 mb-2">
              {isOnline ? '🟢 Online' : '🔴 Offline'}
            </Badge>
            <p className="text-xs text-muted-foreground">Останнє оновлення:</p>
            <p className="text-sm font-mono">{lastSeenText}</p>
          </div>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 transition-all hover:shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  Температура
                </p>
                <p className="text-5xl font-bold">
                  {device.last_temp !== null && device.last_temp !== undefined 
                    ? `${device.last_temp}°C` 
                    : '--'}
                </p>
                {!isOnline && (
                  <p className="text-xs text-muted-foreground mt-2">Немає підключення</p>
                )}
              </div>
              <Thermometer className={`h-16 w-16 ${isOnline ? 'text-primary animate-pulse' : 'text-muted-foreground opacity-30'}`} />
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
                <p className="text-5xl font-bold">
                  {device.last_hum !== null && device.last_hum !== undefined 
                    ? `${device.last_hum}%` 
                    : '--'}
                </p>
                {!isOnline && (
                  <p className="text-xs text-muted-foreground mt-2">Немає підключення</p>
                )}
              </div>
              <Droplets className={`h-16 w-16 ${isOnline ? 'text-accent animate-pulse' : 'text-muted-foreground opacity-30'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Керування пристроєм</CardTitle>
        </CardHeader>
        <CardContent>
          <DeviceControls device={device} isOnline={isOnline} />
        </CardContent>
      </Card>

      {/* History Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Історія (24 години)</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={logs}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="created_at" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="temp" 
                  stroke="#f59e0b" 
                  name="Температура °C"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="hum" 
                  stroke="#3b82f6" 
                  name="Вологість %"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Немає даних за останні 24 години
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити пристрій?</AlertDialogTitle>
            <AlertDialogDescription>
              Ця дія незворотна. Пристрій "{device.name || device.device_id}" буде видалено разом з усіма його даними.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>
      </main>
    </div>
  );
}
