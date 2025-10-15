import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Plus, Trash2, Lightbulb, Flame, Droplets, Wind, CloudRain } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
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
  updated_at: string;
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

const Devices = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [controls, setControls] = useState<Record<string, DeviceControl[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<{ token: string; url: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);

  const fetchDevices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching devices:', error);
        toast({
          title: "Помилка",
          description: "Не вдалося завантажити пристрої",
          variant: "destructive",
        });
        return;
      }

      setDevices(data || []);
      
      // Fetch controls for all devices
      if (data && data.length > 0) {
        const deviceIds = data.map(d => d.id);
        const { data: controlsData, error: controlsError } = await supabase
          .from('device_controls')
          .select('*')
          .in('device_id', deviceIds);

        if (!controlsError && controlsData) {
          const controlsByDevice: Record<string, DeviceControl[]> = {};
          controlsData.forEach(control => {
            if (!controlsByDevice[control.device_id]) {
              controlsByDevice[control.device_id] = [];
            }
            controlsByDevice[control.device_id].push(control);
          });
          setControls(controlsByDevice);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchDevices();

    // Set up Realtime subscription for devices
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
          console.log('Devices realtime update:', payload);
          fetchDevices();
        }
      )
      .subscribe();

    // Set up Realtime subscription for device_controls
    const controlsChannel = supabase
      .channel('controls-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_controls'
        },
        (payload) => {
          console.log('Controls realtime update:', payload);
          fetchDevices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(devicesChannel);
      supabase.removeChannel(controlsChannel);
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

      if (error) {
        console.error('Error generating QR:', error);
        toast({
          title: "Помилка",
          description: "Не вдалося створити код для підключення",
          variant: "destructive",
        });
        return;
      }

      if (data?.device_token) {
        const qrUrl = `http://192.168.4.1/?token=${data.device_token}`;
        setQrData({ token: data.device_token, url: qrUrl });
        setShowQRModal(true);
        
        toast({
          title: "QR-код створено",
          description: "Скануйте код на вашому пристрої",
        });
      }
    } catch (err) {
      console.error('Add device error:', err);
      toast({
        title: "Помилка",
        description: "Сталася непередбачена помилка",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('uk-UA');
  };

  const toggleControl = async (deviceId: string, controlName: string, currentValue: boolean) => {
    try {
      // Check if control exists
      const deviceControls = controls[deviceId] || [];
      const existingControl = deviceControls.find(c => c.control_name === controlName);

      if (existingControl) {
        // Update existing control
        const { error } = await supabase
          .from('device_controls')
          .update({ value: !currentValue })
          .eq('id', existingControl.id);

        if (error) throw error;
      } else {
        // Create new control
        const { error } = await supabase
          .from('device_controls')
          .insert({
            device_id: deviceId,
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
      console.error('Toggle control error:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося змінити стан керування",
        variant: "destructive",
      });
    }
  };

  const getControlValue = (deviceId: string, controlName: string): boolean => {
    const deviceControls = controls[deviceId] || [];
    const control = deviceControls.find(c => c.control_name === controlName);
    return control?.value || false;
  };

  const handleDeleteClick = (deviceId: string) => {
    setDeviceToDelete(deviceId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deviceToDelete) return;

    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceToDelete);

      if (error) throw error;

      toast({
        title: "Пристрій видалено",
        description: "Пристрій успішно видалено з вашого облікового запису",
      });

      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
      fetchDevices();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося видалити пристрій",
        variant: "destructive",
      });
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
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">Мої пристрої</CardTitle>
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
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">У вас ще немає підключених пристроїв</p>
              <Button onClick={handleAddDevice} disabled={isGenerating}>
                <Plus className="mr-2 h-4 w-4" />
                Додати перший пристрій
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {devices.map((device) => (
                <Card key={device.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl font-bold">{device.name || device.device_id}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{device.location || 'Не вказано'}</p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          device.status === 'online'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {device.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Sensor Data */}
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div className="text-center flex-1">
                        <p className="text-2xl font-bold">
                          {device.last_temp !== null && device.last_temp !== undefined ? `${device.last_temp}°C` : '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">🌡 Температура</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-2xl font-bold">
                          {device.last_hum !== null && device.last_hum !== undefined ? `${device.last_hum}%` : '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">💧 Вологість</p>
                      </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={getControlValue(device.id, 'light') ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleControl(device.id, 'light', getControlValue(device.id, 'light'))}
                        className="w-full"
                      >
                        <Lightbulb className="mr-2 h-4 w-4" />
                        Освітлення
                      </Button>
                      <Button
                        variant={getControlValue(device.id, 'heater') ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleControl(device.id, 'heater', getControlValue(device.id, 'heater'))}
                        className="w-full"
                      >
                        <Flame className="mr-2 h-4 w-4" />
                        Нагрів
                      </Button>
                      <Button
                        variant={getControlValue(device.id, 'water') ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleControl(device.id, 'water', getControlValue(device.id, 'water'))}
                        className="w-full"
                      >
                        <Droplets className="mr-2 h-4 w-4" />
                        Полив
                      </Button>
                      <Button
                        variant={getControlValue(device.id, 'humidifier') ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleControl(device.id, 'humidifier', getControlValue(device.id, 'humidifier'))}
                        className="w-full"
                      >
                        <CloudRain className="mr-2 h-4 w-4" />
                        Зволожувач
                      </Button>
                      <Button
                        variant={getControlValue(device.id, 'fan') ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleControl(device.id, 'fan', getControlValue(device.id, 'fan'))}
                        className="w-full col-span-2"
                      >
                        <Wind className="mr-2 h-4 w-4" />
                        Вентилятор
                      </Button>
                    </div>

                    {/* Delete Button */}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(device.id)}
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Видалити пристрій
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Підключення пристрою</DialogTitle>
            <DialogDescription>
              Скануйте QR-код на вашому пристрої або використайте токен вручну
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrData && (
              <>
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={qrData.url} size={256} level="H" />
                </div>
                <div className="w-full">
                  <p className="text-sm font-medium mb-2">Токен підключення:</p>
                  <code className="block w-full p-2 bg-muted rounded text-xs break-all">
                    {qrData.token}
                  </code>
                </div>
                <div className="w-full text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Інструкція:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>📲 Підключіться до Wi-Fi "GrowBox-Setup"</li>
                    <li>🔗 Відскануйте QR-код (токен заповниться автоматично)</li>
                    <li>🧩 Введіть Wi-Fi та пароль на сторінці пристрою</li>
                    <li>✅ Пристрій підключиться автоматично і з'явиться у списку</li>
                  </ol>
                  <p className="text-xs mt-2">
                    Або відкрийте вручну: <code className="px-1 py-0.5 bg-muted rounded text-xs">{qrData.url}</code>
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити пристрій?</AlertDialogTitle>
            <AlertDialogDescription>
              Ця дія незворотна. Пристрій буде видалено з вашого облікового запису разом з усіма даними.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Devices;
