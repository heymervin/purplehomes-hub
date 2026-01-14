/**
 * Social Hub Types
 *
 * Central type definitions for the Social Hub feature.
 * Intent is the source of truth for caption schema, allowed templates, and default tone.
 */

// ============ TAB TYPES ============
export type SocialTabId = 'property' | 'personal' | 'professional';

// ============ TONE TYPES ============
export type ToneId =
  | 'professional'
  | 'friendly'
  | 'luxury'
  | 'urgent'
  | 'casual'
  | 'investor';

// ============ IMAGE TEMPLATE TYPES ============
export type ImageTemplateId =
  | 'just-listed'
  | 'just-sold'
  | 'open-house'
  | 'price-drop'
  | 'coming-soon'
  | 'value-tips'
  | 'success-story'
  | 'custom'
  | 'none';

// ============ INTENT TYPES ============
export type IntentId =
  // Property intents
  | 'just-listed'
  | 'sold'
  | 'open-house'
  | 'price-drop'
  | 'coming-soon'
  | 'investment'
  // Personal intents
  | 'life-update'
  | 'milestone'
  | 'lesson-insight'
  | 'behind-the-scenes'
  // Professional intents (absorbs Market Update, Client Story, Community)
  | 'market-update'
  | 'buyer-tips'
  | 'seller-tips'
  | 'investment-insight'
  | 'client-success-story'
  | 'community-spotlight';

// ============ FIELD TYPES ============
export type FieldType = 'text' | 'textarea' | 'datetime' | 'number' | 'select';

export interface IntentField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  maxChars?: number;
  helpText?: string;
  options?: { value: string; label: string }[]; // For select type
}

// ============ DEFINITION TYPES ============
export interface IntentDefinition {
  id: IntentId;
  label: string;
  icon?: string;
  description?: string;
  tab: SocialTabId;
  requiresProperty?: boolean;
  defaultTone?: ToneId;
  // The "schema" drives what extra context fields appear
  fields: IntentField[];
  // Hard constraints for template dropdown
  allowedTemplates: ImageTemplateId[];
}

export interface TemplateDefinition {
  id: ImageTemplateId;
  label: string;
  icon?: string;
  requiresProperty?: boolean;
}

export interface ToneDefinition {
  id: ToneId;
  label: string;
  icon?: string;
  description?: string;
}

export interface TabDefinition {
  id: SocialTabId;
  label: string;
  icon?: string;
  description?: string;
}

// ============ FORM STATE TYPES ============
export interface SocialHubFormState {
  tab: SocialTabId;
  intentId: IntentId;
  templateId: ImageTemplateId;
  toneId: ToneId;
  context: Record<string, string | number | boolean>;
  // Property-specific
  propertyId?: string;
  // Scheduling
  scheduleDate?: string;
  scheduleTime?: string;
  // Custom image
  customImageUrl?: string;
}

// ============ CAPTION GENERATION TYPES ============
export interface CaptionGenerationInput {
  tab: SocialTabId;
  intentId: IntentId;
  toneId: ToneId;
  context: Record<string, string | number | boolean>;
  property?: {
    fullAddress: string;
    city: string;
    state: string;
    price: number;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    propertyType?: string;
    description?: string;
    features?: string[];
  };
}

// ============ BATCH TYPES ============

/**
 * A single batch item with its own intent, tone, template, context, and schedule.
 * This enables "Create × N" behavior where each post can be fully customized.
 *
 * Batch = Create Post × N
 * Each item is independent and can override all defaults.
 */
export interface BatchItem {
  id: string;

  // Tab determines which intents are available
  tab: SocialTabId;

  // Property (optional - only required for property tab intents)
  propertyId?: string;

  // Caption settings (same as Create)
  intentId: IntentId;
  toneId: ToneId;
  templateId: ImageTemplateId;
  context: Record<string, string>;

  // Agent selection (for template generation)
  selectedAgentId?: string;

  // Image selection (for template generation)
  selectedHeroImage?: string;           // User-selected hero image
  selectedSupportingImages?: string[];  // User-selected supporting images (up to 3)

  // Hashtags (auto-initialized based on intent, can be customized)
  selectedHashtags: string[];

  // Scheduling (per-post override)
  scheduledDate: string; // YYYY-MM-DD or empty for "now"
  scheduledTime: string; // HH:mm or empty
  hasCustomSchedule: boolean; // true if user manually edited date/time

  // Generation state
  status: 'draft' | 'pending' | 'generating' | 'ready' | 'failed';
  caption?: string;
  imageUrl?: string;
  error?: string;
  // Validation errors (Phase 2 guardrails)
  validationErrors?: Array<{ rule: string; message: string }>;
}

/**
 * Batch defaults - these are initial values that can be overridden per-post.
 * They are conveniences, not restrictions.
 */
export interface BatchDefaults {
  tab: SocialTabId;
  intentId: IntentId;
  toneId: ToneId;
  templateId: ImageTemplateId;
  startTime: string; // Natural language like "now", "tomorrow 9am"
  intervalHours: number;
}

/**
 * Batch form state for managing multiple posts at once.
 *
 * Phase 3: No shared context. Each item is independent.
 */
export interface BatchFormState {
  items: BatchItem[];
  defaults: BatchDefaults;
  selectedAccounts: string[];
  // Active item for pill-based navigation
  activeItemId: string | null;
}
