import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Session, User } from '@supabase/supabase-js';

// Тип для нашого профілю
interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  units?: 'metric' | 'imperial';
}

// Тип для контексту
interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: string; // 'user', 'admin', 'developer'
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithGitHub: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Створюємо Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Створюємо Provider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string>('user'); // За замовчуванням
  const [loading, setLoading] = useState(true);

  // Функція для завантаження профілю ТА ролі
  const loadProfileAndRole = useCallback(async (sessionUser: User) => {
    try {
      // 1. Завантажуємо профіль
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', sessionUser.id)
        .single();
      
      if (profileError) throw profileError;
      setProfile(profileData);

      // 2. ЗАВАНТАЖУЄМО РОЛЬ (Найважливіше)
      // Викликаємо SQL-функцію, яку ми створили
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_my_role'); // ⭐️ Ось правильний виклик
      
      if (roleError) throw roleError;
      
      setRole(roleData || 'user'); // Встановлюємо роль

    } catch (error) {
      console.error('Помилка завантаження профілю або ролі:', error);
      setRole('user'); // Безпечне значення за замовчуванням
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfileAndRole(user);
  }, [user, loadProfileAndRole]);

  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Помилка getSession:', error);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadProfileAndRole(session.user);
      }
      
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setLoading(true);
          await loadProfileAndRole(session.user);
          setLoading(false);
        }
        
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRole('user');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loadProfileAndRole]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: "Помилка входу",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Успішний вхід",
          description: "Ласкаво просимо до Grow Box Technology!",
        });
      }
      
      return { error };
    } catch (err) {
      console.error('Sign in error:', err);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName || '',
          },
        },
      });
      
      if (error) {
        toast({
          title: "Помилка реєстрації",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Реєстрація успішна",
          description: "Перевірте електронну пошту для підтвердження акаунта.",
        });
      }
      
      return { error };
    } catch (err) {
      console.error('Sign up error:', err);
      return { error: err };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        toast({
          title: "Помилка входу через Google",
          description: error.message,
          variant: "destructive",
        });
      }
      
      return { error };
    } catch (err) {
      console.error('Google sign in error:', err);
      return { error: err };
    }
  };

  const signInWithGitHub = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        toast({
          title: "Помилка входу через GitHub",
          description: error.message,
          variant: "destructive",
        });
      }
      
      return { error };
    } catch (err) {
      console.error('GitHub sign in error:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Помилка виходу",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Успішний вихід",
          description: "До побачення!",
        });
      }
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
    profile,
    role,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};