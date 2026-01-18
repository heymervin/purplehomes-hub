import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const AUTH_API_BASE = '/api/auth';

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  isAdmin?: boolean;
  isActive?: boolean;
  permissions?: string[];
  phone?: string | null;
  agentEmail?: string | null;
  headshot?: string | null;
  createdAt?: string;
}

export interface TeamAgent {
  id: string;
  name: string;
  phone: string;
  email: string;
  headshot: string;
  title?: string;
}

// Available permissions that can be assigned to users
export const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard', description: 'View dashboard and analytics' },
  { id: 'properties', label: 'Properties', description: 'View and manage properties' },
  { id: 'contacts', label: 'Contacts', description: 'View and manage contacts' },
  { id: 'buyers', label: 'Buyers', description: 'View and manage buyers' },
  { id: 'property-pipeline', label: 'Property Pipeline', description: 'Manage seller acquisition pipeline' },
  { id: 'buyer-dispositions', label: 'Buyer Dispositions', description: 'Manage buyer disposition pipeline' },
  { id: 'deal-pipeline', label: 'Deal Pipeline', description: 'Manage deal acquisition pipeline' },
  { id: 'social-hub', label: 'Social Hub', description: 'Create and schedule social posts' },
  { id: 'documents', label: 'Documents', description: 'View and manage documents' },
  { id: 'public-listings', label: 'Public Listings', description: 'View public property listings' },
  { id: 'activity-logs', label: 'Activity Logs', description: 'View system activity logs' },
  { id: 'settings', label: 'Settings', description: 'Access system settings' },
  { id: 'manage-users', label: 'Manage Users', description: 'Create and manage user accounts' },
] as const;

interface AuthResponse {
  success: boolean;
  user: User;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupData {
  email: string;
  password: string;
  name: string;
  role?: string;
}

const AUTH_STORAGE_KEY = 'purplehomes_auth_user';

/**
 * Fetch wrapper for Auth API
 */
const fetchAuth = async <T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(`${AUTH_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Auth API Error' }));
    throw new Error(error.error || `Auth API Error: ${response.status}`);
  }

  return response.json();
};

/**
 * Get stored user from localStorage
 */
export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

/**
 * Store user in localStorage
 */
const storeUser = (user: User | null) => {
  if (typeof window === 'undefined') return;

  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

/**
 * Hook to get the current authenticated user
 */
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['auth-user'],
    queryFn: () => getStoredUser(),
    staleTime: Infinity,
  });
};

/**
 * Hook for user login
 */
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      return fetchAuth('?action=login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },
    onSuccess: (data) => {
      storeUser(data.user);
      queryClient.setQueryData(['auth-user'], data.user);
    },
  });
};

/**
 * Hook for user signup
 */
export const useSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SignupData): Promise<AuthResponse> => {
      return fetchAuth('?action=signup', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      storeUser(data.user);
      queryClient.setQueryData(['auth-user'], data.user);
    },
  });
};

/**
 * Hook for user logout
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      storeUser(null);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth-user'], null);
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
    },
  });
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return getStoredUser() !== null;
};

/**
 * Check if user has a specific role
 */
export const hasRole = (role: string): boolean => {
  const user = getStoredUser();
  return user?.role === role;
};

/**
 * Check if current user is an admin
 */
export const isAdmin = (): boolean => {
  const user = getStoredUser();
  return user?.isAdmin === true;
};

/**
 * Check if current user has a specific permission
 */
export const hasPermission = (permission: string): boolean => {
  const user = getStoredUser();
  if (!user) return false;
  if (user.isAdmin) return true; // Admins have all permissions
  return user.permissions?.includes(permission) ?? false;
};

// ==================== USER MANAGEMENT ====================

interface UsersResponse {
  success: boolean;
  users: User[];
}

interface CreateUserData {
  email: string;
  name: string;
  isAdmin?: boolean;
  permissions?: string[];
  phone?: string;
  agentEmail?: string;
  headshot?: string;
}

interface CreateUserResponse {
  success: boolean;
  user: User;
  tempPassword: string;
}

interface UpdateUserData {
  name?: string;
  isAdmin?: boolean;
  isActive?: boolean;
  permissions?: string[];
  phone?: string;
  agentEmail?: string;
  headshot?: string;
  resetPassword?: boolean;
}

interface UpdateUserResponse {
  success: boolean;
  user: User;
  tempPassword?: string;
}

interface AgentsResponse {
  success: boolean;
  agents: TeamAgent[];
}

/**
 * Hook to fetch all users (admin only)
 * @param enabled - Whether to enable the query (default: true). Set to false to prevent fetching.
 */
export const useUsers = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {
      const response = await fetchAuth<UsersResponse>('?action=list-users');
      return response.users;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled,
  });
};

/**
 * Hook to create a new user (admin only)
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserData): Promise<CreateUserResponse> => {
      return fetchAuth('?action=create-user', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
};

/**
 * Hook to update a user (admin only)
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateUserData & { id: string }): Promise<UpdateUserResponse> => {
      return fetchAuth(`?action=update-user&id=${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
};

/**
 * Hook to delete/deactivate a user (admin only)
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      return fetchAuth(`?action=delete-user&id=${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
};

/**
 * Hook to fetch agents (admin users with profiles) for Social Hub dropdown
 */
export const useAgents = () => {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async (): Promise<TeamAgent[]> => {
      const response = await fetchAuth<AgentsResponse>('?action=get-agents');
      return response.agents;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to update own agent profile (admin only)
 */
export const useUpdateAgentProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { userId: string; phone?: string; agentEmail?: string; headshot?: string }) => {
      return fetchAuth('?action=update-profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
