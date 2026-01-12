/**
 * Social Hub Rules
 *
 * Helper functions for intent-driven logic:
 * - Get intents by tab
 * - Get allowed templates for an intent
 * - Coerce template selection when intent changes
 * - Get default tone for intent
 */

import { INTENTS, TEMPLATES, TONES, TABS } from './catalog';
import {
  IntentId,
  SocialTabId,
  ImageTemplateId,
  ToneId,
  IntentDefinition,
  TemplateDefinition,
  ToneDefinition,
  TabDefinition,
} from './types';

// ============ TAB HELPERS ============

/**
 * Get all tab definitions
 */
export function getTabs(): TabDefinition[] {
  return TABS;
}

/**
 * Get a specific tab definition
 */
export function getTab(tabId: SocialTabId): TabDefinition {
  const found = TABS.find((t) => t.id === tabId);
  if (!found) throw new Error(`Unknown tab: ${tabId}`);
  return found;
}

// ============ INTENT HELPERS ============

/**
 * Get all intents for a specific tab
 */
export function getIntentsByTab(tab: SocialTabId): IntentDefinition[] {
  return INTENTS.filter((i) => i.tab === tab);
}

/**
 * Get a specific intent definition
 */
export function getIntent(intentId: IntentId): IntentDefinition {
  const found = INTENTS.find((i) => i.id === intentId);
  if (!found) throw new Error(`Unknown intent: ${intentId}`);
  return found;
}

/**
 * Get the first (default) intent for a tab
 */
export function getDefaultIntent(tab: SocialTabId): IntentDefinition {
  const intents = getIntentsByTab(tab);
  if (intents.length === 0) throw new Error(`No intents for tab: ${tab}`);
  return intents[0];
}

/**
 * Check if an intent requires a property selection
 */
export function intentRequiresProperty(intentId: IntentId): boolean {
  return getIntent(intentId).requiresProperty === true;
}

// ============ TEMPLATE HELPERS ============

/**
 * Get all templates
 */
export function getTemplates(): TemplateDefinition[] {
  return TEMPLATES;
}

/**
 * Get templates allowed for a specific intent
 */
export function getAllowedTemplates(intentId: IntentId): TemplateDefinition[] {
  const intent = getIntent(intentId);
  return TEMPLATES.filter((t) => intent.allowedTemplates.includes(t.id));
}

/**
 * Check if a template is allowed for an intent
 */
export function isTemplateAllowed(intentId: IntentId, templateId: ImageTemplateId): boolean {
  const intent = getIntent(intentId);
  return intent.allowedTemplates.includes(templateId);
}

/**
 * Coerce template selection to an allowed value
 * If current selection is invalid, returns the first allowed template
 */
export function coerceTemplate(intentId: IntentId, selected?: ImageTemplateId): ImageTemplateId {
  const allowed = getIntent(intentId).allowedTemplates;
  if (selected && allowed.includes(selected)) return selected;
  return allowed[0] ?? 'none';
}

/**
 * Get the primary (first) template for an intent
 * This is the auto-selected template when changing intents
 */
export function getPrimaryTemplate(intentId: IntentId): ImageTemplateId {
  const intent = getIntent(intentId);
  return intent.allowedTemplates[0] ?? 'none';
}

// ============ TONE HELPERS ============

/**
 * Get all tone definitions
 */
export function getTones(): ToneDefinition[] {
  return TONES;
}

/**
 * Get a specific tone definition
 */
export function getTone(toneId: ToneId): ToneDefinition {
  const found = TONES.find((t) => t.id === toneId);
  if (!found) throw new Error(`Unknown tone: ${toneId}`);
  return found;
}

/**
 * Get the default tone for an intent
 */
export function getDefaultTone(intentId: IntentId): ToneId {
  const intent = getIntent(intentId);
  return intent.defaultTone ?? 'professional';
}

// ============ VALIDATION HELPERS ============

/**
 * Validate that a form state has all required fields filled
 */
export function validateIntentFields(
  intentId: IntentId,
  context: Record<string, string | number | boolean>
): { valid: boolean; missingFields: string[] } {
  const intent = getIntent(intentId);
  const missingFields: string[] = [];

  for (const field of intent.fields) {
    if (field.required) {
      const value = context[field.key];
      if (value === undefined || value === null || value === '') {
        missingFields.push(field.label);
      }
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Get all required field keys for an intent
 */
export function getRequiredFields(intentId: IntentId): string[] {
  const intent = getIntent(intentId);
  return intent.fields.filter((f) => f.required).map((f) => f.key);
}

// ============ MIGRATION HELPERS ============

/**
 * Map old post types to new tabs
 * Used for backwards compatibility during migration
 */
export function mapLegacyPostTypeToTab(
  legacyType: 'property' | 'brand' | 'personal' | 'market-update' | 'client-story' | 'community'
): SocialTabId {
  switch (legacyType) {
    case 'property':
      return 'property';
    case 'personal':
    case 'brand':
      return 'personal';
    case 'market-update':
    case 'client-story':
    case 'community':
      return 'professional';
    default:
      return 'property';
  }
}

/**
 * Map old intents to new intent IDs
 * Used for backwards compatibility during migration
 */
export function mapLegacyIntent(legacyIntent: string): IntentId {
  const mapping: Record<string, IntentId> = {
    // Property (unchanged)
    'just-listed': 'just-listed',
    'sold': 'sold',
    'open-house': 'open-house',
    'price-drop': 'price-drop',
    'coming-soon': 'coming-soon',
    'investment': 'investment',
    // Old brand intents -> new
    'personal-value': 'buyer-tips', // Map to buyer-tips as closest match
    'success-story': 'client-success-story',
    // Market update was its own tab
    'market-update': 'market-update',
  };
  return mapping[legacyIntent] ?? 'just-listed';
}
