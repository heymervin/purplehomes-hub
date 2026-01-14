/**
 * Caption Prompt Builder - Extracted for testability
 *
 * This module contains the pure functions used to build prompts.
 * These are extracted from api/ai/index.ts for unit testing.
 */

// ============================================================================
// TYPES
// ============================================================================

export type IntentDomain = 'property' | 'personal' | 'professional';

export interface Property {
  address?: string;
  city?: string;
  state?: string;
  price?: number;
  downPayment?: number;
  monthlyPayment?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
  description?: string;
  arv?: number;
  repairCost?: number;
}

export interface CaptionRequest {
  property: Property | null;
  context: string;
  postIntent: string;
  tone: string;
  platform: string;
}

// ============================================================================
// INTENT DOMAIN CLASSIFICATION
// ============================================================================

export const INTENT_DOMAINS: Record<string, IntentDomain> = {
  // Property intents
  'just-listed': 'property',
  'sold': 'property',
  'under-contract': 'property',
  'price-reduced': 'property',
  'price-drop': 'property',
  'open-house': 'property',
  'coming-soon': 'property',
  'investment': 'property',
  // Personal intents
  'life-update': 'personal',
  'milestone': 'personal',
  'lesson-insight': 'personal',
  'behind-the-scenes': 'personal',
  // Professional intents
  'market-update': 'professional',
  'buyer-tips': 'professional',
  'seller-tips': 'professional',
  'investment-insight': 'professional',
  'client-success-story': 'professional',
  'community-spotlight': 'professional',
  // Legacy
  'personal-value': 'professional',
  'success-story': 'professional',
  'general': 'professional',
};

export function getIntentDomain(intent: string): IntentDomain {
  const domain = INTENT_DOMAINS[intent];
  if (!domain) {
    throw new Error(`Unknown intent: ${intent}. No domain fallback allowed.`);
  }
  return domain;
}

// ============================================================================
// CONTEXT PARSER
// ============================================================================

export function parseContextFields(contextString: string): Record<string, string> {
  const fields: Record<string, string> = {};

  if (!contextString) return fields;

  // Parse "Label: Value" format from context string
  const lines = contextString.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const rawKey = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      // Normalize key to camelCase
      const key = rawKey
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
        .replace(/\s/g, '');

      if (key && value) {
        fields[key] = value;
      }
    }
  }

  // Also try to extract known field patterns
  // These patterns ONLY match when they appear at the START of a line as explicit labels
  // This prevents false matches where keywords appear naturally in prose
  const knownPatterns: Record<string, RegExp> = {
    story: /^(?:story|update|what'?s? your update)\s*:\s*(.+)/im,
    milestone: /^(?:milestone|achievement)\s*:\s*(.+)/im,
    whyItMatters: /^(?:why it matters|reflection)\s*:\s*(.+)/im,
    lesson: /^(?:lesson|what did you learn)\s*:\s*(.+)/im,
    takeaway: /^(?:takeaway|key point)\s*:\s*(.+)/im,
    bts: /^(?:behind the scenes|bts)\s*:\s*(.+)/im,
    tipTitle: /^(?:tip title|title)\s*:\s*(.+)/im,
    tipBody: /^(?:tip details|tip body|details)\s*:\s*(.+)/im,
    headline: /^(?:headline|market headline)\s*:\s*(.+)/im,
    stats: /^(?:stats|key stats)\s*:\s*(.+)/im,
    soWhat: /^(?:so what|why it matters|impact)\s*:\s*(.+)/im,
    insight: /^(?:insight|analysis)\s*:\s*(.+)/im,
    metric: /^(?:metric|numbers)\s*:\s*(.+)/im,
    challenge: /^(?:challenge|client challenge|situation)\s*:\s*(.+)/im,
    solution: /^(?:solution|how you helped)\s*:\s*(.+)/im,
    result: /^(?:result|outcome)\s*:\s*(.+)/im,
    spotlight: /^(?:spotlight|featuring)\s*:\s*(.+)/im,
    details: /^(?:details|why they matter)\s*:\s*(.+)/im,
    cta: /^(?:cta|call to action)\s*:\s*(.+)/im,
  };

  for (const [key, pattern] of Object.entries(knownPatterns)) {
    if (!fields[key]) {
      const match = contextString.match(pattern);
      if (match && match[1]) {
        fields[key] = match[1].trim();
      }
    }
  }

  // If no structured fields found, treat entire context as main content
  if (Object.keys(fields).length === 0 && contextString.trim()) {
    fields.rawContext = contextString.trim();
  }

  return fields;
}

// ============================================================================
// INTENT CONTEXT SECTIONS
// ============================================================================

