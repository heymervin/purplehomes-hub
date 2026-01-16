/**
 * Caption Generation Stress Tests
 *
 * Tests the caption generation API across:
 * - All 6 tones (professional, casual, urgent, friendly, luxury, investor)
 * - All 3 domains (property, personal, professional intents)
 * - With and without rich context
 *
 * Validates:
 * - No border characters (═══, ───) in output
 * - Body copy has substance from user context
 * - Tone differentiation is clear
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  parseContextFields,
  getIntentDomain,
  buildStructuredContext,
  getIntentHook,
  getIntentCTA,
  getIntentContextSections,
  INTENT_DOMAINS,
  type Property,
} from './promptBuilder';

// ============================================================================
// UNIT TESTS - Pure functions from promptBuilder.ts
// ============================================================================

describe('promptBuilder unit tests', () => {
  describe('getIntentDomain', () => {
    it('classifies property intents correctly', () => {
      const propertyIntents = ['just-listed', 'sold', 'open-house', 'investment', 'coming-soon', 'price-drop'];
      for (const intent of propertyIntents) {
        expect(getIntentDomain(intent)).toBe('property');
      }
    });

    it('classifies personal intents correctly', () => {
      const personalIntents = ['life-update', 'milestone', 'lesson-insight', 'behind-the-scenes'];
      for (const intent of personalIntents) {
        expect(getIntentDomain(intent)).toBe('personal');
      }
    });

    it('classifies professional intents correctly', () => {
      const professionalIntents = ['market-update', 'buyer-tips', 'seller-tips', 'investment-insight', 'client-success-story', 'community-spotlight'];
      for (const intent of professionalIntents) {
        expect(getIntentDomain(intent)).toBe('professional');
      }
    });

    it('throws for unknown intents', () => {
      expect(() => getIntentDomain('unknown-intent')).toThrow('Unknown intent');
    });
  });

  describe('parseContextFields', () => {
    it('parses simple key:value pairs', () => {
      const context = 'Headline: Rates hit 6%\nStats: 15% YoY increase';
      const parsed = parseContextFields(context);
      expect(parsed.headline).toBe('Rates hit 6%');
      expect(parsed.stats).toBe('15% YoY increase');
    });

    it('treats unstructured text as rawContext', () => {
      const context = 'Beautiful renovated kitchen with granite counters';
      const parsed = parseContextFields(context);
      expect(parsed.rawContext).toBe('Beautiful renovated kitchen with granite counters');
    });

    it('handles empty context', () => {
      const parsed = parseContextFields('');
      expect(Object.keys(parsed)).toHaveLength(0);
    });

    it('parses milestone context correctly', () => {
      const context = 'Milestone: 100 homes sold\nWhy it matters: A decade of hard work';
      const parsed = parseContextFields(context);
      expect(parsed.milestone).toBe('100 homes sold');
      expect(parsed.whyItMatters).toBe('A decade of hard work');
    });

    it('parses client success story fields', () => {
      const context = 'Challenge: First-time buyers priced out of market\nSolution: Found off-market deal\nResult: Under budget by $20K';
      const parsed = parseContextFields(context);
      expect(parsed.challenge).toBe('First-time buyers priced out of market');
      expect(parsed.solution).toBe('Found off-market deal');
      expect(parsed.result).toBe('Under budget by $20K');
    });
  });

  describe('buildStructuredContext', () => {
    const sampleProperty: Property = {
      address: '123 Main St',
      city: 'Atlanta',
      price: 285000,
      beds: 3,
      baths: 2,
      sqft: 1800,
      description: 'Renovated kitchen, new roof, corner lot',
    };

    it('includes property data for property domain', () => {
      const context = buildStructuredContext('just-listed', {}, sampleProperty);
      expect(context).toContain('PROPERTY DATA:');
      expect(context).toContain('123 Main St');
      expect(context).toContain('$285,000');
      expect(context).toContain('Renovated kitchen');
    });

    it('excludes property data for personal domain', () => {
      const context = buildStructuredContext('life-update', { rawContext: 'Just got my license!' }, null);
      expect(context).not.toContain('PROPERTY DATA:');
      expect(context).toContain('YOUR UPDATE');
    });

    it('labels personal/professional context strongly', () => {
      const context = buildStructuredContext('milestone', { milestone: '100 homes!' }, null);
      expect(context).toContain('USER-PROVIDED CONTEXT (MUST USE IN BODY COPY)');
    });
  });

  describe('getIntentHook', () => {
    it('generates property hooks with city', () => {
      const hook = getIntentHook('just-listed', {}, { city: 'Atlanta' } as Property);
      expect(hook).toBe('🏠 JUST LISTED in Atlanta!');
    });

    it('generates milestone hook with milestone text', () => {
      const hook = getIntentHook('milestone', { milestone: '100 homes sold' }, null);
      expect(hook).toBe('🏆 100 homes sold');
    });

    it('uses headline for market-update', () => {
      const hook = getIntentHook('market-update', { headline: 'Rates Drop to 5.9%' }, null);
      expect(hook).toBe('📊 Rates Drop to 5.9%');
    });
  });

  describe('getIntentCTA', () => {
    it('returns appropriate CTAs for each intent', () => {
      expect(getIntentCTA('just-listed')).toContain('DM');
      expect(getIntentCTA('milestone')).toContain('Thank you');
      expect(getIntentCTA('buyer-tips')).toContain('buying');
    });
  });

  describe('getIntentContextSections', () => {
    it('formats personal intents correctly', () => {
      const sections = getIntentContextSections('life-update', { story: 'Got my broker license today!' });
      expect(sections).toContain('YOUR UPDATE');
      expect(sections).toContain('Got my broker license today!');
    });

    it('formats professional intents correctly', () => {
      const sections = getIntentContextSections('buyer-tips', { tipTitle: 'Save 20% on closing', tipBody: 'Negotiate seller credits' });
      expect(sections).toContain('TIP TITLE: Save 20% on closing');
      expect(sections).toContain('TIP DETAILS:');
    });
  });
});

// ============================================================================
// INTEGRATION TEST DATA - Sample payloads for API testing
// ============================================================================

export const TEST_CASES = {
  // Property domain tests
  propertyJustListed: {
    property: {
      address: '123 Peachtree St',
      city: 'Atlanta',
      state: 'GA',
      price: 285000,
      downPayment: 8550,
      monthlyPayment: 1895,
      beds: 3,
      baths: 2,
      sqft: 1800,
      propertyType: 'Single Family',
      description: 'Completely renovated kitchen with granite counters and stainless appliances. New roof in 2023. Corner lot with mature oak trees. Owner financing available with 3% down.',
    },
    context: 'Completely renovated kitchen with granite counters and stainless appliances. New roof in 2023. Corner lot with mature oak trees. Owner financing available with 3% down.',
    postIntent: 'just-listed',
    platform: 'instagram',
    agent: { firstName: 'Marcus', company: 'Purple Homes' },
  },

  propertyInvestment: {
    property: {
      address: '456 Maple Ave',
      city: 'Decatur',
      state: 'GA',
      price: 185000,
      beds: 4,
      baths: 2,
      sqft: 2100,
      arv: 260000,
      repairCost: 35000,
      description: 'BRRRR opportunity. Needs cosmetic work only - kitchen, bathrooms, paint. Strong rental comps at $1,800/mo. Quiet street, near MARTA.',
    },
    context: 'BRRRR opportunity. Needs cosmetic work only - kitchen, bathrooms, paint. Strong rental comps at $1,800/mo. Quiet street, near MARTA.',
    postIntent: 'investment',
    platform: 'instagram',
    agent: { firstName: 'Marcus', company: 'Purple Homes' },
  },

  // Personal domain tests
  personalMilestone: {
    property: null,
    context: 'Milestone: 100 homes closed\nWhy it matters: 10 years of early mornings, late nights, and never giving up. Started from zero. Now here.',
    postIntent: 'milestone',
    platform: 'instagram',
    agent: { firstName: 'Marcus', company: 'Purple Homes' },
  },

  personalLifeUpdate: {
    property: null,
    context: 'Story: Just passed my broker exam on the first try! After 6 months of studying while working full-time, it finally paid off.',
    postIntent: 'life-update',
    platform: 'instagram',
    agent: { firstName: 'Marcus', company: 'Purple Homes' },
  },

  // Professional domain tests
  professionalMarketUpdate: {
    property: null,
    context: 'Headline: Atlanta Inventory Hits 4-Year Low\nStats: Active listings down 23% YoY, median price up 8%\nSo what: Buyers need to move fast. Sellers have leverage.',
    postIntent: 'market-update',
    platform: 'instagram',
    agent: { firstName: 'Marcus', company: 'Purple Homes' },
  },

  professionalBuyerTips: {
    property: null,
    context: 'Tip Title: Skip the Bidding War\nTip Details: 40% of homes that go pending fall through. Instead of competing on hot listings, build relationships with listing agents and ask to be notified when deals fall apart.',
    postIntent: 'buyer-tips',
    platform: 'instagram',
    agent: { firstName: 'Marcus', company: 'Purple Homes' },
  },

  professionalClientSuccess: {
    property: null,
    context: 'Challenge: First-time buyers kept losing to cash offers\nSolution: Networked with wholesalers to find off-market deals\nResult: Closed $40K under market, no competition',
    postIntent: 'client-success-story',
    platform: 'instagram',
    agent: { firstName: 'Marcus', company: 'Purple Homes' },
  },
};

export const ALL_TONES = ['professional', 'casual', 'urgent', 'friendly', 'luxury', 'investor'] as const;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function validateNoBorderCharacters(caption: string): { valid: boolean; found: string[] } {
  const borderPatterns = [
    /═+/g,  // Box drawing double horizontal
    /─+/g,  // Box drawing single horizontal
    /\*{3,}/g, // Three or more asterisks
  ];

  const found: string[] = [];
  for (const pattern of borderPatterns) {
    const matches = caption.match(pattern);
    if (matches) {
      found.push(...matches);
    }
  }

  return { valid: found.length === 0, found };
}

export function validateHasSubstance(caption: string, context: string): { score: number; missing: string[] } {
  // Extract key phrases from context that should appear in caption
  const contextWords = context.toLowerCase();
  const keyPhrases: string[] = [];

  // Look for specific features mentioned
  if (contextWords.includes('renovated kitchen')) keyPhrases.push('kitchen');
  if (contextWords.includes('granite')) keyPhrases.push('granite');
  if (contextWords.includes('new roof')) keyPhrases.push('roof');
  if (contextWords.includes('owner financing')) keyPhrases.push('financing');
  if (contextWords.includes('corner lot')) keyPhrases.push('corner');
  if (contextWords.includes('100 homes')) keyPhrases.push('100');
  if (contextWords.includes('broker')) keyPhrases.push('broker');
  if (contextWords.includes('inventory')) keyPhrases.push('inventory');
  if (contextWords.includes('arv')) keyPhrases.push('arv');
  if (contextWords.includes('brrrr')) keyPhrases.push('brrrr');

  if (keyPhrases.length === 0) {
    return { score: 1, missing: [] }; // No specific phrases to check
  }

  const captionLower = caption.toLowerCase();
  const missing = keyPhrases.filter(phrase => !captionLower.includes(phrase));
  const score = (keyPhrases.length - missing.length) / keyPhrases.length;

  return { score, missing };
}

export function validateToneDifferentiation(captions: Record<string, string>): { distinct: boolean; similarities: string[] } {
  const similarities: string[] = [];
  const tones = Object.keys(captions);

  // Compare each pair of captions for too much similarity
  for (let i = 0; i < tones.length; i++) {
    for (let j = i + 1; j < tones.length; j++) {
      const tone1 = tones[i];
      const tone2 = tones[j];
      const caption1 = captions[tone1].toLowerCase();
      const caption2 = captions[tone2].toLowerCase();

      // Check if captions are too similar (basic check - same first sentence)
      const firstSentence1 = caption1.split(/[.!?]/)[1]?.trim(); // Skip hook
      const firstSentence2 = caption2.split(/[.!?]/)[1]?.trim();

      if (firstSentence1 && firstSentence2 && firstSentence1 === firstSentence2) {
        similarities.push(`${tone1} vs ${tone2}: identical first sentence`);
      }
    }
  }

  return { distinct: similarities.length === 0, similarities };
}

// ============================================================================
// DESCRIBE OUTPUT - For manual review after API calls
// ============================================================================

export function describeCaption(caption: string, tone: string, testCase: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${testCase} | TONE: ${tone.toUpperCase()}`);
  console.log(`${'='.repeat(60)}`);
  console.log(caption);
  console.log(`${'='.repeat(60)}\n`);
}
