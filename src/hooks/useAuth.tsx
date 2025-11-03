import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithGitHub: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  profile: any;
  role: string;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState<string>('user');

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      // Завантажити профіль (без ролі)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        setProfile(profileData);
      }

      // Завантажити роль через безпечну функцію
      // @ts-ignore - get_my_role не в автогенерованих типах
      const roleResponse: any = await supabase.rpc('get_my_role');
      
      if (roleResponse.error) {
        console.error('Error fetching role:', roleResponse.error);
        setRole('user'); // Значення за замовчуванням
      } else {
        const userRole = typeof roleResponse.data === 'string' ? roleResponse.data : 'user';
        setRole(userRole);
      }
    } catch (err) {
      console.error('Profile/role fetch error:', err);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to avoid recursion
        if (session?.user) {
          setTimeout(() => {
            refreshProfile();
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          refreshProfile();
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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