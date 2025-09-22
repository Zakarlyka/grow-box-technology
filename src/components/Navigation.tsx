import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Cpu, 
  BarChart3, 
  Settings,
  Wifi,
  WifiOff
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const { t } = useTranslation();

  const navItems = [
    {
      id: 'dashboard',
      label: t('navigation.dashboard'),
      icon: LayoutDashboard,
    },
    {
      id: 'devices',
      label: t('navigation.devices'),
      icon: Cpu,
    },
    {
      id: 'analytics',
      label: t('navigation.analytics'),
      icon: BarChart3,
    },
  ];

  return (
    <nav className="w-64 bg-card border-r border-border/40">
      <div className="p-6">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 glow-primary' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className={`mr-3 h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                {item.label}
              </Button>
            );
          })}
        </div>

        {/* Connection Status */}
        <div className="mt-8 p-4 rounded-lg bg-gradient-to-br from-success/10 to-accent/10 border border-success/20">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-success/20">
              <Wifi className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-success">MQTT Connected</p>
              <p className="text-xs text-muted-foreground">5 devices online</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}