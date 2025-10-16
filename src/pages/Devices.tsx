import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Sidebar } from '@/components/Sidebar';
import { Header as PageHeader } from '@/components/PageHeader';
import { DeviceCard } from '@/components/DeviceCard';
import { Card, CardContent } from '@/components/ui/card';

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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('No auth token');
      }

      const { data, error } = await supabase.functions.invoke('generate-qr', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
          <PageHeader 
            title="Пристрої"
            subtitle="Керуйте своїми ESP32 GrowBox пристроями в реальному часі"
            action={
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
            }
          />

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
              {devices.map((device) => (
                <DeviceCard 
                  key={device.id}
                  device={device}
                  isOnline={isDeviceOnline(device)}
                />
              ))}
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
