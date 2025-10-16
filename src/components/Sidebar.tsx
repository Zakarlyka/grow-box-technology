import { LayoutDashboard, BarChart3, Wifi } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const Sidebar = () => {
  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Wifi className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-accent">IoT Platform</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Manage and control your ESP32 devices</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <NavLink
          to="/devices"
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
          to="/analytics"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              isActive
                ? "bg-secondary text-accent"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )
          }
        >
          <BarChart3 className="w-5 h-5" />
          <span>Аналітика</span>
        </NavLink>
      </nav>

      {/* MQTT Status */}
      <div className="p-4 border-t border-border">
        <div className="bg-secondary/30 border border-success/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-success animate-pulse-glow" />
            <div>
              <p className="text-success font-semibold text-sm">MQTT Connected</p>
              <p className="text-xs text-muted-foreground">5 devices online</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
