import { LayoutDashboard, BarChart3, Wifi, Sprout, Settings, Shield } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

export const Sidebar = () => {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchOnlineDevices = async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('status, last_seen')
        .eq('user_id', user.id);

      if (!error && data) {
        const online = data.filter(d => 
          d.status === 'online' && 
          new Date(d.last_seen).getTime() > Date.now() - 5 * 60 * 1000
        ).length;
        setOnlineCount(online);
      }
    };

    fetchOnlineDevices();

    const channel = supabase
      .channel('devices-status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'devices',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchOnlineDevices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Sprout className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-accent">IoT Platform</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Керуйте ESP32 GrowBox пристроями</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              isActive
                ? "bg-secondary text-accent"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Пристрої</span>
        </NavLink>

        <NavLink
          to="/dashboard"
          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        >
          <BarChart3 className="w-5 h-5" />
          <span>Аналітика</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              isActive
                ? "bg-secondary text-accent"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )
          }
        >
          <Settings className="w-5 h-5" />
          <span>Налаштування</span>
        </NavLink>

        {(isAdmin || isSuperAdmin) && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                isActive
                  ? "bg-secondary text-accent"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )
            }
          >
            <Shield className="w-5 h-5" />
            <span>Адмін</span>
          </NavLink>
        )}
      </nav>

      {/* MQTT Status */}
      <div className="p-4 border-t border-border">
        <div className="bg-secondary/30 border border-success/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-success animate-pulse-glow" />
            <div>
              <p className="text-success font-semibold text-sm">MQTT Connected</p>
              <p className="text-xs text-muted-foreground">{onlineCount} пристроїв онлайн</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
