import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Kanban,
  TrendingUp,
  Megaphone,
  Contact,
  GitCompareArrows,
  Globe,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ConnectionIndicator } from '@/components/ui/connection-indicator';
import { useGhlConnection } from '@/hooks/useGhlConnection';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard, permission: 'dashboard' },
    ],
  },
  {
    label: 'Properties',
    items: [
      { name: 'Properties', href: '/properties', icon: Building2, permission: 'properties' },
      { name: 'Public Listings', href: '/listings', icon: Globe, permission: 'properties' },
    ],
  },
  {
    label: 'People',
    items: [
      { name: 'Buyers', href: '/buyer-management', icon: Users, permission: 'buyers' },
      { name: 'Contacts', href: '/contacts', icon: Contact, permission: 'contacts' },
      { name: 'Matching', href: '/matching', icon: GitCompareArrows, permission: 'properties' },
    ],
  },
  {
    label: 'Pipeline',
    items: [
      { name: 'Seller Pipeline', href: '/seller-acquisitions', icon: TrendingUp, permission: 'property-pipeline' },
      { name: 'Deal Pipeline', href: '/deals', icon: Kanban, permission: 'deal-pipeline' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { name: 'Social Hub', href: '/social', icon: Megaphone, permission: 'social-hub' },
      { name: 'Documents', href: '/documents', icon: FileText, permission: 'documents' },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings, permission: 'settings' },
      { name: 'Activity Logs', href: '/activity', icon: Activity, permission: 'activity-logs' },
    ],
  },
];

// Helper to check if user has permission
function hasPermission(user: { isAdmin?: boolean; permissions?: string[]; role?: string } | null, permission?: string): boolean {
  if (!user) return false;
  // Check if user is admin (either via isAdmin flag or legacy role field)
  if (user.isAdmin || user.role === 'admin') return true;
  if (!permission) return true; // No permission required
  // If user has no permissions defined at all (legacy/old session), show all items
  // This handles backwards compatibility for users who logged in before the permissions update
  if (!user.permissions || user.permissions.length === 0) return true;
  return user.permissions.includes(permission);
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const { user, logout } = useAuthStore();
  const { isConnected, lastChecked, manualReconnect } = useGhlConnection({ autoConnect: true });

  // Filter groups and items based on user permissions
  const filteredGroups = navigationGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => hasPermission(user, item.permission)),
    }))
    .filter(group => group.items.length > 0);

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
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white tracking-tight">PH</span>
          </div>
          {!sidebarCollapsed && (
            <span className="font-semibold text-sm text-foreground tracking-tight">Purple Homes</span>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="ml-auto p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Collapse toggle when sidebar is collapsed */}
        {sidebarCollapsed && (
          <div className="flex justify-center px-2 pt-3 pb-1">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {filteredGroups.map((group, groupIndex) => (
            <div key={group.label}>
              {!sidebarCollapsed && (
                <p
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 py-1 mb-1",
                    groupIndex === 0 ? "" : "mt-4"
                  )}
                >
                  {group.label}
                </p>
              )}
              {sidebarCollapsed && groupIndex !== 0 && <div className="pt-3" />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== '/' && location.pathname.startsWith(item.href));

                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 h-9 text-sm font-medium transition-colors border-l-2",
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-primary" : "")} />
                      {!sidebarCollapsed && <span>{item.name}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Theme Toggle & User Info */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
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
