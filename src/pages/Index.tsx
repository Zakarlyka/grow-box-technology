import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { Dashboard } from '@/components/Dashboard';
import { Devices } from '@/components/Devices';
import UserCabinet from '@/components/UserCabinet';
import DeveloperCabinet from '@/components/DeveloperCabinet';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { profile } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'devices':
        return <Devices />;
      case 'cabinet':
        return <UserCabinet />;
      case 'developer':
        return profile?.role === 'developer' || profile?.role === 'admin' ? 
          <DeveloperCabinet /> : <UserCabinet />;
      case 'analytics':
        return (
          <div className="flex-1 p-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Аналітика
            </h1>
            <p className="text-muted-foreground mt-2">Розширена аналітика незабаром...</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
