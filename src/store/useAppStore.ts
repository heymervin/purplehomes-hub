import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConnectionStatus } from '@/types';

interface AppState {
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: Partial<ConnectionStatus>) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  propertiesPerPage: number;
  setPropertiesPerPage: (count: number) => void;
  defaultPlatforms: string[];
  setDefaultPlatforms: (platforms: string[]) => void;
  timezone: string;
  setTimezone: (tz: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      connectionStatus: {
        highLevel: true,
        openAI: true,
        imejis: true,
        lastChecked: new Date().toISOString(),
      },
      setConnectionStatus: (status) =>
        set((state) => ({
          connectionStatus: { ...state.connectionStatus, ...status },
        })),
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      propertiesPerPage: 9,
      setPropertiesPerPage: (count) => set({ propertiesPerPage: count }),
      defaultPlatforms: ['facebook', 'instagram'],
      setDefaultPlatforms: (platforms) => set({ defaultPlatforms: platforms }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      setTimezone: (tz) => set({ timezone: tz }),
    }),
    {
      name: 'app-settings',
    }
  )
);
