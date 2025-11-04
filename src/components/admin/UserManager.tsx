// src/components/admin/UserManager.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2 } from 'lucide-react';

// 1. Інтерфейс для даних, які повертає RPC
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

  // 2. ⭐️ ОНОВЛЕНА ФУНКЦІЯ ЗАВАНТАЖЕННЯ
  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // 3. ⭐️ ВИКЛИКАЄМО НАШУ НОВУ БЕЗПЕЧНУ RPC-ФУНКЦІЮ
      const { data, error } = await supabase
        .rpc('admin_get_all_users' as any) as { data: UserProfileWithRole[] | null, error: any };

      if (error) throw error;
      
      setUsers((data || []) as UserProfileWithRole[]);

    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: 'Помилка',
        description: `Не вдалося завантажити список користувачів: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 4. ⭐️ ФУНКЦІЯ ЗМІНИ РОЛІ (вона працювала)
  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
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

      // Оновлюємо стан локально
      setUsers(prevUsers =>
        prevUsers.map(u => (u.user_id === userId ? { ...u, role: newRole } : u))
      );
    } catch (error: any) {
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

  // 5. ⭐️ РЕШТА JSX - БЕЗ ЗМІН
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
                    disabled={updatingId === user.user_id}
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
