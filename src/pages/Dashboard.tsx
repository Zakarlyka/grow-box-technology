import { Sidebar } from '@/components/Sidebar';
import Devices from './Devices';

const Dashboard = () => {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Devices />
      </main>
    </div>
  );
};

export default Dashboard;
