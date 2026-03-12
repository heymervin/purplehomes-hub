/**
 * Context Wiring Regression Tests
 *
 * These tests ensure that user-provided context is correctly wired into prompts.
 * They prevent regressions where context is collected but ignored by the LLM.
 *
 * Test Strategy:
 * - Personal & Professional intents MUST include user context with strong labeling
 * - Property intents MUST NOT use strong labeling for user context
 * - Context MUST appear in the prompt with intent-specific structure
 */

import { describe, it, expect } from 'vitest';
import {
  parseContextFields,
  getIntentContextSections,
  buildStructuredContext,
  getIntentDomain,
  INTENT_DOMAINS,
  type Property,
} from '../_promptBuilder';

// ============================================================================
// TEST FIXTURES - Unique, unmistakable context phrases
// ============================================================================

const UNIQUE_CONTEXT = {
  // Personal intents - unique phrases that MUST appear in output
  'life-update': 'I just adopted a three-legged rescue dog named Biscuit from the local shelter',
  'milestone': 'Closed my 100th real estate transaction after 5 years in the business',
  'lesson-insight': 'The most important lesson I learned this year is that patience beats urgency every single time',
  'behind-the-scenes': 'Spent 4 hours yesterday staging a home with borrowed furniture from my garage',

  // Professional intents - unique phrases that MUST appear in output
  'market-update': 'Median home prices in Austin dropped 12% month-over-month for the first time since 2019',
  'buyer-tips': 'Always get a sewer scope inspection before closing - it saved my client $47,000 last week',
  'seller-tips': 'The secret to multiple offers is pricing 3% below market value in the first week',
  'investment-insight': 'Cap rates in multifamily have compressed to 4.2% which historically signals a market correction',
  'client-success-story': 'First-time buyer Maria found her dream home after 18 months of searching and 7 rejected offers',
  'community-spotlight': 'Mama Rosa\'s Italian Kitchen on Oak Street has been serving homemade pasta for 42 years',

  // Property intents - context that should NOT strongly influence body copy
  'just-listed': 'This corner lot has amazing sunset views and the neighbor grows organic tomatoes',
  'sold': 'Buyers loved the original hardwood floors and the updated kitchen',
  'open-house': 'Please park on the street - the driveway is being repainted',
  'price-drop': 'Seller is motivated due to job relocation to Seattle',
  'coming-soon': 'Professional photos will be ready by Friday',
  'investment': 'Current tenant pays $1,850/month and lease expires in October',
};

const TEST_PROPERTY: Property = {
  address: '123 Test Street',
  city: 'Austin',
  state: 'TX',
  price: 450000,
  beds: 3,
  baths: 2,
  sqft: 1800,
  propertyType: 'Single Family',
};

// ============================================================================
// HELPER: Check if context appears with strong labeling
// ============================================================================

function hasStrongContextLabeling(output: string): boolean {
  return output.includes('USER-PROVIDED CONTEXT (MUST USE IN BODY COPY)');
}

function hasWeakContextLabeling(output: string): boolean {
  return output.includes('CONTEXT FIELDS:') || output.includes('ADDITIONAL CONTEXT:') || output.includes('ADDITIONAL NOTES:');
}

// ============================================================================
// DOMAIN CLASSIFICATION TESTS
// ============================================================================

describe('Intent Domain Classification', () => {
  it('classifies all 16 canonical intents', () => {
    const canonicalIntents = [
      // Property (6)
      'just-listed', 'sold', 'open-house', 'price-drop', 'coming-soon', 'investment',
      // Personal (4)
      'life-update', 'milestone', 'lesson-insight', 'behind-the-scenes',
      // Professional (6)
      'market-update', 'buyer-tips', 'seller-tips', 'investment-insight', 'client-success-story', 'community-spotlight',
    ];

    for (const intent of canonicalIntents) {
      expect(() => getIntentDomain(intent)).not.toThrow();
      expect(INTENT_DOMAINS[intent]).toBeDefined();
    }
  });

  it('throws for unknown intents (no fallback)', () => {
    expect(() => getIntentDomain('unknown-intent')).toThrow('Unknown intent');
    expect(() => getIntentDomain('')).toThrow('Unknown intent');
  });

  it('classifies Personal intents as "personal"', () => {
    const personalIntents = ['life-update', 'milestone', 'lesson-insight', 'behind-the-scenes'];
    for (const intent of personalIntents) {
      expect(getIntentDomain(intent)).toBe('personal');
    }
  });

  it('classifies Professional intents as "professional"', () => {
    const professionalIntents = ['market-update', 'buyer-tips', 'seller-tips', 'investment-insight', 'client-success-story', 'community-spotlight'];
    for (const intent of professionalIntents) {
      expect(getIntentDomain(intent)).toBe('professional');
    }
  });

  it('classifies Property intents as "property"', () => {
    const propertyIntents = ['just-listed', 'sold', 'open-house', 'price-drop', 'coming-soon', 'investment'];
    for (const intent of propertyIntents) {
      expect(getIntentDomain(intent)).toBe('property');
    }
  });
});

