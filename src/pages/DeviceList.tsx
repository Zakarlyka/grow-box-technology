import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { Header as PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Device {
  id: string;
  device_id: string;
  name: string;
  location: string | null;
  last_seen: string | null;
  status: string;
  user_id: string;
  created_at: string;
}

export default function DeviceList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');

  const isDeviceOnline = (device: Device): boolean => {
    return device.status === 'online' && 
      device.last_seen !== null &&
      new Date(device.last_seen).getTime() > Date.now() - 2 * 60 * 1000;
  };

  const getLastSeenText = (lastSeen: string | null): string => {
    if (!lastSeen) return 'Немає даних';
    
    const now = Date.now();
    const lastSeenTime = new Date(lastSeen).getTime();
    const diffMinutes = Math.floor((now - lastSeenTime) / (60 * 1000));
    
    if (diffMinutes < 1) return 'Щойно';
    if (diffMinutes < 60) return `${diffMinutes} хв тому`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} год тому`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} дн тому`;
  };

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

  useEffect(() => {
    if (!user) return;

    fetchDevices();

    const devicesChannel = supabase
      .channel('devices-list-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
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

  const handleEdit = (device: Device) => {
    setSelectedDevice(device);
    setEditName(device.name);
    setEditLocation(device.location || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedDevice) return;

    try {
      const { error } = await supabase
        .from('devices')
        .update({ 
          name: editName,
          location: editLocation || null
        })
        .eq('id', selectedDevice.id);

      if (error) throw error;

      toast({
        title: "Оновлено",
        description: "Пристрій успішно оновлено",
      });
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Помилка",
        description: "Не вдалося оновити пристрій",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (device: Device) => {
    setSelectedDevice(device);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedDevice) return;

    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', selectedDevice.id);

      if (error) throw error;

      toast({
        title: "Видалено",
        description: "Пристрій успішно видалено",
      });
      setDeleteDialogOpen(false);
      setSelectedDevice(null);
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
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  Будь ласка, увійдіть в систему
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <PageHeader 
            title="Список пристроїв"
            subtitle="Керуйте всіма своїми пристроями"
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
                <Button onClick={() => navigate('/device/add-device')}>
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
                <Button onClick={() => navigate('/device/add-device')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Додати перший пристрій
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Назва</TableHead>
                      <TableHead>Device ID</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Остання активність</TableHead>
                      <TableHead>Локація</TableHead>
                      <TableHead className="text-right">Дії</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => {
                      const isOnline = isDeviceOnline(device);
                      return (
                        <TableRow 
                          key={device.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/device/${device.id}`)}
                        >
                          <TableCell className="font-medium">{device.name}</TableCell>
                          <TableCell className="font-mono text-xs">{device.device_id}</TableCell>
                          <TableCell>
                            <Badge variant={isOnline ? "default" : "secondary"} className={isOnline ? 'bg-success' : ''}>
                              {isOnline ? '🟢 Онлайн' : '🔴 Офлайн'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {getLastSeenText(device.last_seen)}
                          </TableCell>
                          <TableCell>{device.location || '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(device);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(device);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Edit Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Редагувати пристрій</DialogTitle>
                <DialogDescription>
                  Змініть назву або локацію пристрою
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Назва</Label>
                  <Input
                    id="name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Введіть назву"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Локація</Label>
                  <Input
                    id="location"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Введіть локацію (необов'язково)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Скасувати
                </Button>
                <Button onClick={handleSaveEdit}>
                  Зберегти
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Видалити пристрій?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ця дія незворотна. Пристрій "{selectedDevice?.name}" буде видалено разом з усіма його даними.
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