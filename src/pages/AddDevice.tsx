import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Copy, RefreshCw, Wifi, ArrowLeft } from 'lucide-react';

export default function AddDevice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deviceId, setDeviceId] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const generateDeviceId = () => {
    const random1 = Math.random().toString(36).substring(2, 10).toUpperCase();
    const random2 = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newDeviceId = `ESP-${random1}-${random2}`;
    setDeviceId(newDeviceId);
  };

  useEffect(() => {
    if (!deviceId) {
      generateDeviceId();
    }
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(deviceId);
    toast.success('Device ID скопійовано');
  };

  const checkConnection = async () => {
    if (!deviceId || !name) {
      toast.error('Заповніть Device ID та Name');
      return;
    }

    setIsChecking(true);

    try {
      const response = await fetch(
        'https://ychnmaaximnoxvwnzrgs.supabase.co/functions/v1/confirm-device',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            device_id: deviceId,
            name: name,
            location: location || undefined
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Потрібно розгорнути Edge Function confirm-device');
          return;
        }
        toast.error('Перевір з\'єднання', {
          description: 'Повторна спроба через 5 секунд...',
        });
        setTimeout(() => checkConnection(), 5000);
        return;
      }

      const data = await response.json();

      if (data?.success === true) {
        toast.success('✅ Device confirmed');
        navigate('/');
      } else if (data?.status === 'connected') {
        toast.success('✅ Device confirmed');
        navigate('/');
      } else if (data?.status === 'not_found') {
        toast.error('Пристрій не знайдено. Спробуйте ще раз.');
      } else {
        toast.warning('Пристрій офлайн. Перевірте підключення.');
      }
    } catch (err) {
      console.error('Connection check error:', err);
      toast.error('Помилка перевірки з\'єднання');
    } finally {
      setIsChecking(false);
    }
  };

  const qrUrl = `http://192.168.4.1/?deviceId=${deviceId}`;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад до Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-6 w-6" />
              Додати новий пристрій
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Device ID Input */}
            <div className="space-y-2">
              <Label htmlFor="deviceId">Device ID</Label>
              <div className="flex gap-2">
                <Input
                  id="deviceId"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="font-mono"
                  placeholder="growbox001"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  title="Копіювати"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={generateDeviceId}
                  title="Згенерувати новий"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Grow Box"
                required
              />
            </div>

            {/* Location Input */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Kitchen"
              />
            </div>

            {/* QR Code */}
            <div className="flex justify-center p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <QRCodeSVG value={qrUrl} size={256} level="H" />
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Інструкція з підключення:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li>Відскануйте QR-код або скопіюйте Device ID</li>
                <li>Підключіться до Wi-Fi мережі <strong>GrowBox_Setup</strong></li>
                <li>У порталі виберіть вашу Wi-Fi мережу</li>
                <li>Введіть пароль від мережі</li>
                <li>Натисніть <strong>Connect</strong></li>
                <li>Після підключення натисніть кнопку нижче</li>
              </ol>
            </div>

            {/* Check Connection Button */}
            <Button
              onClick={checkConnection}
              disabled={isChecking || !deviceId || !name}
              className="w-full"
              size="lg"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Перевірка підключення...
                </>
              ) : (
                'Confirm device'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