// ============================================================================
// CONTEXT PARSER TESTS
// ============================================================================

describe('Context Parser', () => {
  it('captures raw context when no structured fields found', () => {
    const context = 'This is just a plain text context without any labels';
    const parsed = parseContextFields(context);

    expect(parsed.rawContext).toBe(context);
  });

  it('extracts labeled fields from context string', () => {
    const context = 'Tip Title: How to negotiate like a pro\nTip Details: Start with your best offer';
    const parsed = parseContextFields(context);

    expect(parsed.tipTitle).toBe('How to negotiate like a pro');
    expect(parsed.tipDetails).toBe('Start with your best offer');
  });

  it('returns empty object for empty context', () => {
    expect(parseContextFields('')).toEqual({});
    expect(parseContextFields('   ')).toEqual({});
  });
});

// ============================================================================
// PERSONAL INTENT CONTEXT TESTS (POSITIVE - MUST USE CONTEXT)
// ============================================================================

describe('Personal Intent Context Wiring', () => {
  const personalIntents = ['life-update', 'milestone', 'lesson-insight', 'behind-the-scenes'] as const;

  for (const intent of personalIntents) {
    describe(`${intent}`, () => {
      it('includes user context with STRONG labeling', () => {
        const context = UNIQUE_CONTEXT[intent];
        const parsed = parseContextFields(context);
        const contextSections = getIntentContextSections(intent, parsed);

        expect(hasStrongContextLabeling(contextSections)).toBe(true);
        expect(hasWeakContextLabeling(contextSections)).toBe(false);
      });

      it('includes the actual user-provided content', () => {
        const context = UNIQUE_CONTEXT[intent];
        const parsed = parseContextFields(context);
        const contextSections = getIntentContextSections(intent, parsed);

        // The unique context phrase MUST appear in the output
        expect(contextSections).toContain(context);
      });

      it('uses intent-specific section labels', () => {
        const context = UNIQUE_CONTEXT[intent];
        const parsed = parseContextFields(context);
        const contextSections = getIntentContextSections(intent, parsed);

        // Each personal intent should have its specific label
        const expectedLabels: Record<string, string> = {
          'life-update': 'YOUR UPDATE',
          'milestone': 'MILESTONE',
          'lesson-insight': 'LESSON LEARNED',
          'behind-the-scenes': 'BEHIND THE SCENES',
        };

        expect(contextSections).toContain(expectedLabels[intent]);
      });

      it('produces non-empty context for buildStructuredContext', () => {
        const context = UNIQUE_CONTEXT[intent];
        const parsed = parseContextFields(context);
        const structured = buildStructuredContext(intent, parsed, null);

        expect(structured.length).toBeGreaterThan(0);
        expect(structured).toContain('USER-PROVIDED CONTEXT (MUST USE IN BODY COPY)');
      });
    });
  }
});

// ============================================================================
// PROFESSIONAL INTENT CONTEXT TESTS (POSITIVE - MUST USE CONTEXT)
// ============================================================================

describe('Professional Intent Context Wiring', () => {
  const professionalIntents = [
    'market-update', 'buyer-tips', 'seller-tips',
    'investment-insight', 'client-success-story', 'community-spotlight'
  ] as const;

  for (const intent of professionalIntents) {
    describe(`${intent}`, () => {
      it('includes user context with STRONG labeling', () => {
        const context = UNIQUE_CONTEXT[intent];
        const parsed = parseContextFields(context);
        const contextSections = getIntentContextSections(intent, parsed);

        expect(hasStrongContextLabeling(contextSections)).toBe(true);
        expect(hasWeakContextLabeling(contextSections)).toBe(false);
      });

      it('includes the actual user-provided content', () => {
        const context = UNIQUE_CONTEXT[intent];
        const parsed = parseContextFields(context);
        const contextSections = getIntentContextSections(intent, parsed);

        // The unique context phrase MUST appear in the output
        expect(contextSections).toContain(context);
      });

      it('uses intent-specific section labels', () => {
        const context = UNIQUE_CONTEXT[intent];
        const parsed = parseContextFields(context);
        const contextSections = getIntentContextSections(intent, parsed);

        // Each professional intent should have its specific label
        const expectedLabels: Record<string, string> = {
          'market-update': 'MARKET UPDATE',
          'buyer-tips': 'TIP',
          'seller-tips': 'TIP',
          'investment-insight': 'INSIGHT',
          'client-success-story': 'STORY',
          'community-spotlight': 'SPOTLIGHT',
        };

        expect(contextSections).toContain(expectedLabels[intent]);
      });

      it('produces non-empty context for buildStructuredContext', () => {
        const context = UNIQUE_CONTEXT[intent];
        const parsed = parseContextFields(context);
        const structured = buildStructuredContext(intent, parsed, null);

        expect(structured.length).toBeGreaterThan(0);
        expect(structured).toContain('USER-PROVIDED CONTEXT (MUST USE IN BODY COPY)');
      });
    });
  }
});

