import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { Dashboard } from '@/components/Dashboard';
import { Devices } from '@/components/Devices';
import { RemoteControlPage } from '@/pages/RemoteControlPage';
import { AdvancedCharts } from '@/components/AdvancedCharts';
import { Settings } from '@/pages/Settings';
import DeveloperCabinet from '@/components/DeveloperCabinet';

const Index = () => {
  const [activeTab, setActiveTab] = useState('devices');
  const { role } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    if (tab === 'admin') {
      navigate('/admin');
    } else if (tab === 'library') {
      navigate('/library');
    } else {
      setActiveTab(tab);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'devices':
        return <Devices />;
      case 'dashboard':
        return <Dashboard />;
      case 'remote-control':
        return <RemoteControlPage />;
      case 'analytics':
        return <AdvancedCharts />;
      case 'settings':
        return <Settings />;
      case 'developer':
        return role === 'developer' || role === 'admin' ? 
          <DeveloperCabinet /> : <Settings />;
      default:
        return <Devices />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
        <main className="flex-1 overflow-auto pb-16 lg:pb-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
