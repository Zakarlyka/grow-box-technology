import { Link, useLocation } from 'react-router-dom';
import { Home, Box, Settings, BookOpen, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function Navigation() {
  const location = useLocation();
  const { role } = useAuth();

  const isActive = (path: string) => {
    if (path === '/devices') {
      return location.pathname === '/devices' || location.pathname.startsWith('/devices/');
    }
    if (path === '/library') {
      return location.pathname === '/library' || location.pathname.startsWith('/library/');
    }
    return location.pathname === path;
  };

  const navItems = [
    { path: '/devices', icon: Home, label: 'Пристрої' },
    { path: '/library', icon: BookOpen, label: 'Бібліотека' },
    { path: '/account', icon: Settings, label: 'Налаштування' },
  ];

  // Add admin link if user has admin role
  if (role && ['admin', 'superadmin', 'developer'].includes(role)) {
    navItems.push({ path: '/admin', icon: Shield, label: 'Адмін' });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border lg:static lg:w-64 lg:border-r lg:border-t-0 z-50">
      <div className="flex justify-around lg:flex-col lg:gap-2 lg:p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col lg:flex-row items-center gap-1 lg:gap-3 p-3 lg:p-3 rounded-lg transition-colors',
                isActive(item.path)
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs lg:text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}