import { useState } from 'react';
import {
  Search,
  Loader2,
  LayoutDashboard,
  Building2,
  Users,
  UsersRound,
  Kanban,
  Share2,
  FileText,
  Globe,
  Activity,
  Settings,
  ChevronDown,
  ChevronRight,
  Shield,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { PERMISSION_CATEGORIES, type PermissionState } from './types';

interface RolesPermissionsProps {
  isAdmin: boolean;
  permissions: PermissionState;
  onAdminChange: (isAdmin: boolean) => void;
  onPermissionsChange: (permissions: PermissionState) => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
}

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  properties: Building2,
  buyers: Users,
  contacts: UsersRound,
  pipelines: Kanban,
  'social-hub': Share2,
  documents: FileText,
  'public-listings': Globe,
  'activity-logs': Activity,
  settings: Settings,
};

export function RolesPermissions({
  isAdmin,
  permissions,
  onAdminChange,
  onPermissionsChange,
  onBack,
  onSave,
  isSaving,
}: RolesPermissionsProps) {
  const [showGranularPermissions, setShowGranularPermissions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleCategoryEnabled = (categoryId: string, enabled: boolean) => {
    const category = PERMISSION_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;

    onPermissionsChange({
      ...permissions,
      [categoryId]: {
        enabled,
        // If enabling, grant all permissions by default
        permissions: enabled ? category.permissions.map(p => p.id) : [],
      },
    });

    // Auto-expand when enabling
    if (enabled && !expandedCategories.has(categoryId)) {
      setExpandedCategories(prev => new Set([...prev, categoryId]));
    }
  };

  const togglePermission = (categoryId: string, permissionId: string, checked: boolean) => {
    const currentCategory = permissions[categoryId] || { enabled: true, permissions: [] };
    const newPermissions = checked
      ? [...currentCategory.permissions, permissionId]
      : currentCategory.permissions.filter(p => p !== permissionId);

    onPermissionsChange({
      ...permissions,
      [categoryId]: {
        enabled: newPermissions.length > 0,
        permissions: newPermissions,
      },
    });
  };

  // Filter categories based on search
  const filteredCategories = PERMISSION_CATEGORIES.filter(category => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      category.label.toLowerCase().includes(query) ||
      category.permissions.some(p => p.label.toLowerCase().includes(query))
    );
  });

  const handleRoleChange = (role: string) => {
    onAdminChange(role === 'admin');
  };

  return (
    <div className="space-y-6">
      {/* User Role Dropdown - Simple GHL-style */}
      <div className="space-y-2">
        <Label className="text-base font-medium">User Role</Label>
        <Select
          value={isAdmin ? 'admin' : 'user'}
          onValueChange={handleRoleChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </div>
            </SelectItem>
            <SelectItem value="user">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>User</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? 'Admins have full access to all features and can manage team members.'
            : 'Users have limited access based on assigned permissions.'}
        </p>
      </div>

      {/* Granular Permissions Toggle - Only show for non-admin users */}
      {!isAdmin && (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
          <div>
            <Label className="text-sm font-medium">Custom Permissions</Label>
            <p className="text-sm text-muted-foreground">
              Enable to configure specific feature access for this user.
            </p>
          </div>
          <Switch
            checked={showGranularPermissions}
            onCheckedChange={setShowGranularPermissions}
          />
        </div>
      )}

      {/* Granular Permissions Section - Only show if enabled and not admin */}
      {!isAdmin && showGranularPermissions && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Permission Categories */}
          <div className="border rounded-lg divide-y">
            {filteredCategories.map((category) => {
              const Icon = CATEGORY_ICONS[category.id] || Settings;
              const categoryState = permissions[category.id] || { enabled: false, permissions: [] };
              const isExpanded = expandedCategories.has(category.id);

              return (
                <Collapsible
                  key={category.id}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center gap-3 p-4">
                    <Switch
                      checked={categoryState.enabled}
                      onCheckedChange={(checked) => toggleCategoryEnabled(category.id, checked)}
                    />
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-3 flex-1 text-left hover:bg-muted/50 rounded -m-2 p-2"
                      >
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{category.label}</span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                  </div>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 pl-16 space-y-3">
                      {category.permissions.map((permission) => (
                        <div key={permission.id} className="flex items-center gap-3">
                          <Checkbox
                            id={permission.id}
                            checked={categoryState.permissions.includes(permission.id)}
                            onCheckedChange={(checked) =>
                              togglePermission(category.id, permission.id, !!checked)
                            }
                            disabled={!categoryState.enabled}
                          />
                          <Label
                            htmlFor={permission.id}
                            className={cn(
                              'text-sm font-normal cursor-pointer',
                              !categoryState.enabled && 'text-muted-foreground'
                            )}
                          >
                            {permission.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </>
      )}

      {/* Info message when admin or no granular permissions */}
      {isAdmin && (
        <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          Admins automatically have access to all features and permissions.
          No additional configuration needed.
        </div>
      )}

      {!isAdmin && !showGranularPermissions && (
        <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          This user will have standard access to view and manage assigned data.
          Enable "Custom Permissions" above to configure specific feature access.
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
