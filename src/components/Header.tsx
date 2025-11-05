import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function Header() {
  const { profile, signOut } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-primary">Grow Box Tech</h1>
      </div>

      <div className="flex items-center gap-4">
        {profile && (
          <div className="hidden sm:block text-sm text-muted-foreground">
            {profile.full_name || profile.email}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          title="Вийти"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}