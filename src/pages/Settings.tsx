import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeviceSettings } from '@/components/DeviceSettings';
import UserCabinet from '@/components/UserCabinet';
import { Settings as SettingsIcon, Cpu } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';

export function Settings() {
  const [activeTab, setActiveTab] = useState('devices');

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <SettingsIcon className="w-8 h-8" />
              Налаштування
            </h1>
            <p className="text-muted-foreground mt-2">
              Керуйте своїми пристроями та профілем
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="devices" className="flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Пристрої
              </TabsTrigger>
              <TabsTrigger value="cabinet" className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                Кабінет
              </TabsTrigger>
            </TabsList>

            <TabsContent value="devices" className="mt-6">
              <DeviceSettings />
            </TabsContent>

            <TabsContent value="cabinet" className="mt-6">
              <UserCabinet />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}