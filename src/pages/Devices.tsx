import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';

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

    // Set up Realtime subscription
    const channel = supabase
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
          console.log('Realtime update:', payload);
          fetchDevices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Назва</TableHead>
                  <TableHead>Розташування</TableHead>
                  <TableHead>Температура</TableHead>
                  <TableHead>Вологість</TableHead>
                  <TableHead>Останнє з'єднання</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-mono text-xs">
                      {device.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono">{device.device_id}</TableCell>
                    <TableCell>{device.name}</TableCell>
                    <TableCell>{device.location || '-'}</TableCell>
                    <TableCell>
                      {device.last_temp ? `${device.last_temp}°C` : '-'}
                    </TableCell>
                    <TableCell>
                      {device.last_hum ? `${device.last_hum}%` : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {device.last_seen ? formatDate(device.last_seen) : '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          device.status === 'online'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {device.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
    </div>
  );
};

export default Devices;
