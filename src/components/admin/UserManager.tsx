// src/components/admin/UserManager.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2 } from 'lucide-react';

// 1. Оновлюємо інтерфейс, щоб 'role' була обов'язковою
interface UserProfileWithRole {
  id: string; // profile id
  user_id: string; // auth.users id
  full_name: string | null;
  email: string;
  role: string; // 'user', 'admin', 'moderator', 'developer', 'superadmin'
}

export function UserManager() {
  const [users, setUsers] = useState<UserProfileWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // 2. ⭐️ ПРАВИЛЬНИЙ ЗАПИТ: 
      // Робимо 2 запити і з'єднуємо вручну.
      // Головне - читати з 'user_roles', а не 'profiles.role'

      // Завантажуємо профілі
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Завантажуємо ролі
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, app_role');

      if (rolesError) throw rolesError;

      // 3. ⭐️ З'єднуємо дані
      const usersWithRoles = (profilesData || []).map((profile: any) => {
        const userRole = (rolesData || []).find((role: any) => role.user_id === profile.user_id);
        return {
          ...profile,
          // 4. ⭐️ Використовуємо 'app_role' з 'user_roles'
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
    setUpdatingId(userId);
    try {
      // 5. ⭐️ Оновлюємо 'user_roles', а не 'profiles'
      const { error } = await supabase
        .from('user_roles')
        .update({ app_role: newRole as any })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Успіх',
        description: `Роль користувача успішно змінено на ${newRole}`,
      });

      // Оновлюємо стан локально для миттєвого відображення
      setUsers(prevUsers =>
        prevUsers.map(u => (u.user_id === userId ? { ...u, role: newRole } : u))
      );
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Помилка',
        description: 'Не вдалося оновити роль користувача',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <TableHead>Поточна Роль</TableHead>
              <TableHead>Змінити Роль</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name || 'Не вказано'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className="capitalize">{user.role}</span>
                </TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleRoleChange(user.user_id, value)}
                    disabled={updatingId === user.user_id} // Блокуємо, поки йде оновлення
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Оберіть роль" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Superadmin</SelectItem>
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
