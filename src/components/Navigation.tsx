import { useTranslation } from 'react-i18next';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Cpu, 
  BarChart3, 
  Wifi, 
  Settings as SettingsIcon, 
  Code,
  ShieldCheck
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const { t } = useTranslation();
  const { isAdmin, isSuperAdmin } = useUserRole();

  const menuItems = [
    {
      id: 'dashboard',
      label: t('navigation.dashboard'),
      icon: LayoutDashboard,
      showIf: () => true
    },
    {
      id: 'devices',
      label: t('navigation.devices'),
      icon: Cpu,
      showIf: () => true
    },
    {
      id: 'device-management',
      label: 'Device Management',
      icon: Cpu,
      showIf: () => true
    },
    {
      id: 'remote-control',
      label: t('navigation.remoteControl'),
      icon: Wifi,
      showIf: () => true
    },
    {
      id: 'analytics',
      label: t('navigation.analytics'),
      icon: BarChart3,
      showIf: () => true
    },
    {
      id: 'developer',
      label: 'Розробник',
      icon: Code,
      showIf: () => isAdmin || isSuperAdmin
    },
    {
      id: 'admin',
      label: t('navigation.adminPanel'),
      icon: ShieldCheck,
      showIf: () => isAdmin || isSuperAdmin
    }
  ];

  const visibleItems = menuItems.filter(item => item.showIf());

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border/40 bg-card/50 flex-col">
        <div className="p-6">
          <nav className="space-y-2">
            {visibleItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 transition-all duration-200",
                  activeTab === item.id 
                    ? "bg-primary text-primary-foreground shadow-md glow-primary" 
                    : "hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
        
        {/* Connection Status */}
        <div className="mt-auto p-6 border-t border-border/40">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse-glow"></div>
            <Wifi className="w-4 h-4 text-success" />
            <span className="text-muted-foreground">MQTT з'єднано</span>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border/40 p-2 z-30">
        <div className="flex justify-around">
          {visibleItems.slice(0, 4).map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "default" : "ghost"}
              size="sm"
              className={cn(
                "flex-col h-auto py-2 px-3 gap-1 min-w-0",
                activeTab === item.id 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground"
              )}
              onClick={() => onTabChange(item.id)}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-xs truncate">{item.label}</span>
            </Button>
          ))}
        </div>
      </nav>
    </>
  );
}