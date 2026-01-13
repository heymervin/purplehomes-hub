/**
 * Intent Integrity Check
 *
 * Startup validation to ensure all 16 expected intents are registered.
 *
 * CRITICAL: This runs once at module load time.
 * It logs warnings but NEVER throws or blocks.
 */

import type { IntegrityCheckResult } from './types';

// ============ EXPECTED INTENTS ============

/**
 * The authoritative list of 16 intents from Canonical Prompt Templates v1.2
 *
 * Property (6):
 *   - just-listed, sold, open-house, price-drop, coming-soon, investment
 *
 * Personal (4):
 *   - life-update, milestone, lesson-insight, behind-the-scenes
 *
 * Professional (6):
 *   - market-update, buyer-tips, seller-tips, investment-insight,
 *     client-success-story, community-spotlight
 */
export const EXPECTED_INTENTS = [
  // Property domain
  'just-listed',
  'sold',
  'open-house',
  'price-drop',
  'coming-soon',
  'investment',
  // Personal domain
  'life-update',
  'milestone',
  'lesson-insight',
  'behind-the-scenes',
  // Professional domain
  'market-update',
  'buyer-tips',
  'seller-tips',
  'investment-insight',
  'client-success-story',
  'community-spotlight',
] as const;

export const EXPECTED_INTENT_COUNT = 16;

// ============ INTEGRITY CHECK ============

/**
 * Check that all expected intents are present in the provided intent list.
 * Returns a result object - NEVER throws.
 */
export function checkIntentIntegrity(registeredIntents: string[]): IntegrityCheckResult {
  try {
    const registered = new Set(registeredIntents);
    const expected = new Set(EXPECTED_INTENTS);

    const missingIntents: string[] = [];
    const extraIntents: string[] = [];

    // Check for missing intents
    for (const intent of EXPECTED_INTENTS) {
      if (!registered.has(intent)) {
        missingIntents.push(intent);
      }
    }

    // Check for extra intents (not necessarily bad, but notable)
    for (const intent of registeredIntents) {
      if (!expected.has(intent)) {
        extraIntents.push(intent);
      }
    }

    const passed = missingIntents.length === 0;

    return {
      passed,
      expectedIntents: EXPECTED_INTENT_COUNT,
      foundIntents: registeredIntents.length,
      missingIntents,
      extraIntents,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      passed: false,
      expectedIntents: EXPECTED_INTENT_COUNT,
      foundIntents: 0,
      missingIntents: [...EXPECTED_INTENTS],
      extraIntents: [],
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Run integrity check and log results.
 * Call this at startup with the list of registered intents.
 */
export function runIntegrityCheck(registeredIntents: string[]): IntegrityCheckResult {
  const result = checkIntentIntegrity(registeredIntents);

  try {
    if (result.passed) {
      console.log(
        `[AI-INTEGRITY] ✅ All ${EXPECTED_INTENT_COUNT} intents registered correctly`
      );
    } else {
      console.error(
        `[AI-INTEGRITY] ❌ INTEGRITY CHECK FAILED`
      );
      console.error(
        `[AI-INTEGRITY] Expected: ${EXPECTED_INTENT_COUNT}, Found: ${result.foundIntents}`
      );

      if (result.missingIntents.length > 0) {
        console.error(
          `[AI-INTEGRITY] Missing intents: ${result.missingIntents.join(', ')}`
        );
      }
    }

    if (result.extraIntents.length > 0) {
      console.log(
        `[AI-INTEGRITY] ℹ️ Extra intents found: ${result.extraIntents.join(', ')}`
      );
    }
  } catch {
    // Silently ignore logging errors
  }

  return result;
}

/**
 * Get intent domain mapping for integrity verification
 */
export function getExpectedDomainMapping(): Record<string, 'property' | 'personal' | 'professional'> {
  return {
    // Property domain
    'just-listed': 'property',
    'sold': 'property',
    'open-house': 'property',
    'price-drop': 'property',
    'coming-soon': 'property',
    'investment': 'property',
    // Personal domain
    'life-update': 'personal',
    'milestone': 'personal',
    'lesson-insight': 'personal',
    'behind-the-scenes': 'personal',
    // Professional domain
    'market-update': 'professional',
    'buyer-tips': 'professional',
    'seller-tips': 'professional',
    'investment-insight': 'professional',
    'client-success-story': 'professional',
    'community-spotlight': 'professional',
  };
}
