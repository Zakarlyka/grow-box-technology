import { Sidebar } from '@/components/Sidebar';
import { AdminPanel } from '@/components/AdminPanel';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

const Admin = () => {
  const { isAdmin, isSuperAdmin, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Панель адміністратора</h1>
            <p className="text-muted-foreground mt-2">
              Керування користувачами та пристроями системи
            </p>
          </div>
          <AdminPanel />
        </div>
      </main>
    </div>
  );
};

export default Admin;
