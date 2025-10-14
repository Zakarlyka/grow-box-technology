import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Device {
  id: string;
  device_id: string;
  name: string;
  location: string | null;
  last_temp?: number;
  last_hum?: number;
  updated_at: string;
  status?: string;
}

export default function Devices() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDevices = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setDevices(data || []);
    } catch (err) {
      console.error('Error fetching devices:', err);
      toast.error('Помилка завантаження пристроїв');
    } finally {
      setIsLoading(false);
      if (showRefresh) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDevices();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchDevices();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchDevices(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => navigate('/add-device')}>
              <Plus className="mr-2 h-4 w-4" />
              Додати пристрій
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Всі пристрої</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Немає пристроїв</p>
                <Button 
                  variant="link" 
                  onClick={() => navigate('/add-device')}
                  className="mt-2"
                >
                  Додати перший пристрій
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Last Temp</TableHead>
                      <TableHead>Last Hum</TableHead>
                      <TableHead>Updated At</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell className="font-mono text-sm">
                          {device.device_id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {device.name}
                        </TableCell>
                        <TableCell>
                          {device.location || '-'}
                        </TableCell>
                        <TableCell>
                          {device.last_temp ? `${device.last_temp}°C` : '-'}
                        </TableCell>
                        <TableCell>
                          {device.last_hum ? `${device.last_hum}%` : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(device.updated_at)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            device.status === 'online' 
                              ? 'bg-green-500/10 text-green-500' 
                              : 'bg-gray-500/10 text-gray-500'
                          }`}>
                            {device.status || 'offline'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
