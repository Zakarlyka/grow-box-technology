import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RefreshCw, Plus, Thermometer, Droplets, Sprout, Sun, Flame, Wind, Droplet, Fan } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Sidebar } from '@/components/Sidebar';

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
  created_at: string;
}

const Devices = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<{ token: string; url: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchDevices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося завантажити пристрої",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const isDeviceOnline = (device: Device): boolean => {
    return device.status === 'online' && 
      device.last_seen !== null &&
      new Date(device.last_seen).getTime() > Date.now() - 5 * 60 * 1000;
  };

  useEffect(() => {
    if (!user) return;

    fetchDevices();

    // Realtime subscription for devices
    const devicesChannel = supabase
      .channel('devices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Device update:', payload);
          if (payload.eventType === 'INSERT') {
            setDevices(prev => [...prev, payload.new as Device]);
          } else if (payload.eventType === 'UPDATE') {
            setDevices(prev => prev.map(d => d.id === payload.new.id ? payload.new as Device : d));
          } else if (payload.eventType === 'DELETE') {
            setDevices(prev => prev.filter(d => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(devicesChannel);
    };
  }, [user]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDevices();
  };

  const handleAddDevice = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-qr', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      if (data?.device_token) {
        const qrUrl = `http://192.168.4.1/?token=${data.device_token}`;
        setQrData({ token: data.device_token, url: qrUrl });
        setShowQRModal(true);
        
        toast({
          title: "QR-код створено",
          description: "Скануйте код на вашому пристрої ESP8266",
        });
      }
    } catch (error) {
      console.error('Add device error:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося створити код для підключення",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Будь ласка, увійдіть в систему для перегляду пристроїв
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Пристрої
              </h1>
              <p className="text-muted-foreground mt-1">
                Керуйте своїми ESP32 GrowBox пристроями в реальному часі
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={handleAddDevice} disabled={isGenerating}>
                <Plus className="mr-2 h-4 w-4" />
                Додати пристрій
              </Button>
            </div>
          </div>

          {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : devices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">У вас ще немає підключених пристроїв</p>
            <Button onClick={handleAddDevice} disabled={isGenerating}>
              <Plus className="mr-2 h-4 w-4" />
              Додати перший пристрій
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {devices.map((device) => {
            const online = isDeviceOnline(device);
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
                key={device.id} 
                className="border-border bg-card hover:border-accent/30 transition-all duration-300"
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
                    <Button
                      size="sm"
                      className={online ? 'bg-primary hover:bg-primary/90' : 'bg-muted hover:bg-muted/90'}
                    >
                      {online ? 'Онлайн' : 'Офлайн'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
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

                  {/* Controls Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">Керування</h3>
                    
                    {/* Control Switches */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Droplet className="h-4 w-4 text-primary" />
                          <span className="text-sm">Водяна помпа</span>
                        </div>
                        <Switch 
                          disabled={!online}
                          onCheckedChange={async (checked) => {
                            await supabase.from('device_controls').insert([{
                              device_id: device.id,
                              control_name: 'relay_3',
                              control_type: 'relay',
                              value: checked
                            }]);
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-secondary/30 border border-success/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4 text-success" />
                          <span className="text-sm">Система освітлення</span>
                        </div>
                        <Switch 
                          defaultChecked
                          disabled={!online}
                          onCheckedChange={async (checked) => {
                            await supabase.from('device_controls').insert([{
                              device_id: device.id,
                              control_name: 'relay_1',
                              control_type: 'relay',
                              value: checked
                            }]);
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-secondary/30 border border-success/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Wind className="h-4 w-4 text-success" />
                          <span className="text-sm">Вентиляція</span>
                        </div>
                        <Switch 
                          defaultChecked
                          disabled={!online}
                          onCheckedChange={async (checked) => {
                            await supabase.from('device_controls').insert([{
                              device_id: device.id,
                              control_name: 'relay_5',
                              control_type: 'relay',
                              value: checked
                            }]);
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Flame className="h-4 w-4 text-warning" />
                          <span className="text-sm">Обігрівач</span>
                        </div>
                        <Switch 
                          disabled={!online}
                          onCheckedChange={async (checked) => {
                            await supabase.from('device_controls').insert([{
                              device_id: device.id,
                              control_name: 'relay_2',
                              control_type: 'relay',
                              value: checked
                            }]);
                          }}
                        />
                      </div>
                    </div>

                    {/* Sliders */}
                    <div className="space-y-4 pt-2">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Light Intensity</span>
                          <span className="text-sm text-primary font-semibold">80%</span>
                        </div>
                        <Slider 
                          defaultValue={[80]} 
                          max={100} 
                          step={1}
                          disabled={!online}
                          className="cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Fan Speed</span>
                          <span className="text-sm text-success font-semibold">60%</span>
                        </div>
                        <Slider 
                          defaultValue={[60]} 
                          max={100} 
                          step={1}
                          disabled={!online}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR-код для підключення пристрою</DialogTitle>
            <DialogDescription>
              Скануйте цей QR-код на вашому ESP8266 пристрої для реєстрації
            </DialogDescription>
          </DialogHeader>
          {qrData && (
            <div className="flex flex-col items-center gap-4 p-4">
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={qrData.url} size={256} />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Або введіть токен вручну:</p>
                <code className="text-xs bg-muted p-2 rounded block break-all">
                  {qrData.token}
                </code>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </div>
      </main>
    </div>
  );
};

export default Devices;
