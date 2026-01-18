// Team Management Types

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  headshot?: string | null;
  role: string;
  isAdmin: boolean;
  isActive: boolean;
  permissions: string[];
  agentEmail?: string | null;
  agentName?: string | null;
  agentTitle?: string | null;
  createdAt?: string;
}

export type WizardStep = 'user-info' | 'agent-profile' | 'roles-permissions';

export interface UserFormData {
  // Login credentials
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  // Agent profile (for marketing/images)
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  agentTitle: string;
  headshot: string;
  // Permissions
  isAdmin: boolean;
  permissions: PermissionState;
}

// Permission categories with granular sub-permissions
export interface PermissionCategory {
  id: string;
  label: string;
  icon?: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  label: string;
  description?: string;
}

// State for tracking enabled categories and specific permissions
export interface PermissionState {
  [categoryId: string]: {
    enabled: boolean;
    permissions: string[];
  };
}

// Define all permission categories
export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    permissions: [
      { id: 'dashboard-view', label: 'View dashboard' },
      { id: 'dashboard-analytics', label: 'View analytics & reports' },
    ],
  },
  {
    id: 'properties',
    label: 'Properties',
    permissions: [
      { id: 'properties-view', label: 'View properties' },
      { id: 'properties-manage', label: 'Add & edit properties' },
      { id: 'properties-delete', label: 'Delete properties' },
      { id: 'properties-matching', label: 'Use property matching' },
    ],
  },
  {
    id: 'buyers',
    label: 'Buyers',
    permissions: [
      { id: 'buyers-view', label: 'View buyers' },
      { id: 'buyers-manage', label: 'Add & edit buyers' },
      { id: 'buyers-delete', label: 'Delete buyers' },
    ],
  },
  {
    id: 'contacts',
    label: 'Contacts',
    permissions: [
      { id: 'contacts-view', label: 'View contacts' },
      { id: 'contacts-manage', label: 'Add & edit contacts' },
      { id: 'contacts-delete', label: 'Delete contacts' },
      { id: 'contacts-export', label: 'Export contacts' },
    ],
  },
  {
    id: 'pipelines',
    label: 'Pipelines',
    permissions: [
      { id: 'pipeline-property-view', label: 'View property pipeline' },
      { id: 'pipeline-property-manage', label: 'Manage property pipeline' },
      { id: 'pipeline-buyer-view', label: 'View buyer dispositions' },
      { id: 'pipeline-buyer-manage', label: 'Manage buyer dispositions' },
      { id: 'pipeline-deal-view', label: 'View deal pipeline' },
      { id: 'pipeline-deal-manage', label: 'Manage deal pipeline' },
    ],
  },
  {
    id: 'social-hub',
    label: 'Social Hub',
    permissions: [
      { id: 'social-view', label: 'View social posts' },
      { id: 'social-create', label: 'Create social posts' },
      { id: 'social-schedule', label: 'Schedule posts' },
      { id: 'social-publish', label: 'Publish posts' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    permissions: [
      { id: 'documents-view', label: 'View documents' },
      { id: 'documents-manage', label: 'Upload & manage documents' },
      { id: 'documents-delete', label: 'Delete documents' },
    ],
  },
  {
    id: 'public-listings',
    label: 'Public Listings',
    permissions: [
      { id: 'listings-view', label: 'View public listings' },
      { id: 'listings-manage', label: 'Manage listing visibility' },
    ],
  },
  {
    id: 'activity-logs',
    label: 'Activity Logs',
    permissions: [
      { id: 'activity-view', label: 'View activity logs' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    permissions: [
      { id: 'settings-view', label: 'View settings' },
      { id: 'settings-manage', label: 'Manage settings' },
      { id: 'settings-users', label: 'Manage team members' },
    ],
  },
];

// Convert flat permissions array to PermissionState
export function permissionsToState(permissions: string[]): PermissionState {
  const state: PermissionState = {};

  PERMISSION_CATEGORIES.forEach(category => {
    const categoryPermissions = category.permissions
      .filter(p => permissions.includes(p.id))
      .map(p => p.id);

    state[category.id] = {
      enabled: categoryPermissions.length > 0,
      permissions: categoryPermissions,
    };
  });

  return state;
}

// Convert PermissionState to flat permissions array
export function stateToPermissions(state: PermissionState): string[] {
  const permissions: string[] = [];

  Object.entries(state).forEach(([categoryId, categoryState]) => {
    if (categoryState.enabled) {
      // Add the category-level permission for sidebar visibility
      permissions.push(categoryId);
      // Add specific permissions
      permissions.push(...categoryState.permissions);
    }
  });

  return permissions;
}

// Default permissions for new users
export const DEFAULT_USER_PERMISSIONS: PermissionState = {
  dashboard: { enabled: true, permissions: ['dashboard-view'] },
  properties: { enabled: true, permissions: ['properties-view'] },
  contacts: { enabled: true, permissions: ['contacts-view'] },
};
