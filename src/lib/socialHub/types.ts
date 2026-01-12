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
 * A single batch item with its own intent, tone, template, and context.
 * This enables "Create × N" behavior where each post can be different.
 */
export interface BatchItem {
  id: string;
  propertyId: string;
  intentId: IntentId;
  toneId: ToneId;
  templateId: ImageTemplateId;
  context: Record<string, string>;
  // Generation state
  status: 'pending' | 'generating' | 'ready' | 'failed';
  caption?: string;
  imageUrl?: string;
  error?: string;
  scheduledAt?: Date;
}

/**
 * Batch form state for managing multiple posts at once.
 */
export interface BatchFormState {
  items: BatchItem[];
  sharedContext: string;
  startTime: string;
  intervalHours: number;
  selectedAccounts: string[];
}
