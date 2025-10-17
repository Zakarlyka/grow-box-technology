import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Thermometer,
  Droplets,
  Sun,
  Sprout,
  Power,
  Fan,
  Lightbulb,
  Plus,
  Settings,
  MoreVertical,
  Activity,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDevices } from '@/hooks/useDevices';
import { useSensorData } from '@/hooks/useSensorData';
import { AddDeviceDialog } from './AddDeviceDialog';

export function Devices() {
  const { t } = useTranslation();
  const { devices, loading, deleteDevice, fetchDevices } = useDevices();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);

  const handleDeleteClick = (deviceId: string) => {
    setDeviceToDelete(deviceId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deviceToDelete) {
      await deleteDevice(deviceToDelete);
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    }
  };

  const ControlCard = ({
    title,
    icon: Icon,
    isActive,
    onToggle,
    deviceId,
    disabled = false
  }: any) => (
    <div className={`p-3 rounded-lg border transition-all duration-200 ${
      isActive
        ? 'bg-gradient-to-r from-accent/20 to-primary/20 border-accent/50 glow-accent'
        : 'bg-muted/20 border-border/50'
    } ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className={`h-4 w-4 ${isActive ? 'text-accent' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={onToggle}
          disabled={disabled}
        />
      </div>
    </div>
  );

  const SensorValue = ({ label, value, unit, icon: Icon, color = 'text-muted-foreground' }: any) => (
    <div className="flex items-center space-x-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}{unit}</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('devices.title')}
          </h1>
          <p className="text-muted-foreground">
            Manage and control your ESP32 devices
          </p>
        </div>
        <Button className="gradient-primary" onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('devices.addDevice')}
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Пристрої не знайдено</p>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Додати перший пристрій
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {devices.map((device) => {
            const lastSeen = device.last_seen 
              ? new Date(device.last_seen).toLocaleString('uk-UA')
              : 'Невідомо';
            
            return (
            <Card key={device.id} className="gradient-card border-border/50 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{device.device_id}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={device.status === 'online' ? 'default' : 'destructive'}
                      className={device.status === 'online' ? 'animate-pulse-glow' : ''}
                    >
                      {device.status === 'online' ? t('devices.online') : t('devices.offline')}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Settings className="mr-2 h-4 w-4" />
                          Налаштування
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Activity className="mr-2 h-4 w-4" />
                          Переглянути логи
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(device.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Видалити
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('devices.lastSeen')}: {lastSeen}
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sensor Data */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                <SensorValue
                  label={t('dashboard.temperature')}
                  value={device.last_temp?.toFixed(1) || '--'}
                  unit="°C"
                  icon={Thermometer}
                  color="text-primary"
                />
                <SensorValue
                  label={t('dashboard.humidity')}
                  value={device.last_hum?.toFixed(0) || '--'}
                  unit="%"
                  icon={Droplets}
                  color="text-accent"
                />
                <SensorValue
                  label={t('dashboard.soilMoisture')}
                  value="--"
                  unit="%"
                  icon={Sprout}
                  color="text-success"
                />
                <SensorValue
                  label={t('dashboard.lightLevel')}
                  value="--"
                  unit="%"
                  icon={Sun}
                  color="text-warning"
                />
              </div>
              <p className="text-muted-foreground text-center py-4 text-sm">
                Керування пристроєм буде доступне після першого підключення
              </p>
            </CardContent>
          </Card>
            );
          })}
        </div>
      )}

      <AddDeviceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onDeviceAdded={fetchDevices}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити пристрій?</AlertDialogTitle>
            <AlertDialogDescription>
              Цю дію неможливо скасувати. Пристрій буде видалено назавжди.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
