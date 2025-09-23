import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Wifi, WifiOff, Thermometer, Droplets, Sun, Beaker } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface Device {
  id: string;
  device_id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'error';
  location?: string;
  last_seen: string;
  sensor_data?: {
    temperature?: number;
    humidity?: number;
    soil_moisture?: number;
    light_level?: number;
    ph_level?: number;
  }[];
}

const UserCabinet = () => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    device_id: '',
    name: '',
    location: '',
  });

  useEffect(() => {
    fetchDevices();
  }, [user]);

  const fetchDevices = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          sensor_data:sensor_data(temperature, humidity, soil_moisture, light_level, ph_level)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Помилка",
          description: "Не вдалося завантажити пристрої",
          variant: "destructive",
        });
        return;
      }

      setDevices((data || []) as Device[]);
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const addDevice = async () => {
    if (!user || !newDevice.device_id || !newDevice.name) return;

    try {
      const { error } = await supabase
        .from('devices')
        .insert({
          user_id: user.id,
          device_id: newDevice.device_id,
          name: newDevice.name,
          location: newDevice.location,
        });

      if (error) {
        toast({
          title: "Помилка",
          description: "Не вдалося додати пристрій",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Успіх",
        description: "Пристрій успішно додано",
      });

      setNewDevice({ device_id: '', name: '', location: '' });
      setAddDeviceOpen(false);
      fetchDevices();
    } catch (err) {
      console.error('Error adding device:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'online' ? (
      <Wifi className="w-4 h-4 text-success" />
    ) : (
      <WifiOff className="w-4 h-4 text-muted-foreground" />
    );
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'online' ? 'default' : 'secondary';
    const text = status === 'online' ? 'Онлайн' : 'Офлайн';
    
    return <Badge variant={variant}>{text}</Badge>;
  };

  const getLatestSensorData = (device: Device) => {
    if (!device.sensor_data || device.sensor_data.length === 0) return null;
    return device.sensor_data[0];
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Завантаження...</div>;
  }

  return (
    <div className="flex-1 p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Кабінет користувача
          </h1>
          <p className="text-muted-foreground mt-1">
            Керуйте своїми пристроями Grow Box
          </p>
        </div>
        
        <Dialog open={addDeviceOpen} onOpenChange={setAddDeviceOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Додати пристрій
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Додати новий пристрій</DialogTitle>
              <DialogDescription>
                Введіть інформацію про ваш Grow Box пристрій
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="device-id">ID пристрою</Label>
                <Input
                  id="device-id"
                  placeholder="GB-12345678"
                  value={newDevice.device_id}
                  onChange={(e) => setNewDevice({ ...newDevice, device_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="device-name">Назва пристрою</Label>
                <Input
                  id="device-name"
                  placeholder="Мій Grow Box"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="device-location">Місцезнаходження (опціонально)</Label>
                <Input
                  id="device-location"
                  placeholder="Кухня, Балкон..."
                  value={newDevice.location}
                  onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                />
              </div>
              <Button
                onClick={addDevice}
                className="w-full gradient-primary text-primary-foreground"
                disabled={!newDevice.device_id || !newDevice.name}
              >
                Додати пристрій
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="devices" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="devices">Мої пристрої ({devices.length})</TabsTrigger>
          <TabsTrigger value="profile">Профіль</TabsTrigger>
        </TabsList>
        
        <TabsContent value="devices" className="space-y-4">
          {devices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Немає пристроїв</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Додайте свій перший Grow Box пристрій для початку роботи
                </p>
                <Button onClick={() => setAddDeviceOpen(true)}>
                  Додати пристрій
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {devices.map((device) => {
                const sensorData = getLatestSensorData(device);
                
                return (
                  <Card key={device.id} className="transition-all hover:shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{device.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(device.status)}
                          {getStatusBadge(device.status)}
                        </div>
                      </div>
                      <CardDescription>
                        ID: {device.device_id}
                        {device.location && ` • ${device.location}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {sensorData ? (
                        <div className="grid grid-cols-2 gap-3">
                          {sensorData.temperature && (
                            <div className="flex items-center gap-2">
                              <Thermometer className="w-4 h-4 text-orange-500" />
                              <span className="text-sm">{sensorData.temperature}°C</span>
                            </div>
                          )}
                          {sensorData.humidity && (
                            <div className="flex items-center gap-2">
                              <Droplets className="w-4 h-4 text-blue-500" />
                              <span className="text-sm">{sensorData.humidity}%</span>
                            </div>
                          )}
                          {sensorData.light_level && (
                            <div className="flex items-center gap-2">
                              <Sun className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm">{sensorData.light_level} lux</span>
                            </div>
                          )}
                          {sensorData.ph_level && (
                            <div className="flex items-center gap-2">
                              <Beaker className="w-4 h-4 text-purple-500" />
                              <span className="text-sm">pH {sensorData.ph_level}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Немає даних з датчиків
                        </p>
                      )}
                      <div className="mt-4">
                        <p className="text-xs text-muted-foreground">
                          Останнє з'єднання: {new Date(device.last_seen).toLocaleString('uk-UA')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Інформація про профіль</CardTitle>
              <CardDescription>
                Ваші особисті дані та налаштування акаунта
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
                </div>
                <div>
                  <Label>Повне ім'я</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {profile?.full_name || 'Не вказано'}
                  </p>
                </div>
                <div>
                  <Label>Роль</Label>
                  <Badge variant="outline" className="mt-1">
                    {profile?.role === 'user' ? 'Користувач' : profile?.role}
                  </Badge>
                </div>
                <div>
                  <Label>Дата реєстрації</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('uk-UA') : 'Невідомо'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserCabinet;