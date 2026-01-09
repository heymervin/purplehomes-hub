/**
 * usePresets Hook
 *
 * CRUD hook for managing presets with localStorage persistence.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Preset, PresetInput, UsePresetsReturn } from '@/lib/presets/types';
import {
  PRESETS_STORAGE_KEY,
  STARTER_PRESETS,
  MAX_PRESETS,
} from '@/lib/presets/constants';

// Generate unique ID
function generateId(): string {
  return `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create preset from input
function createPresetFromInput(input: PresetInput): Preset {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: input.name,
    postIntent: input.postIntent,
    tone: input.tone,
    hashtags: input.hashtags,
    templateId: input.templateId,
    platforms: input.platforms,
    isDefault: input.isDefault || false,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// Initialize with starter presets
function initializePresets(): Preset[] {
  return STARTER_PRESETS.map((starter) => ({
    ...starter,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export function usePresets(): UsePresetsReturn {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPresets(parsed);
        } else {
          // Initialize with starters if empty
          const starters = initializePresets();
          setPresets(starters);
        }
      } else {
        // First time - create starter presets
        const starters = initializePresets();
        setPresets(starters);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
      const starters = initializePresets();
      setPresets(starters);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever presets change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
      } catch (error) {
        console.error('Failed to save presets:', error);
      }
    }
  }, [presets, isLoaded]);

  // Get default preset
  const defaultPreset = presets.find((p) => p.isDefault) || null;

  // Create preset
  const createPreset = useCallback(
    (input: PresetInput): Preset => {
      if (presets.length >= MAX_PRESETS) {
        throw new Error(`Maximum of ${MAX_PRESETS} presets allowed`);
      }

      const newPreset = createPresetFromInput(input);

      // If this is set as default, unset others
      if (input.isDefault) {
        setPresets((prev) => [
          ...prev.map((p) => ({ ...p, isDefault: false })),
          newPreset,
        ]);
      } else {
        setPresets((prev) => [...prev, newPreset]);
      }

      return newPreset;
    },
    [presets.length]
  );

  // Update preset
  const updatePreset = useCallback(
    (id: string, input: Partial<PresetInput>) => {
      setPresets((prev) =>
        prev.map((preset) => {
          if (preset.id !== id) {
            // If updating another preset to be default, unset this one
            if (input.isDefault) {
              return { ...preset, isDefault: false };
            }
            return preset;
          }

          return {
            ...preset,
            ...input,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  // Delete preset
  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Set as default
  const setAsDefault = useCallback((id: string) => {
    setPresets((prev) =>
      prev.map((preset) => ({
        ...preset,
        isDefault: preset.id === id,
        updatedAt:
          preset.id === id ? new Date().toISOString() : preset.updatedAt,
      }))
    );
  }, []);

  // Clear default
  const clearDefault = useCallback(() => {
    setPresets((prev) =>
      prev.map((preset) => ({
        ...preset,
        isDefault: false,
      }))
    );
  }, []);

  // Increment usage count
  const incrementUsage = useCallback((id: string) => {
    setPresets((prev) =>
      prev.map((preset) => {
        if (preset.id !== id) return preset;
        return {
          ...preset,
          usageCount: preset.usageCount + 1,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  // Get preset by ID
  const getPresetById = useCallback(
    (id: string): Preset | undefined => {
      return presets.find((p) => p.id === id);
    },
    [presets]
  );

  // Duplicate preset
  const duplicatePreset = useCallback(
    (id: string, newName: string): Preset => {
      const original = presets.find((p) => p.id === id);
      if (!original) {
        throw new Error('Preset not found');
      }

      const duplicate = createPresetFromInput({
        name: newName,
        postIntent: original.postIntent,
        tone: original.tone,
        hashtags: [...original.hashtags],
        templateId: original.templateId,
        platforms: [...original.platforms],
        isDefault: false,
      });

      setPresets((prev) => [...prev, duplicate]);
      return duplicate;
    },
    [presets]
  );

  return {
    presets,
    defaultPreset,
    isLoaded,
    createPreset,
    updatePreset,
    deletePreset,
    setAsDefault,
    clearDefault,
    incrementUsage,
    getPresetById,
    duplicatePreset,
  };
}
