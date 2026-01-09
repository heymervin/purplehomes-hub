/**
 * Presets System Types
 *
 * Type definitions for saved preset configurations.
 * Presets store combinations of Intent + Tone + Hashtags + Template + Platforms.
 */

import type {
  PostIntent,
  CaptionTone,
  Platform,
} from '@/components/social/create-wizard/types';

// ============================================
// PRESET
// ============================================

export interface Preset {
  id: string;
  name: string;

  // Caption settings
  postIntent: PostIntent;
  tone: CaptionTone;

  // Hashtags
  hashtags: string[];

  // Image template
  templateId: string | null;

  // Platforms to post to
  platforms: Platform[];

  // Metadata
  isDefault: boolean; // Show star, load by default
  usageCount: number; // Track popularity
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

// ============================================
// PRESET INPUT (for creating/updating)
// ============================================

export interface PresetInput {
  name: string;
  postIntent: PostIntent;
  tone: CaptionTone;
  hashtags: string[];
  templateId: string | null;
  platforms: Platform[];
  isDefault?: boolean;
}

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UsePresetsReturn {
  presets: Preset[];
  defaultPreset: Preset | null;
  isLoaded: boolean;

  // CRUD
  createPreset: (input: PresetInput) => Preset;
  updatePreset: (id: string, input: Partial<PresetInput>) => void;
  deletePreset: (id: string) => void;

  // Actions
  setAsDefault: (id: string) => void;
  clearDefault: () => void;
  incrementUsage: (id: string) => void;

  // Utilities
  getPresetById: (id: string) => Preset | undefined;
  duplicatePreset: (id: string, newName: string) => Preset;
}