export function getIntentContextSections(intent: string, ctx: Record<string, string>): string {
  const sections: string[] = [];

  switch (intent) {
    // ===== PERSONAL INTENTS =====
    case 'life-update':
      if (ctx.story || ctx.rawContext) {
        sections.push(`YOUR UPDATE (use this as the main content):\n${ctx.story || ctx.rawContext}`);
      }
      break;

    case 'milestone':
      if (ctx.milestone) sections.push(`MILESTONE: ${ctx.milestone}`);
      if (ctx.whyItMatters) sections.push(`WHY IT MATTERS: ${ctx.whyItMatters}`);
      if (!ctx.milestone && ctx.rawContext) sections.push(`MILESTONE: ${ctx.rawContext}`);
      break;

    case 'lesson-insight':
      if (ctx.lesson || ctx.rawContext) sections.push(`LESSON LEARNED:\n${ctx.lesson || ctx.rawContext}`);
      if (ctx.takeaway) sections.push(`KEY TAKEAWAY: ${ctx.takeaway}`);
      break;

    case 'behind-the-scenes':
      if (ctx.bts || ctx.rawContext) {
        sections.push(`BEHIND THE SCENES:\n${ctx.bts || ctx.rawContext}`);
      }
      break;

    // ===== PROFESSIONAL INTENTS =====
    case 'market-update':
      if (ctx.headline) sections.push(`HEADLINE: ${ctx.headline}`);
      if (ctx.stats) sections.push(`KEY STATS:\n${ctx.stats}`);
      if (ctx.soWhat) sections.push(`WHY IT MATTERS:\n${ctx.soWhat}`);
      if (!ctx.headline && ctx.rawContext) sections.push(`MARKET UPDATE:\n${ctx.rawContext}`);
      break;

    case 'buyer-tips':
    case 'seller-tips':
      if (ctx.tipTitle) sections.push(`TIP TITLE: ${ctx.tipTitle}`);
      if (ctx.tipBody) sections.push(`TIP DETAILS:\n${ctx.tipBody}`);
      if (!ctx.tipTitle && ctx.rawContext) sections.push(`TIP:\n${ctx.rawContext}`);
      break;

    case 'investment-insight':
      if (ctx.insight || ctx.rawContext) sections.push(`INSIGHT:\n${ctx.insight || ctx.rawContext}`);
      if (ctx.metric) sections.push(`KEY METRIC: ${ctx.metric}`);
      break;

    case 'client-success-story':
      if (ctx.challenge) sections.push(`CLIENT CHALLENGE:\n${ctx.challenge}`);
      if (ctx.solution) sections.push(`HOW YOU HELPED:\n${ctx.solution}`);
      if (ctx.result) sections.push(`OUTCOME: ${ctx.result}`);
      if (!ctx.challenge && ctx.rawContext) sections.push(`STORY:\n${ctx.rawContext}`);
      break;

    case 'community-spotlight':
      if (ctx.spotlight) sections.push(`FEATURING: ${ctx.spotlight}`);
      if (ctx.details) sections.push(`WHY THEY MATTER:\n${ctx.details}`);
      if (ctx.cta) sections.push(`SUGGESTED CTA: ${ctx.cta}`);
      if (!ctx.spotlight && ctx.rawContext) sections.push(`SPOTLIGHT:\n${ctx.rawContext}`);
      break;

    // ===== PROPERTY INTENTS =====
    case 'open-house':
      if (ctx.openHouseDateTime) sections.push(`OPEN HOUSE DATE/TIME: ${ctx.openHouseDateTime}`);
      if (ctx.rawContext) sections.push(`ADDITIONAL NOTES: ${ctx.rawContext}`);
      break;

    case 'price-drop':
    case 'price-reduced':
      if (ctx.priceDropNote) sections.push(`NOTE: ${ctx.priceDropNote}`);
      if (ctx.rawContext) sections.push(`ADDITIONAL NOTES: ${ctx.rawContext}`);
      break;

    case 'coming-soon':
      if (ctx.teaser) sections.push(`TEASER: ${ctx.teaser}`);
      if (ctx.rawContext) sections.push(`ADDITIONAL NOTES: ${ctx.rawContext}`);
      break;

    case 'investment':
      if (ctx.roiAngle) sections.push(`INVESTMENT ANGLE: ${ctx.roiAngle}`);
      if (ctx.rawContext) sections.push(`ADDITIONAL NOTES: ${ctx.rawContext}`);
      break;

    default:
      // For just-listed, sold, under-contract, general
      if (ctx.rawContext) sections.push(`ADDITIONAL CONTEXT: ${ctx.rawContext}`);
      break;
  }

  if (sections.length === 0) return '';

  // Get domain for context label
  const domain = getIntentDomain(intent);

  // Use stronger labeling for Personal/Professional to ensure LLM uses the context
  if (domain === 'personal' || domain === 'professional') {
    return `USER-PROVIDED CONTEXT (MUST USE IN BODY COPY):\n${sections.join('\n\n')}`;
  }

  return `CONTEXT FIELDS:\n${sections.join('\n\n')}`;
}

// ============================================================================
// STRUCTURED CONTEXT BUILDER
// ============================================================================

