import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCodeSVG } from 'qrcode.react';
import { Wifi, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';

const QRConnection = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Start polling when component mounts
  useEffect(() => {
    if (!token) return;

    setIsConnecting(true);
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes (60 * 5 seconds)
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      setProgress((pollCount / maxPolls) * 100);

      try {
        // Check if device with this token exists
        const { data, error } = await supabase
          .from('devices')
          .select('id, device_id, name')
          .eq('device_id', token)
          .maybeSingle();

        if (data && !error) {
          // Device found!
          clearInterval(pollInterval);
          setDeviceId(data.id);
          setIsConnected(true);
          setIsConnecting(false);
          
          toast({
            title: "Пристрій підключено!",
            description: `${data.name || data.device_id} успішно зареєстровано`,
          });

          // Redirect after 2 seconds
          setTimeout(() => {
            navigate(`/device/${data.id}`);
          }, 2000);
        }

        // Timeout after 5 minutes
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          setIsConnecting(false);
          setTimeoutReached(true);
          toast({
            title: "Час очікування вийшов",
            description: "Пристрій не підключився протягом 5 хвилин",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [token, navigate]);

  const handleRetry = () => {
    setTimeoutReached(false);
    setProgress(0);
    window.location.reload();
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Невірне посилання</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Токен підключення не знайдено
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const setupUrl = `http://192.168.4.1/?token=${token}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 flex items-center justify-center">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl mb-2">
            {isConnected ? '✅ Підключено!' : 'Підключення пристрою'}
          </CardTitle>
          <CardDescription className="text-base">
            {isConnected 
              ? 'Пристрій успішно підключено. Перенаправлення...'
              : isConnecting
              ? 'Очікування підключення пристрою...'
              : timeoutReached
              ? 'Час очікування вийшов'
              : 'Слідуйте інструкціям нижче для підключення вашого GrowBox'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          {isConnecting && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Очікування підключення пристрою...
                </span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-center text-muted-foreground">
                Пристрій підключиться автоматично після налаштування
              </p>
            </div>
          )}

          {isConnected && (
            <div className="flex flex-col items-center gap-3 p-6 bg-success/10 border border-success/30 rounded-lg">
              <CheckCircle2 className="h-12 w-12 text-success" />
              <p className="text-lg font-semibold text-success">Пристрій успішно підключено!</p>
              <p className="text-sm text-muted-foreground">Перенаправлення на сторінку пристрою...</p>
            </div>
          )}

          {timeoutReached && (
            <div className="space-y-4 p-6 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                Пристрій не підключився протягом 5 хвилин
              </p>
              <p className="text-sm text-muted-foreground">
                Переконайтеся, що пристрій увімкнено і правильно налаштовано Wi-Fi
              </p>
              <Button onClick={handleRetry} className="w-full">
                Спробувати знову
              </Button>
            </div>
          )}

          {!isConnecting && !isConnected && !timeoutReached && (
            <>
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <QRCodeSVG value={setupUrl} size={200} level="H" />
                </div>
              </div>

          {/* Token Display */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Токен підключення:</p>
            <code className="block w-full p-3 bg-background rounded text-sm break-all font-mono">
              {token}
            </code>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Інструкція з підключення
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-1">📲 Підключіться до Wi-Fi GrowBox-Setup</p>
                  <p className="text-sm text-muted-foreground">
                    Знайдіть мережу з назвою <code className="px-2 py-1 bg-background rounded">GrowBox-Setup</code> та підключіться до неї
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-1">🔗 Відскануйте QR-код</p>
                  <p className="text-sm text-muted-foreground">
                    Відскануйте QR-код вище або вручну відкрийте <code className="px-2 py-1 bg-background rounded">{setupUrl}</code> в браузері
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-1">🧩 Налаштуйте Wi-Fi</p>
                  <p className="text-sm text-muted-foreground">
                    Токен буде автоматично заповнений. Введіть дані вашої домашньої Wi-Fi мережі та натисніть "Підключити"
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  4
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-1">✅ Пристрій підключиться автоматично</p>
                  <p className="text-sm text-muted-foreground">
                    Після успішного підключення пристрій автоматично з'явиться у вашому списку пристроїв
                  </p>
                </div>
              </div>
            </div>
          </div>

              {/* Additional Info */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Примітка:</strong> Токен підключення дійсний протягом 24 годин. 
                  Після успішного підключення пристрій автоматично з'явиться у вашому списку пристроїв.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QRConnection;
