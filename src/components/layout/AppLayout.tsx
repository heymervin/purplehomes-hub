import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main 
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
