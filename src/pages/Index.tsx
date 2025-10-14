import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { Dashboard } from '@/components/Dashboard';
import { RemoteControlPage } from '@/pages/RemoteControlPage';
import Devices from '@/pages/Devices';
import { DeviceManagement } from '@/components/DeviceManagement';
import { AdvancedCharts } from '@/components/AdvancedCharts';
import { Settings } from '@/pages/Settings';
import DeveloperCabinet from '@/components/DeveloperCabinet';
import { AdminPanel } from '@/components/AdminPanel';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isAdmin, isSuperAdmin } = useUserRole();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'my-devices':
        return <Devices />;
      case 'remote-control':
        return <RemoteControlPage />;
      case 'analytics':
        return <AdvancedCharts />;
      case 'settings':
        return <Settings />;
      case 'developer':
        return (isAdmin || isSuperAdmin) ? <DeveloperCabinet /> : <Dashboard />;
      case 'admin':
        return (isAdmin || isSuperAdmin) ? <AdminPanel /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onSettingsClick={() => setActiveTab('settings')}
        onLogoClick={() => setActiveTab('dashboard')}
      />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-auto pb-16 lg:pb-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
