/**
 * Social Hub Module
 *
 * Export all types, catalog data, and rule helpers
 */

// Types
export * from './types';

// Catalog data
export {
  TABS,
  TONES,
  TEMPLATES,
  INTENTS,
  INTENT_HOOKS,
  INTENT_CTAS,
  // Hashtag exports
  PLATFORM_HASHTAG_RULES,
  INTENT_HASHTAGS,
  BASE_HASHTAGS,
  PREFERRED_HASHTAGS,
  generateLocationHashtags,
  generateHashtagsForIntent,
} from './catalog';

// Rule helpers
export {
  // Tab helpers
  getTabs,
  getTab,
  // Intent helpers
  getIntentsByTab,
  getIntent,
  getDefaultIntent,
  intentRequiresProperty,
  // Template helpers
  getTemplates,
  getAllowedTemplates,
  isTemplateAllowed,
  coerceTemplate,
  getPrimaryTemplate,
  // Tone helpers
  getTones,
  getTone,
  getDefaultTone,
  // Validation helpers
  validateIntentFields,
  getRequiredFields,
  // Migration helpers
  mapLegacyPostTypeToTab,
  mapLegacyIntent,
} from './rules';
