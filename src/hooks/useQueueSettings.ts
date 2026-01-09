/**
 * useQueueSettings Hook
 *
 * Manages queue settings with localStorage persistence.
 */

import { useState, useEffect, useCallback } from 'react';
import type { QueueSettings } from '@/lib/queue/types';
import {
  DEFAULT_QUEUE_SETTINGS,
  QUEUE_SETTINGS_KEY,
} from '@/lib/queue/constants';

interface UseQueueSettingsReturn {
  settings: QueueSettings;
  updateSettings: (updates: Partial<QueueSettings>) => void;
  resetSettings: () => void;
  isLoaded: boolean;
}

export function useQueueSettings(): UseQueueSettingsReturn {
  const [settings, setSettings] = useState<QueueSettings>(
    DEFAULT_QUEUE_SETTINGS
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(QUEUE_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_QUEUE_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load queue settings:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever settings change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(QUEUE_SETTINGS_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('Failed to save queue settings:', error);
      }
    }
  }, [settings, isLoaded]);

  const updateSettings = useCallback((updates: Partial<QueueSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_QUEUE_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoaded,
  };
}
