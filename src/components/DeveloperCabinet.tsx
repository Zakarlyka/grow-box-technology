import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Settings, BarChart3, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  role: 'user' | 'developer' | 'admin';
  category: string;
  developer_id?: string;
  created_at: string;
  device_count?: number;
}

const DeveloperCabinet = () => {
  const { user, role } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    if (role === 'developer' || role === 'admin') {
      fetchUsers();
      if (role === 'admin') {
        fetchAllUsers();
      }
    }
  }, [role]);

  const fetchUsers = async () => {
    if (!user) return;
    
    try {
      // First get profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('developer_id', user.id);

      if (profilesError) {
        console.error('Error fetching users:', profilesError);
        return;
      }

      // Then get device counts for each user
      const usersWithDeviceCount = await Promise.all(
        (profilesData || []).map(async (userProfile) => {
          const { count } = await supabase
            .from('devices')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userProfile.user_id);
          
          return {
            ...userProfile,
            device_count: count || 0
          } as UserProfile;
        })
      );

      setUsers(usersWithDeviceCount);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      // First get profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user?.id);

      if (profilesError) {
        console.error('Error fetching all users:', profilesError);
        return;
      }

      // Then get device counts for each user
      const usersWithDeviceCount = await Promise.all(
        (profilesData || []).map(async (userProfile) => {
          const { count } = await supabase
            .from('devices')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userProfile.user_id);
          
          return {
            ...userProfile,
            device_count: count || 0
          } as UserProfile;
        })
      );

      setAllUsers(usersWithDeviceCount);
    } catch (err) {
      console.error('Error fetching all users:', err);
    }
  };

  const assignUserToDeveloper = async () => {
    if (!selectedUser || !user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ developer_id: user.id })
        .eq('user_id', selectedUser);

      if (error) {
        toast({
          title: "Помилка",
          description: "Не вдалося призначити користувача",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Успіх",
        description: "Користувача успішно призначено",
      });

      fetchUsers();
      if (role === 'admin') {
        fetchAllUsers();
      }
      setSelectedUser('');
    } catch (err) {
      console.error('Error assigning user:', err);
    }
  };

  const updateUserCategory = async (userId: string, category: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ category })
        .eq('user_id', userId);

      if (error) {
        toast({
          title: "Помилка",
          description: "Не вдалося оновити категорію",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Успіх",
        description: "Категорію користувача оновлено",
      });

      fetchUsers();
    } catch (err) {
      console.error('Error updating category:', err);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      user: 'default',
      developer: 'secondary',
      admin: 'destructive'
    };
    
    const labels = {
      user: 'Користувач',
      developer: 'Розробник', 
      admin: 'Адміністратор'
    };

    return (
      <Badge variant={colors[role as keyof typeof colors] as any}>
        {labels[role as keyof typeof labels]}
      </Badge>
    );
  };

  if (role !== 'developer' && role !== 'admin') {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Доступ обмежено</h3>
            <p className="text-muted-foreground text-center">
              Цей розділ доступний лише для розробників та адміністраторів
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Завантаження...</div>;
  }

  return (
    <div className="flex-1 p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Кабінет розробника
          </h1>
          <p className="text-muted-foreground mt-1">
            Керування користувачами та системою
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Мої користувачі ({users.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Аналітика
          </TabsTrigger>
          {role === 'admin' && (
            <TabsTrigger value="admin">
              <Settings className="w-4 h-4 mr-2" />
              Адміністрування
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          {users.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Немає закріплених користувачів</h3>
                <p className="text-muted-foreground text-center">
                  Користувачі будуть з'являтися тут після призначення
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {users.map((userProfile) => (
                <Card key={userProfile.id} className="transition-all hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {userProfile.full_name || userProfile.email}
                        </CardTitle>
                        <CardDescription>{userProfile.email}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(userProfile.role)}
                        <Badge variant="outline">{userProfile.category}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Пристроїв</Label>
                        <p className="text-sm font-medium">{userProfile.device_count || 0}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Категорія</Label>
                        <Select
                          value={userProfile.category}
                          onValueChange={(value) => updateUserCategory(userProfile.user_id, value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Стандарт</SelectItem>
                            <SelectItem value="premium">Преміум</SelectItem>
                            <SelectItem value="enterprise">Підприємство</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Реєстрація</Label>
                        <p className="text-sm">
                          {new Date(userProfile.created_at).toLocaleDateString('uk-UA')}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Дії</Label>
                        <Button variant="outline" size="sm" className="h-8 w-full">
                          Деталі
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Всього користувачів</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Активних пристроїв</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.reduce((sum, user) => sum + (user.device_count || 0), 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Преміум користувачів</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter(user => user.category === 'premium').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Цього місяця</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter(user => {
                    const userDate = new Date(user.created_at);
                    const now = new Date();
                    return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
                  }).length}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {role === 'admin' && (
          <TabsContent value="admin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Призначення користувачів</CardTitle>
                <CardDescription>
                  Призначте користувачів до розробників для керування
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label>Виберіть користувача</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Оберіть користувача..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers
                          .filter(u => !u.developer_id && u.role === 'user')
                          .map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.full_name || user.email}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={assignUserToDeveloper}
                      disabled={!selectedUser}
                      className="gradient-primary text-primary-foreground"
                    >
                      Призначити
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Статистика системи</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Всього користувачів</Label>
                    <p className="text-2xl font-bold">{allUsers.length + 1}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Розробників</Label>
                    <p className="text-2xl font-bold">
                      {allUsers.filter(u => u.role === 'developer').length}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Незакріплених</Label>
                    <p className="text-2xl font-bold">
                      {allUsers.filter(u => !u.developer_id && u.role === 'user').length}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Адміністраторів</Label>
                    <p className="text-2xl font-bold">
                      {allUsers.filter(u => u.role === 'admin').length + 1}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default DeveloperCabinet;