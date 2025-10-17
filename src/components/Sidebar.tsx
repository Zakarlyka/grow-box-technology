import { LayoutDashboard, BarChart3, Wifi, Sprout, Settings, Shield, List } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Badge } from '@/components/ui/badge';

export const Sidebar = () => {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const [onlineCount, setOnlineCount] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

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
          new Date(d.last_seen).getTime() > Date.now() - 2 * 60 * 1000 // 2 minutes
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeStatus('disconnected');
        }
      });

    // Monitor channel status
    const statusInterval = setInterval(() => {
      const channelState = channel.state;
      if (channelState === 'joined') {
        setRealtimeStatus('connected');
      } else if (channelState === 'errored' || channelState === 'closed') {
        setRealtimeStatus('disconnected');
      }
    }, 5000);

    return () => {
      clearInterval(statusInterval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <NavLink to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Sprout className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-accent">Agro Hogwards</span>
        </NavLink>
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
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/device"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              isActive
                ? "bg-secondary text-accent"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )
          }
        >
          <List className="w-5 h-5" />
          <span>Список пристроїв</span>
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

      {/* Status Footer */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Realtime Connection Status */}
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            {realtimeStatus === 'connected' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-muted-foreground">Realtime</span>
              </>
            ) : realtimeStatus === 'connecting' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                <span className="text-xs text-muted-foreground">Підключення...</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-xs text-muted-foreground">Відключено</span>
              </>
            )}
          </div>
        </div>

        {/* Online Devices Count */}
        <div className="bg-secondary/30 border border-success/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-success" />
              <div>
                <p className="text-success font-semibold text-sm">Онлайн пристроїв</p>
                <p className="text-xs text-muted-foreground">Активні зараз</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              {onlineCount}
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
};
