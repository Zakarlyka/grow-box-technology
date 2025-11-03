import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Users } from 'lucide-react';

interface UserRole {
  user_id: string;
  app_role: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  role?: string;
}

export function UserManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Load profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Load user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      const usersWithRoles = (profilesData || []).map((profile: any) => {
        const userRole = (rolesData || []).find((role: UserRole) => role.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.app_role || 'user',
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Помилка',
        description: 'Не вдалося завантажити список користувачів',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ app_role: newRole as any })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Успіх',
        description: `Роль користувача успішно змінено на ${newRole}`,
      });

      // Reload users to reflect changes
      await loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Помилка',
        description: 'Не вдалося оновити роль користувача',
        variant: 'destructive',
      });
    }
  };

  const getCurrentRole = (user: UserProfile): string => {
    return user.role || 'user';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Керування Користувачами
        </CardTitle>
        <CardDescription>
          Перегляд та зміна ролей користувачів системи
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ім'я</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name || 'Не вказано'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className="capitalize">{getCurrentRole(user)}</span>
                </TableCell>
                <TableCell>
                  <Select
                    value={getCurrentRole(user)}
                    onValueChange={(value) => handleRoleChange(user.user_id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Оберіть роль" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {users.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Користувачів не знайдено
          </div>
        )}
      </CardContent>
    </Card>
  );
}
