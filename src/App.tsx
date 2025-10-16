import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from './hooks/useAuth';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import Index from "./pages/Index";
import { RemoteControlPage } from "./pages/RemoteControlPage";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AddDevice from "./pages/AddDevice";
import Devices from "./pages/Devices";
import DeviceDetail from "./pages/DeviceDetail";
import QRConnection from "./pages/QRConnection";
import { Settings } from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
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
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <Routes>
      <Route 
        path="/auth" 
        element={user ? <Navigate to="/dashboard" replace /> : <Auth />} 
      />
      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/device"
        element={
          <ProtectedRoute>
            <Devices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/device/add-device"
        element={
          <ProtectedRoute>
            <AddDevice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/device/:id"
        element={
          <ProtectedRoute>
            <DeviceDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route path="/qr/:token" element={<QRConnection />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <I18nextProvider i18n={i18n}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </I18nextProvider>
);

export default App;