export function buildStructuredContext(
  intent: string,
  parsedContext: Record<string, string>,
  property: Property | null
): string {
  const domain = getIntentDomain(intent);
  const sections: string[] = [];

  // Property domain: include property data
  if (domain === 'property' && property) {
    sections.push(`PROPERTY DATA:
- Address: ${property.address || 'TBD'}
- City: ${property.city || 'TBD'}
- Price: $${property.price?.toLocaleString() || 'TBD'}
${property.downPayment ? `- Down Payment: $${property.downPayment.toLocaleString()}` : ''}
${property.monthlyPayment ? `- Monthly Payment: $${property.monthlyPayment.toLocaleString()}/mo` : ''}
- Beds: ${property.beds || 'TBD'}
- Baths: ${property.baths || 'TBD'}
- SqFt: ${property.sqft?.toLocaleString() || 'TBD'}
- Type: ${property.propertyType || 'Single Family'}
${property.description ? `- Description: ${property.description}` : ''}
${property.arv ? `- ARV: $${property.arv.toLocaleString()}` : ''}
${property.repairCost ? `- Repair Estimate: $${property.repairCost.toLocaleString()}` : ''}`);
  }

  // Intent-specific context fields
  const intentContextSections = getIntentContextSections(intent, parsedContext);
  if (intentContextSections) {
    sections.push(intentContextSections);
  }

  return sections.join('\n\n');
}

// ============================================================================
// INTENT HOOKS
// ============================================================================

export function getIntentHook(intent: string, context: Record<string, string>, property: Property | null): string {
  const city = property?.city || 'your area';

  const hooks: Record<string, string> = {
    // Property
    'just-listed': `🏠 JUST LISTED in ${city}!`,
    'sold': `🎉 JUST SOLD in ${city}!`,
    'under-contract': `📝 UNDER CONTRACT in ${city}!`,
    'price-reduced': `💰 PRICE DROP in ${city}!`,
    'price-drop': `💰 PRICE DROP in ${city}!`,
    'open-house': `🚪 OPEN HOUSE in ${city}!`,
    'coming-soon': `👀 COMING SOON in ${city}!`,
    'investment': `📈 INVESTMENT OPPORTUNITY in ${city}!`,
    // Personal
    'life-update': `🌟 A little update from me...`,
    'milestone': context.milestone ? `🏆 ${context.milestone}` : `🏆 Milestone reached!`,
    'lesson-insight': `💡 Something I learned recently...`,
    'behind-the-scenes': `🎬 Behind the scenes...`,
    // Professional
    'market-update': context.headline ? `📊 ${context.headline}` : `📊 Market Update`,
    'buyer-tips': context.tipTitle ? `🏡 ${context.tipTitle}` : `🏡 Buyer Tip`,
    'seller-tips': context.tipTitle ? `🏷️ ${context.tipTitle}` : `🏷️ Seller Tip`,
    'investment-insight': `💹 Investment Insight`,
    'client-success-story': `⭐ Client Success Story`,
    'community-spotlight': context.spotlight ? `🏘️ Spotlight: ${context.spotlight}` : `🏘️ Local Feature`,
    // Legacy
    'personal-value': `💡 Pro Tip`,
    'success-story': `⭐ Success Story`,
    'general': ``,
  };

  return hooks[intent] || '';
}

// ============================================================================
// INTENT CTAs
// ============================================================================

export function getIntentCTA(intent: string): string {
  const ctas: Record<string, string> = {
    // Property
    'just-listed': 'DM for details or to schedule a showing.',
    'sold': 'Thinking of selling? DM me to chat.',
    'under-contract': 'Missed this one? More coming soon. DM to be first.',
    'price-reduced': "Don't miss this one. DM for details.",
    'price-drop': "Don't miss this one. DM for details.",
    'open-house': 'See you there! DM with questions.',
    'coming-soon': 'Want first access? DM to get on the list.',
    'investment': 'Serious inquiries only. DM for the full breakdown.',
    // Personal
    'life-update': "What's new with you? Let me know in the comments!",
    'milestone': 'Thank you for being part of this journey!',
    'lesson-insight': 'What do you think? Let me know below.',
    'behind-the-scenes': 'Any questions about what I do? Ask away!',
    // Professional
    'market-update': "Questions about the market? Let's chat.",
    'buyer-tips': 'Thinking of buying? DM me your questions.',
    'seller-tips': 'Thinking of selling? DM me your questions.',
    'investment-insight': 'Want to talk numbers? DM me.',
    'client-success-story': "Ready to write your own success story? Let's talk.",
    'community-spotlight': 'Know another local gem? Tag them below!',
    // Legacy
    'personal-value': 'Questions? DM me anytime.',
    'success-story': "Ready to write your own success story? Let's talk.",
    'general': 'DM us anytime.',
  };

  return ctas[intent] || 'DM us anytime.';
}
