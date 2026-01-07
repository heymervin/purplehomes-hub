import {
  LayoutDashboard,
  Building2,
  Users,
  UserPlus,
  Home,
  UsersRound,
  FileText,
  Share2,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  Globe,
  LogOut,
  Target,
  Kanban,
  UserCog,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ConnectionIndicator } from '@/components/ui/connection-indicator';
import { useGhlConnection } from '@/hooks/useGhlConnection';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'Public Listings', href: '/listings', icon: Globe },
  { name: 'Property Pipeline', href: '/seller-acquisitions', icon: Home },
  { name: 'Buyer Acquisitions', href: '/acquisitions', icon: UserPlus },
  { name: 'Buyer Management', href: '/buyer-management', icon: UserCog },
  // { name: 'Buyers Pipeline', href: '/buyers', icon: Users }, // Hidden for now
  { name: 'Property Matching', href: '/matching', icon: Target },
  { name: 'Deal Pipeline', href: '/deals', icon: Kanban },
  { name: 'Contacts', href: '/contacts', icon: UsersRound },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Social Hub', href: '/social', icon: Share2 },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Activity Logs', href: '/activity', icon: Activity },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const { user, logout } = useAuthStore();
  const { isConnected, lastChecked, manualReconnect } = useGhlConnection({ autoConnect: true });

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {!sidebarCollapsed && (
            <h1 className="text-xl font-bold gradient-text">PropertyPro</h1>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/' && location.pathname.startsWith(item.href));
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary")} />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Theme Toggle & User Info */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          <ThemeToggle collapsed={sidebarCollapsed} />
          
          {user && !sidebarCollapsed && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          )}
          
          <Button
            variant="ghost"
            size={sidebarCollapsed ? 'icon' : 'sm'}
            onClick={handleLogout}
            className={cn(
              "text-destructive hover:text-destructive hover:bg-destructive/10",
              sidebarCollapsed ? "w-10 h-10" : "w-full justify-start gap-2"
            )}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </Button>
        </div>

        {/* Connection Status */}
        <div className="border-t border-sidebar-border p-4">
          <ConnectionIndicator 
            connected={isConnected} 
            collapsed={sidebarCollapsed}
            lastChecked={lastChecked}
            onReconnect={manualReconnect}
          />
        </div>
      </div>
    </aside>
  );
}
