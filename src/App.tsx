import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Layout } from '@/components/Layout';

// Pages
import AuthPage from '@/pages/Auth';
import AccountPage from '@/pages/Account';
import DevicesPage from '@/pages/DevicesPage';
import DeviceDetailPage from '@/pages/DeviceDetail';
import LibraryPage from '@/pages/LibraryPage';
import ArticleDetailPage from '@/pages/ArticleDetailPage';
import AdminPage from '@/pages/AdminPage';
import NotFoundPage from '@/pages/NotFound';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Admin Route Component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!role || !['admin', 'superadmin', 'developer'].includes(role)) {
    return <Navigate to="/devices" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { user, loading } = useAuth();

  return (
    <TooltipProvider>
      <Routes>
        {/* Auth Route - redirect if already logged in */}
        <Route
          path="/auth"
          element={
            loading ? (
              <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : user ? (
              <Navigate to="/devices" replace />
            ) : (
              <AuthPage />
            )
          }
        />

        {/* Account Page */}
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />

        {/* Root redirect */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/devices" replace />
            </ProtectedRoute>
          }
        />

        {/* Devices */}
        <Route
          path="/devices"
          element={
            <ProtectedRoute>
              <Layout>
                <DevicesPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/devices/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <DeviceDetailPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Library */}
        <Route
          path="/library"
          element={
            <ProtectedRoute>
              <Layout>
                <LibraryPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/library/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ArticleDetailPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Layout>
                  <AdminPage />
                </Layout>
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <Toaster />
      <Sonner />
    </TooltipProvider>
  );
}

export default App;
