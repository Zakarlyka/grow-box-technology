import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle, Loader2, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import QRCode from 'react-qr-code';

interface QRDeviceSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeviceAdded: () => void;
}

export function QRDeviceSetup({ open, onOpenChange, onDeviceAdded }: QRDeviceSetupProps) {
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<{ token: string; link: string } | null>(null);
  const [connected, setConnected] = useState(false);
  const [polling, setPolling] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (open && !qrData) {
      generateQR();
    }
  }, [open]);

  useEffect(() => {
    let pollInterval: number;
    
    if (qrData && !connected && polling) {
      // Poll every 5 seconds for new device
      pollInterval = window.setInterval(async () => {
        await checkForNewDevice();
      }, 5000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [qrData, connected, polling]);

  const generateQR = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-qr', {
        method: 'POST',
      });

      if (error) throw error;

      if (data.success) {
        setQrData({ token: data.token, link: data.link });
        setPolling(true);
        toast({
          title: 'QR-код згенеровано',
          description: 'Відскануйте код пристроєм',
        });
      }
    } catch (error: any) {
      console.error('Error generating QR:', error);
      toast({
        title: 'Помилка',
        description: 'Не вдалося згенерувати QR-код',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkForNewDevice = async () => {
    if (!user) return;

    try {
      const { data: devices, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (devices && devices.length > 0) {
        const latestDevice = devices[0];
        const deviceAge = Date.now() - new Date(latestDevice.created_at).getTime();
        
        // If device was created in last 30 seconds, it's the new one
        if (deviceAge < 30000) {
          setConnected(true);
          setPolling(false);
          toast({
            title: '✅ Пристрій підключено!',
            description: `${latestDevice.name} успішно додано`,
          });
          onDeviceAdded();
        }
      }
    } catch (error) {
      console.error('Error checking for device:', error);
    }
  };

  const copyLink = async () => {
    if (!qrData) return;
    
    try {
      await navigator.clipboard.writeText(qrData.link);
      toast({
        title: 'Скопійовано',
        description: 'Посилання скопійовано в буфер обміну',
      });
    } catch (error) {
      toast({
        title: 'Помилка',
        description: 'Не вдалося скопіювати посилання',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setQrData(null);
    setConnected(false);
    setPolling(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Підключення пристрою через QR-код</DialogTitle>
          <DialogDescription>
            Слідуйте інструкціям нижче для підключення вашого пристрою
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Генерація QR-коду...</p>
          </div>
        )}

        {!loading && qrData && !connected && (
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center p-6 bg-white rounded-lg">
              <QRCode value={qrData.link} size={200} />
            </div>

            {/* Instructions */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-sm">Інструкція з підключення:</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">1️⃣</span>
                  <span>Увімкніть пристрій GrowBox</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">2️⃣</span>
                  <span>Підключіться до Wi-Fi мережі <strong>"GrowBox-Setup"</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">3️⃣</span>
                  <span>Відскануйте QR-код камерою телефону або скопіюйте посилання</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-primary">4️⃣</span>
                  <span>Пристрій автоматично прив'яжеться до вашого акаунта</span>
                </li>
              </ol>
            </div>

            {/* Copy Link Button */}
            <Button
              onClick={copyLink}
              variant="outline"
              className="w-full"
            >
              <Copy className="mr-2 h-4 w-4" />
              Скопіювати посилання
            </Button>

            {/* Status */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <WifiOff className="h-4 w-4 animate-pulse" />
              <span>Очікування підключення пристрою...</span>
            </div>
          </div>
        )}

        {!loading && connected && (
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">✅ Пристрій успішно підключено!</h3>
                <p className="text-muted-foreground">
                  Ваш пристрій з'явиться у списку пристроїв
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
              >
                Повернутися на панель
              </Button>
              <Button
                onClick={handleClose}
                className="flex-1"
              >
                Готово
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