// ============================================================================
// PROPERTY INTENT CONTEXT TESTS (NEGATIVE - CONTEXT ISOLATION)
// ============================================================================

describe('Property Intent Context Isolation', () => {
  const propertyIntents = [
    'just-listed', 'sold', 'open-house', 'price-drop', 'coming-soon', 'investment'
  ] as const;

  for (const intent of propertyIntents) {
    describe(`${intent}`, () => {
      it('does NOT use STRONG labeling for user context', () => {
        const context = UNIQUE_CONTEXT[intent];
        const parsed = parseContextFields(context);
        const contextSections = getIntentContextSections(intent, parsed);

        // Property intents should NOT have strong labeling
        expect(hasStrongContextLabeling(contextSections)).toBe(false);
      });

      it('uses WEAK labeling for any context provided', () => {
        const context = UNIQUE_CONTEXT[intent];
        const parsed = parseContextFields(context);
        const contextSections = getIntentContextSections(intent, parsed);

        // If context is provided, it should have weak labeling
        if (contextSections.length > 0) {
          expect(hasWeakContextLabeling(contextSections)).toBe(true);
        }
      });

      it('prioritizes property data over user context in structured output', () => {
        const context = UNIQUE_CONTEXT[intent];
        const parsed = parseContextFields(context);
        const structured = buildStructuredContext(intent, parsed, TEST_PROPERTY);

        // Property data MUST appear
        expect(structured).toContain('PROPERTY DATA');
        expect(structured).toContain(TEST_PROPERTY.address);
        expect(structured).toContain(TEST_PROPERTY.city!);

        // User context should NOT have strong labeling
        expect(structured).not.toContain('USER-PROVIDED CONTEXT (MUST USE IN BODY COPY)');
      });
    });
  }
});

// ============================================================================
// CROSS-DOMAIN ISOLATION TESTS
// ============================================================================

describe('Cross-Domain Context Isolation', () => {
  it('Personal context never gets property-style labeling', () => {
    for (const intent of ['life-update', 'milestone', 'lesson-insight', 'behind-the-scenes']) {
      const context = UNIQUE_CONTEXT[intent as keyof typeof UNIQUE_CONTEXT];
      const parsed = parseContextFields(context);
      const structured = buildStructuredContext(intent, parsed, TEST_PROPERTY);

      // Personal intents should NOT include property data even if provided
      expect(structured).not.toContain('PROPERTY DATA');
      expect(structured).toContain('USER-PROVIDED CONTEXT (MUST USE IN BODY COPY)');
    }
  });

  it('Professional context never gets property-style labeling', () => {
    for (const intent of ['market-update', 'buyer-tips', 'seller-tips', 'investment-insight', 'client-success-story', 'community-spotlight']) {
      const context = UNIQUE_CONTEXT[intent as keyof typeof UNIQUE_CONTEXT];
      const parsed = parseContextFields(context);
      const structured = buildStructuredContext(intent, parsed, TEST_PROPERTY);

      // Professional intents should NOT include property data even if provided
      expect(structured).not.toContain('PROPERTY DATA');
      expect(structured).toContain('USER-PROVIDED CONTEXT (MUST USE IN BODY COPY)');
    }
  });

  it('Property context never gets strong user-context labeling', () => {
    for (const intent of ['just-listed', 'sold', 'open-house', 'price-drop', 'coming-soon', 'investment']) {
      const context = UNIQUE_CONTEXT[intent as keyof typeof UNIQUE_CONTEXT];
      const parsed = parseContextFields(context);
      const structured = buildStructuredContext(intent, parsed, TEST_PROPERTY);

      // Property intents MUST include property data
      expect(structured).toContain('PROPERTY DATA');
      // Property intents MUST NOT use strong context labeling
      expect(structured).not.toContain('USER-PROVIDED CONTEXT (MUST USE IN BODY COPY)');
    }
  });
});

// ============================================================================
// REGRESSION PREVENTION: Empty Context Handling
// ============================================================================

describe('Empty Context Handling', () => {
  it('handles empty context for Personal intents gracefully', () => {
    const parsed = parseContextFields('');
    for (const intent of ['life-update', 'milestone', 'lesson-insight', 'behind-the-scenes']) {
      const contextSections = getIntentContextSections(intent, parsed);
      expect(contextSections).toBe('');
    }
  });

  it('handles empty context for Professional intents gracefully', () => {
    const parsed = parseContextFields('');
    for (const intent of ['market-update', 'buyer-tips', 'seller-tips', 'investment-insight', 'client-success-story', 'community-spotlight']) {
      const contextSections = getIntentContextSections(intent, parsed);
      expect(contextSections).toBe('');
    }
  });

  it('handles empty context for Property intents gracefully', () => {
    const parsed = parseContextFields('');
    for (const intent of ['just-listed', 'sold', 'open-house', 'price-drop', 'coming-soon', 'investment']) {
      const contextSections = getIntentContextSections(intent, parsed);
      expect(contextSections).toBe('');
    }
  });
});
