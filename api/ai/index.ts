/**
 * AI API - Consolidated endpoint for AI-powered features
 *
 * Routes:
 * - action=insights (POST) - Generate match insights
 * - action=caption (POST) - Generate social media captions
 * - action=health (GET) - Internal monitoring endpoint
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import copywritingFrameworks from '../../src/data/copywriting-frameworks.json';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.query;

  switch (action) {
    case 'insights':
      return handleInsights(req, res);
    case 'caption':
      return handleCaption(req, res);
    case 'expand-context':
      return handleExpandContext(req, res);
    case 'health':
      return handleHealth(req, res);
    default:
      return res.status(400).json({
        error: 'Unknown action',
        validActions: ['insights', 'caption', 'expand-context', 'health'],
      });
  }
}

// ============================================================================
// HEALTH ENDPOINT (Phase 4 - Internal Monitoring)
// ============================================================================

async function handleHealth(_req: VercelRequest, res: VercelResponse) {
  try {
    const health = calculateHealthSignal();
    const metrics = getAIMetricsSnapshot();

    return res.status(200).json({
      status: health.status,
      integrity: {
        passed: integrityResult.passed,
        expectedIntents: integrityResult.expectedIntents,
        foundIntents: integrityResult.foundIntents,
        missingIntents: integrityResult.missingIntents,
      },
      metrics: {
        totalGenerations: metrics.totalGenerations,
        successfulGenerations: metrics.successfulGenerations,
        failedGenerations: metrics.failedGenerations,
        regenerations: metrics.regenerations,
        failHards: metrics.failHards,
        failHardRate: `${(health.failHardRate * 100).toFixed(1)}%`,
        regenerationRate: `${(health.regenerationRate * 100).toFixed(1)}%`,
      },
      byDomain: metrics.byDomain,
      topViolations: health.topViolations,
      warnings: health.warnings,
      sessionStarted: metrics.sessionStarted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AI API] Health check error:', error);
    return res.status(500).json({ error: 'Health check failed' });
  }
}

// ============================================================================
// EXPAND CONTEXT - AI Field Autofill for Personal/Professional Posts
// ============================================================================

interface ExpandContextRequest {
  rawContext: string;
  intent: string;
  fields: Array<{ id: string; label: string }>;
}

async function handleExpandContext(req: VercelRequest, res: VercelResponse) {
  const { rawContext, intent, fields }: ExpandContextRequest = req.body;

  if (!rawContext || !intent || !fields || fields.length === 0) {
    return res.status(400).json({ error: 'Missing required fields: rawContext, intent, fields' });
  }

  if (!OPENAI_API_KEY) {
    console.error('[AI API] OpenAI API key not configured');
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const fieldDescriptions = fields.map(f => `- ${f.id}: ${f.label}`).join('\n');

    const systemPrompt = `You are helping a real estate professional create social media content.
Your job is to take their raw idea and expand it into structured form fields.

RULES:
1. Use their words and ideas - don't invent new content
2. Expand and enhance, but stay true to their message
3. Use staccato style - short, punchy sentences
4. For tips, break down into actionable points
5. Return ONLY valid JSON with the field values

FIELDS TO FILL:
${fieldDescriptions}

Return a JSON object like: { "fieldId": "value", ... }`;

    const userPrompt = `Intent: ${intent}

Raw context from user:
"${rawContext}"

Fill in the fields based on this context. Expand their ideas but keep their voice.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI API] OpenAI error:', errorText);
      return res.status(500).json({ error: 'OpenAI API error' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';

    // Parse JSON from response
    try {
      // Handle markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      const parsed = JSON.parse(jsonStr.trim());

      return res.status(200).json({ fields: parsed });
    } catch (parseError) {
      console.error('[AI API] Failed to parse expand-context response:', content);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }
  } catch (error) {
    console.error('[AI API] Expand context error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ============================================================================
// INSIGHTS (from api/insights/index.ts)
// ============================================================================

interface InsightRequest {
  score: number;
  highlights: string[];
  concerns: string[];
  buyerName: string;
  propertyAddress: string;
  distanceMiles?: number;
  stage?: string;
  price?: number;
  beds?: number;
  baths?: number;
}

interface InsightResponse {
  summary: string;
  keyStrength: string;
  potentialConcern: string | null;
  suggestedAction: string;
  confidence: 'high' | 'medium' | 'low';
}

async function handleInsights(req: VercelRequest, res: VercelResponse) {
  const input: InsightRequest = req.body;

  if (!input || !input.buyerName || !input.propertyAddress) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // If OpenAI is not configured, return rule-based insights
  if (!OPENAI_API_KEY) {
    console.log('[AI API] OpenAI not configured, using rule-based fallback');
    return res.status(200).json(generateRuleBasedInsight(input));
  }

  try {
    const insight = await generateOpenAIInsight(input);
    return res.status(200).json(insight);
  } catch (error) {
    console.error('[AI API] OpenAI error, falling back to rules:', error);
    return res.status(200).json(generateRuleBasedInsight(input));
  }
}

async function generateOpenAIInsight(input: InsightRequest): Promise<InsightResponse> {
  const prompt = buildInsightPrompt(input);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a real estate matching assistant. Generate brief, actionable insights about property-buyer matches. Be concise and practical. Always respond in valid JSON format with these fields:
- summary: 2-3 sentences explaining why this is a good or poor match
- keyStrength: The single most important positive factor (1 sentence)
- potentialConcern: The main concern to address, or null if none (1 sentence or null)
- suggestedAction: A specific next step for the agent (1 sentence)
- confidence: "high", "medium", or "low" based on match quality`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || [null, content];
    const jsonStr = jsonMatch[1] || content;
    const parsed = JSON.parse(jsonStr.trim());

    return {
      summary: parsed.summary || 'Match analysis complete.',
      keyStrength: parsed.keyStrength || 'Good property match.',
      potentialConcern: parsed.potentialConcern || null,
      suggestedAction: parsed.suggestedAction || 'Review match details.',
      confidence: validateConfidence(parsed.confidence),
    };
  } catch (parseError) {
    console.error('[AI API] Failed to parse OpenAI response:', content);
    throw new Error('Failed to parse OpenAI response');
  }
}

function buildInsightPrompt(input: InsightRequest): string {
  const parts = [
    `Property Match Analysis for ${input.buyerName}:`,
    '',
    `Property: ${input.propertyAddress}`,
    `Match Score: ${input.score}/100`,
  ];

  if (input.price) {
    parts.push(`Price: $${input.price.toLocaleString()}`);
  }
  if (input.beds) {
    parts.push(`Beds: ${input.beds}`);
  }
  if (input.baths) {
    parts.push(`Baths: ${input.baths}`);
  }
  if (input.distanceMiles !== undefined) {
    parts.push(`Distance: ${input.distanceMiles.toFixed(1)} miles from preferred location`);
  }
  if (input.stage) {
    parts.push(`Current Stage: ${input.stage}`);
  }

  if (input.highlights && input.highlights.length > 0) {
    parts.push('', 'Highlights:');
    input.highlights.forEach((h) => parts.push(`- ${h}`));
  }

  if (input.concerns && input.concerns.length > 0) {
    parts.push('', 'Concerns:');
    input.concerns.forEach((c) => parts.push(`- ${c}`));
  }

  parts.push('', 'Generate a brief insight about this match.');

  return parts.join('\n');
}

function validateConfidence(value: unknown): 'high' | 'medium' | 'low' {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'medium';
}

function generateRuleBasedInsight(input: InsightRequest): InsightResponse {
  const { score, highlights, concerns, buyerName, stage, distanceMiles } = input;

  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (score >= 80) confidence = 'high';
  else if (score < 50) confidence = 'low';

  let summary = '';
  if (score >= 80) {
    summary = `This is an excellent match for ${buyerName}. The property aligns well with their requirements and preferences.`;
  } else if (score >= 60) {
    summary = `This is a strong match for ${buyerName}. Most key criteria are met, making this worth pursuing.`;
  } else if (score >= 40) {
    summary = `This is a moderate match for ${buyerName}. Some criteria align, but there are areas of concern.`;
  } else {
    summary = `This match has significant gaps from ${buyerName}'s preferences. Consider discussing flexibility on requirements.`;
  }

  if (distanceMiles !== undefined) {
    if (distanceMiles <= 5) {
      summary += ' The property is conveniently located within their preferred area.';
    } else if (distanceMiles <= 20) {
      summary += ` The property is ${distanceMiles.toFixed(0)} miles from their preferred location.`;
    } else if (distanceMiles > 50) {
      summary += ` Note: The property is ${distanceMiles.toFixed(0)} miles away, outside their typical search area.`;
    }
  }

  let keyStrength = 'Good overall property match.';
  if (highlights && highlights.length > 0) {
    keyStrength = highlights[0];
  } else if (score >= 70) {
    keyStrength = 'Strong alignment with buyer preferences.';
  }

  let potentialConcern: string | null = null;
  if (concerns && concerns.length > 0) {
    potentialConcern = concerns[0];
  } else if (distanceMiles && distanceMiles > 30) {
    potentialConcern = "Property is outside the buyer's typical search radius.";
  } else if (score < 50) {
    potentialConcern = 'Low match score suggests significant preference gaps.';
  }

  let suggestedAction = 'Send this property to the buyer for their review.';
  if (stage === 'Sent to Buyer') {
    suggestedAction = 'Follow up to gauge interest and answer any questions.';
  } else if (stage === 'Buyer Responded') {
    suggestedAction = 'Schedule a showing to move this deal forward.';
  } else if (stage === 'Showing Scheduled' || stage === 'Property Viewed') {
    suggestedAction = 'Discuss the property and explore making an offer.';
  } else if (stage === 'Offer Made') {
    suggestedAction = 'Monitor offer status and prepare for negotiations.';
  } else if (score >= 85) {
    suggestedAction = 'This is a top match - prioritize sending immediately.';
  } else if (score < 40 && !stage) {
    suggestedAction = 'Consider this property only if buyer is flexible on requirements.';
  }

  return {
    summary,
    keyStrength,
    potentialConcern,
    suggestedAction,
    confidence,
  };
}

// ============================================================================
// CAPTION GENERATION - Intent-Driven Architecture
// ============================================================================

interface Property {
  address?: string;
  city?: string;
  state?: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
  description?: string;
  arv?: number;
  repairCost?: number;
  condition?: string;
}

interface CaptionRequest {
  property: Property | null;
  context: string;
  postIntent: string;
  tone: string;
  platform: string;
  agentName?: string;
}

interface CaptionResponse {
  caption: string;
  platform: string;
}

// ============================================================================
// COPYWRITING TECHNIQUES (From 600 Copy Techniques JSON)
// ============================================================================

interface TechniqueBundle {
  primaryAppeal: string;
  structure: string;
  devices: string[];
  ctaPattern: string;
}

/**
 * Get technique bundle for an intent from the JSON framework
 * Returns null for property domain (excluded from copywriting frameworks)
 */
function getTechniqueBundle(domain: string, intent: string): TechniqueBundle | null {
  // Property domain excluded - uses factual templates only
  if (domain === 'property') return null;

  const domainBundles = copywritingFrameworks.intentBundles[domain as keyof typeof copywritingFrameworks.intentBundles];
  if (!domainBundles) return null;

  const bundle = domainBundles[intent as keyof typeof domainBundles];
  return bundle || null;
}

/**
 * Build copywriting instructions from technique bundle
 * This creates the prompt section that guides OpenAI to use specific techniques
 */
function buildCopywritingInstructions(bundle: TechniqueBundle, intent: string): string {
  const { primaryAppeals, structures, microDevices, ctaPatterns, exampleOutputs } = copywritingFrameworks as {
    primaryAppeals: Record<string, { instruction?: string; powerWords?: string[] }>;
    structures: Record<string, { instruction?: string; template?: string }>;
    microDevices: Record<string, { instruction?: string }>;
    ctaPatterns: Record<string, { instruction?: string; examples?: string[] }>;
    exampleOutputs: Record<string, { good: string; bad: string; avoid: string[] }>;
  };

  // Get appeal instruction
  const appeal = primaryAppeals[bundle.primaryAppeal];
  const appealInstruction = appeal?.instruction || '';

  // Get structure instruction
  const structure = structures[bundle.structure];
  const structureInstruction = structure?.instruction || '';

  // Get device instructions
  const deviceInstructions = bundle.devices.map(deviceKey => {
    const device = microDevices[deviceKey];
    return device ? `• ${device.instruction}` : '';
  }).filter(Boolean).join('\n');

  // Get CTA instruction
  const cta = ctaPatterns[bundle.ctaPattern];
  const ctaInstruction = cta?.instruction || '';

  // Get example outputs for this intent
  const examples = exampleOutputs?.[intent];
  const goodExample = examples?.good || '';
  const badExample = examples?.bad || '';
  const avoidPhrases = examples?.avoid?.join('", "') || '';

  return `
═══════════════════════════════════════════════════════════════
COPYWRITING FRAMEWORK - FOLLOW THIS EXACTLY
═══════════════════════════════════════════════════════════════

APPEAL: ${bundle.primaryAppeal.toUpperCase()} - ${appealInstruction}

STRUCTURE: ${structureInstruction}

TECHNIQUES:
${deviceInstructions}

CTA: ${ctaInstruction}

═══════════════════════════════════════════════════════════════
CRITICAL: GOOD vs BAD EXAMPLES
═══════════════════════════════════════════════════════════════

✅ WRITE LIKE THIS (staccato, punchy):
${goodExample}

❌ NOT LIKE THIS (wordy, generic):
${badExample}

🚫 NEVER USE THESE PHRASES:
"${avoidPhrases}"

═══════════════════════════════════════════════════════════════`;
}

// ============================================================================
// INTENT DOMAIN CLASSIFICATION
// ============================================================================

type IntentDomain = 'property' | 'personal' | 'professional';

const INTENT_DOMAINS: Record<string, IntentDomain> = {
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

function getIntentDomain(intent: string): IntentDomain {
  const domain = INTENT_DOMAINS[intent];
  if (!domain) {
    console.error(`[AI API] CRITICAL: Unknown intent "${intent}" - no domain mapping exists`);
    throw new Error(`Unknown intent: ${intent}. No domain fallback allowed. This is a configuration error.`);
  }
  return domain;
}

// ============================================================================
// INTENT HOOKS - Dynamic hook generation based on context
// ============================================================================

function getIntentHook(intent: string, context: Record<string, string>, property: Property | null): string {
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
// INTENT CTAs - Call-to-action by intent
// ============================================================================

function getIntentCTA(intent: string): string {
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

// ============================================================================
// CONTEXT PARSER - Parse structured context from string
// ============================================================================

function parseContextFields(contextString: string): Record<string, string> {
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
  const knownPatterns: Record<string, RegExp> = {
    story: /(?:story|update|what'?s? your update)[:\s]*(.+)/i,
    milestone: /(?:milestone|achievement|what'?s? your milestone|what milestone)[:\s]*(.+)/i,
    whyItMatters: /(?:why it matters|reflection|why does it matter)[:\s]*(.+)/i,
    lesson: /(?:lesson|what did you learn|what'?s? the lesson)[:\s]*(.+)/i,
    takeaway: /(?:takeaway|key point|key takeaway|remember)[:\s]*(.+)/i,
    bts: /(?:behind the scenes|bts|what happened)[:\s]*(.+)/i,
    tipTitle: /(?:tip title|title)[:\s]*(.+)/i,
    tipBody: /(?:tip details|tip body|details)[:\s]*(.+)/i,
    headline: /(?:headline|market headline)[:\s]*(.+)/i,
    stats: /(?:stats|key stats)[:\s]*(.+)/i,
    soWhat: /(?:so what|why it matters|impact)[:\s]*(.+)/i,
    insight: /(?:insight|analysis)[:\s]*(.+)/i,
    metric: /(?:metric|numbers)[:\s]*(.+)/i,
    challenge: /(?:challenge|client challenge|situation)[:\s]*(.+)/i,
    solution: /(?:solution|how you helped)[:\s]*(.+)/i,
    result: /(?:result|outcome)[:\s]*(.+)/i,
    spotlight: /(?:spotlight|featuring)[:\s]*(.+)/i,
    details: /(?:details|why they matter)[:\s]*(.+)/i,
    cta: /(?:cta|call to action)[:\s]*(.+)/i,
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
// DOMAIN GUARDRAILS - Post-Generation Validators (Phase 2)
// ============================================================================

interface DomainViolation {
  rule: string;
  matched: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  valid: boolean;
  violations: DomainViolation[];
}

/**
 * PROPERTY DOMAIN INVARIANTS
 * - MUST be third-person or neutral (no "I", "my", "we")
 * - MUST NOT use emotional/transformation language
 * - MUST NOT use identity framing
 */
function validatePropertyOutput(caption: string): ValidationResult {
  const violations: DomainViolation[] = [];
  const lowerCaption = caption.toLowerCase();

  // First-person pronouns (Property must be third-person/neutral)
  const firstPersonPatterns = [
    /\bi\s+(?:am|was|have|had|will|would|could|should|can|did|do|feel|think|believe|love|remember)\b/gi,
    /\bmy\s+(?:journey|story|experience|life|dream|heart|family|home)\b/gi,
    /\bwe\s+(?:are|were|have|had|will|would|love|believe)\b/gi,
  ];

  for (const pattern of firstPersonPatterns) {
    const matches = caption.match(pattern);
    if (matches) {
      violations.push({
        rule: 'PROPERTY_NO_FIRST_PERSON',
        matched: matches[0],
        severity: 'error',
      });
    }
  }

  // Emotional storytelling phrases
  const emotionalPhrases = [
    'imagine waking up',
    'picture yourself',
    'dream home',
    'your forever home',
    'where memories are made',
    'fall in love',
    'feels like home',
    'transform your life',
    'start your journey',
    'write your story',
    'begin a new chapter',
    'this is where',
    'imagine coming home',
  ];

  for (const phrase of emotionalPhrases) {
    if (lowerCaption.includes(phrase)) {
      violations.push({
        rule: 'PROPERTY_NO_EMOTIONAL_STORYTELLING',
        matched: phrase,
        severity: 'error',
      });
    }
  }

  // Identity framing
  const identityPhrases = [
    'could be yours',
    'waiting for you',
    'meant for you',
    'perfect for your family',
    'your next chapter',
    'deserves this',
  ];

  for (const phrase of identityPhrases) {
    if (lowerCaption.includes(phrase)) {
      violations.push({
        rule: 'PROPERTY_NO_IDENTITY_FRAMING',
        matched: phrase,
        severity: 'error',
      });
    }
  }

  return {
    valid: violations.filter((v) => v.severity === 'error').length === 0,
    violations,
  };
}

/**
 * PERSONAL DOMAIN INVARIANTS
 * - MUST be first-person ("I", "my")
 * - MUST NOT mention property specifics (beds, baths, price, sqft)
 * - MUST NOT sound promotional
 */
function validatePersonalOutput(caption: string): ValidationResult {
  const violations: DomainViolation[] = [];
  const lowerCaption = caption.toLowerCase();

  // Must contain first-person (at least one "I" or "my")
  const hasFirstPerson = /\b(i\s+|i'[a-z]+|my\s+|me\s+|myself)\b/i.test(caption);
  if (!hasFirstPerson) {
    violations.push({
      rule: 'PERSONAL_REQUIRES_FIRST_PERSON',
      matched: '(missing first-person pronouns)',
      severity: 'error',
    });
  }

  // Property-specific language (forbidden)
  const propertyTerms = [
    /\b\d+\s*bed/i,
    /\b\d+\s*bath/i,
    /\b\d+\s*sq\s*ft/i,
    /\bsquare\s*feet\b/i,
    /\bjust\s+listed\b/i,
    /\bjust\s+sold\b/i,
    /\bopen\s+house\b/i,
    /\bprice\s+reduced\b/i,
    /\bunder\s+contract\b/i,
    /\$\d{2,3},?\d{3}/i, // Price patterns like $215,000
    /\basking\s+price\b/i,
    /\blist\s+price\b/i,
  ];

  for (const pattern of propertyTerms) {
    const matches = caption.match(pattern);
    if (matches) {
      violations.push({
        rule: 'PERSONAL_NO_PROPERTY_LANGUAGE',
        matched: matches[0],
        severity: 'error',
      });
    }
  }

  // Promotional phrases (forbidden in personal)
  const promotionalPhrases = [
    'dm for details',
    'dm to schedule',
    'schedule a showing',
    'serious inquiries',
    'contact me for',
    'call me to',
    'reach out for',
  ];

  for (const phrase of promotionalPhrases) {
    if (lowerCaption.includes(phrase)) {
      violations.push({
        rule: 'PERSONAL_NO_PROMOTIONAL_LANGUAGE',
        matched: phrase,
        severity: 'warning',
      });
    }
  }

  return {
    valid: violations.filter((v) => v.severity === 'error').length === 0,
    violations,
  };
}

/**
 * PROFESSIONAL DOMAIN INVARIANTS
 * - MUST sound educational/advisory
 * - MUST NOT use personal life narratives
 * - MUST NOT use emotional vulnerability language
 */
function validateProfessionalOutput(caption: string): ValidationResult {
  const violations: DomainViolation[] = [];
  const lowerCaption = caption.toLowerCase();

  // Personal life narrative phrases (forbidden)
  const personalNarratives = [
    'my journey',
    'my story',
    'when i was',
    'growing up',
    'my childhood',
    'my family',
    'my kids',
    'my spouse',
    'my wife',
    'my husband',
    'personal life',
    'at home with',
    'my weekend',
    'my vacation',
  ];

  for (const phrase of personalNarratives) {
    if (lowerCaption.includes(phrase)) {
      violations.push({
        rule: 'PROFESSIONAL_NO_PERSONAL_NARRATIVE',
        matched: phrase,
        severity: 'error',
      });
    }
  }

  // Emotional vulnerability (forbidden)
  const vulnerabilityPhrases = [
    'i was scared',
    'i was afraid',
    'i struggled with',
    'i cried',
    'broke down',
    'hit rock bottom',
    'my darkest',
    'feeling lost',
    'i was devastated',
  ];

  for (const phrase of vulnerabilityPhrases) {
    if (lowerCaption.includes(phrase)) {
      violations.push({
        rule: 'PROFESSIONAL_NO_EMOTIONAL_VULNERABILITY',
        matched: phrase,
        severity: 'error',
      });
    }
  }

  return {
    valid: violations.filter((v) => v.severity === 'error').length === 0,
    violations,
  };
}

/**
 * Master validator - routes to domain-specific validator
 */
function validateCaptionOutput(caption: string, domain: IntentDomain, intent: string): ValidationResult {
  let result: ValidationResult;

  switch (domain) {
    case 'property':
      result = validatePropertyOutput(caption);
      break;
    case 'personal':
      result = validatePersonalOutput(caption);
      break;
    case 'professional':
      result = validateProfessionalOutput(caption);
      break;
    default:
      throw new Error(`Unknown domain: ${domain}`);
  }

  // Log violations for monitoring
  if (result.violations.length > 0) {
    console.warn(`[AI API] Domain violations detected:`, {
      intent,
      domain,
      violationCount: result.violations.length,
      violations: result.violations.map((v) => `${v.rule}: "${v.matched}"`),
    });
  }

  return result;
}

/**
 * Build stricter system prompt for regeneration after violation
 */
function buildStricterSystemPrompt(domain: IntentDomain, violations: DomainViolation[], intent?: string, tone?: string): string {
  const basePrompt = buildCaptionSystemPrompt(domain, intent, tone);
  const violationWarnings = violations
    .map((v) => `- DO NOT use: "${v.matched}" (violates ${v.rule})`)
    .join('\n');

  return `${basePrompt}

⚠️ CRITICAL: YOUR PREVIOUS OUTPUT VIOLATED DOMAIN RULES.
You MUST avoid these specific violations:
${violationWarnings}

REGENERATE THE CAPTION FOLLOWING ALL DOMAIN CONSTRAINTS.`;
}

// ============================================================================
// OBSERVABILITY - Phase 4 Instrumentation
// ============================================================================

// Import observability utilities (inline to avoid module resolution issues in Vercel)
// These are fire-and-forget, non-blocking, and never throw

type ViolationSeverity = 'warning' | 'error';

interface ViolationRecord {
  ruleId: string;
  domain: 'property' | 'personal' | 'professional';
  severity: ViolationSeverity;
  matchedPhrase: string;
  message: string;
  generationAttempt: number;
}

interface AIMetricsState {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  regenerations: number;
  failHards: number;
  byDomain: Record<string, { total: number; passed: number; failed: number; regenerated: number; failHard: number }>;
  violationsByRule: Record<string, number>;
  sessionStarted: string;
}

// In-memory metrics (reset on cold start)
const aiMetrics: AIMetricsState = {
  totalGenerations: 0,
  successfulGenerations: 0,
  failedGenerations: 0,
  regenerations: 0,
  failHards: 0,
  byDomain: {
    property: { total: 0, passed: 0, failed: 0, regenerated: 0, failHard: 0 },
    personal: { total: 0, passed: 0, failed: 0, regenerated: 0, failHard: 0 },
    professional: { total: 0, passed: 0, failed: 0, regenerated: 0, failHard: 0 },
  },
  violationsByRule: {},
  sessionStarted: new Date().toISOString(),
};

const LOG_PREFIX = '[AI-OBS]';
const ENABLE_OBS_LOGGING = process.env.NODE_ENV !== 'production';

/**
 * Convert DomainViolation to ViolationRecord for observability
 */
function toViolationRecord(
  v: DomainViolation,
  domain: IntentDomain,
  attempt: number
): ViolationRecord {
  return {
    ruleId: v.rule,
    domain,
    severity: v.severity,
    matchedPhrase: v.matched,
    message: `${v.rule}: ${v.matched}`,
    generationAttempt: attempt,
  };
}

/**
 * Log generation_started event (non-blocking)
 */
function obsLogGenerationStarted(params: {
  intentId: string;
  domain: IntentDomain;
  toneId: string;
  hasProperty: boolean;
  batchItemId?: string | null;
  isBatch?: boolean;
}): void {
  try {
    aiMetrics.totalGenerations++;
    aiMetrics.byDomain[params.domain].total++;
    if (ENABLE_OBS_LOGGING) {
      console.log(
        `${LOG_PREFIX} ▶️ generation_started [${params.domain}/${params.intentId}]`,
        `tone=${params.toneId} hasProperty=${params.hasProperty}`
      );
    }
  } catch {
    // Never throw from observability
  }
}

/**
 * Log generation_passed event (non-blocking)
 */
function obsLogGenerationPassed(params: {
  intentId: string;
  domain: IntentDomain;
  captionLength: number;
  attemptNumber: number;
  durationMs: number;
}): void {
  try {
    aiMetrics.successfulGenerations++;
    aiMetrics.byDomain[params.domain].passed++;
    if (ENABLE_OBS_LOGGING) {
      console.log(
        `${LOG_PREFIX} ✅ generation_passed [${params.domain}/${params.intentId}]`,
        `attempt=${params.attemptNumber} length=${params.captionLength} duration=${params.durationMs}ms`
      );
    }
  } catch {
    // Never throw from observability
  }
}

/**
 * Log generation_failed event (non-blocking)
 */
function obsLogGenerationFailed(params: {
  intentId: string;
  domain: IntentDomain;
  violations: ViolationRecord[];
  attemptNumber: number;
  willRetry: boolean;
}): void {
  try {
    aiMetrics.failedGenerations++;
    aiMetrics.byDomain[params.domain].failed++;
    // Track violations by rule
    for (const v of params.violations) {
      aiMetrics.violationsByRule[v.ruleId] = (aiMetrics.violationsByRule[v.ruleId] || 0) + 1;
    }
    if (ENABLE_OBS_LOGGING) {
      console.log(
        `${LOG_PREFIX} ⚠️ generation_failed [${params.domain}/${params.intentId}]`,
        `attempt=${params.attemptNumber} violations=${params.violations.length} willRetry=${params.willRetry}`
      );
    }
  } catch {
    // Never throw from observability
  }
}

/**
 * Log generation_regenerated event (non-blocking)
 */
function obsLogGenerationRegenerated(params: {
  intentId: string;
  domain: IntentDomain;
  previousViolations: ViolationRecord[];
  attemptNumber: number;
}): void {
  try {
    aiMetrics.regenerations++;
    aiMetrics.byDomain[params.domain].regenerated++;
    if (ENABLE_OBS_LOGGING) {
      console.log(
        `${LOG_PREFIX} 🔄 generation_regenerated [${params.domain}/${params.intentId}]`,
        `attempt=${params.attemptNumber} prevViolations=${params.previousViolations.length}`
      );
    }
  } catch {
    // Never throw from observability
  }
}

/**
 * Log generation_fail_hard event (non-blocking)
 */
function obsLogGenerationFailHard(params: {
  intentId: string;
  domain: IntentDomain;
  totalAttempts: number;
  allViolations: ViolationRecord[];
  errorMessage: string;
}): void {
  try {
    aiMetrics.failHards++;
    aiMetrics.byDomain[params.domain].failHard++;
    if (ENABLE_OBS_LOGGING) {
      console.error(
        `${LOG_PREFIX} ❌ generation_fail_hard [${params.domain}/${params.intentId}]`,
        `attempts=${params.totalAttempts} violations=${params.allViolations.length}`,
        params.errorMessage
      );
    }
  } catch {
    // Never throw from observability
  }
}

/**
 * Get current metrics snapshot (for debugging/monitoring)
 */
function getAIMetricsSnapshot(): AIMetricsState {
  try {
    return { ...aiMetrics };
  } catch {
    return aiMetrics;
  }
}

// ============================================================================
// CAPTION HANDLER
// ============================================================================

async function handleCaption(req: VercelRequest, res: VercelResponse) {
  const { property, context, postIntent, tone, platform, agentName }: CaptionRequest = req.body;
  const batchItemId = req.body.batchItemId || null;
  const isBatch = req.body.isBatch || false;

  if (!postIntent || !tone || !platform) {
    return res.status(400).json({ error: 'Missing required fields: postIntent, tone, platform' });
  }

  if (!OPENAI_API_KEY) {
    console.error('[AI API] OpenAI API key not configured');
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  // Track timing for observability
  const startTime = Date.now();
  let attemptNumber = 1;
  const allViolations: ViolationRecord[] = [];

  try {
    const domain = getIntentDomain(postIntent);
    const userPrompt = buildCaptionUserPrompt({ property, context, postIntent, tone, platform, agentName });

    // Phase 4: Log generation started
    obsLogGenerationStarted({
      intentId: postIntent,
      domain,
      toneId: tone,
      hasProperty: !!property,
      batchItemId,
      isBatch,
    });

    // First generation attempt - include copywriting framework for Personal/Professional
    let systemPrompt = buildCaptionSystemPrompt(domain, postIntent, tone);
    let caption = await generateCaption(systemPrompt, userPrompt);

    if (!caption) {
      return res.status(500).json({ error: 'Empty response from OpenAI' });
    }

    // Phase 2: Post-generation validation
    let validation = validateCaptionOutput(caption, domain, postIntent);

    // If violations detected, attempt ONE regeneration with stricter prompt
    if (!validation.valid) {
      // Convert violations to ViolationRecords
      const violationRecords = validation.violations.map((v) =>
        toViolationRecord(v, domain, attemptNumber)
      );
      allViolations.push(...violationRecords);

      // Phase 4: Log failed generation
      obsLogGenerationFailed({
        intentId: postIntent,
        domain,
        violations: violationRecords,
        attemptNumber,
        willRetry: true,
      });

      console.warn(`[AI API] First generation failed validation for ${postIntent}. Regenerating...`);

      // Phase 4: Log regeneration
      attemptNumber = 2;
      obsLogGenerationRegenerated({
        intentId: postIntent,
        domain,
        previousViolations: violationRecords,
        attemptNumber,
      });

      const stricterPrompt = buildStricterSystemPrompt(domain, validation.violations, postIntent, tone);
      caption = await generateCaption(stricterPrompt, userPrompt);

      if (!caption) {
        return res.status(500).json({ error: 'Empty response from OpenAI on retry' });
      }

      // Re-validate
      validation = validateCaptionOutput(caption, domain, postIntent);

      // If still failing, fail hard
      if (!validation.valid) {
        const retryViolations = validation.violations.map((v) =>
          toViolationRecord(v, domain, attemptNumber)
        );
        allViolations.push(...retryViolations);

        // Phase 4: Log fail-hard
        const errorMessage = `Caption generation failed domain validation after ${attemptNumber} attempts`;
        obsLogGenerationFailHard({
          intentId: postIntent,
          domain,
          totalAttempts: attemptNumber,
          allViolations,
          errorMessage,
        });

        console.error(`[AI API] CRITICAL: Caption still violates domain rules after retry`, {
          intent: postIntent,
          domain,
          violations: validation.violations,
        });
        return res.status(500).json({
          error: 'Caption generation failed domain validation',
          details: validation.violations.map((v) => v.rule),
        });
      }
    }

    // Phase 4: Log success
    const durationMs = Date.now() - startTime;
    obsLogGenerationPassed({
      intentId: postIntent,
      domain,
      captionLength: caption.length,
      attemptNumber,
      durationMs,
    });

    const result: CaptionResponse = { caption, platform };
    return res.status(200).json(result);
  } catch (error) {
    console.error('[AI API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Helper: Generate caption via OpenAI
 */
async function generateCaption(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AI API] OpenAI error:', errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// ============================================================================
// SYSTEM PROMPT - Domain-specific
// ============================================================================

function buildCaptionSystemPrompt(domain: IntentDomain, intent?: string, tone?: string): string {
  const baseRules = `You are a social media copywriter for a real estate professional. You create engaging, scannable captions.

WRITING STYLE - STACCATO (MANDATORY):
- Short sentences. Fragments work. Punch hard.
- NO run-on sentences. NO compound sentences with multiple clauses.
- Every word earns its place. Cut the fluff.
- Example: "100 families. 100 stories. One mission." NOT "I've had the privilege of helping 100 families find their homes over the years."
- Example: "No emails. No showings. Just rest." NOT "I finally took some time off from checking emails and doing showings to get some rest."

CRITICAL RULES:
1. Follow the template structure EXACTLY
2. Use emojis as specified in the template
3. Write in the specified tone
4. STACCATO STYLE - short, punchy sentences (see above)
5. NEVER include hashtags
6. Output ONLY the filled template - no explanations`;

  const domainRules: Record<IntentDomain, string> = {
    property: `
DOMAIN: PROPERTY POSTS (Factual Only)
- You are writing a transactional property announcement
- Include property details (address, price, beds, baths, sqft) exactly as provided
- Be specific, clear, and scannable
- Light, factual urgency is allowed ("won't last long", "generating interest")

PROPERTY DOMAIN CONSTRAINTS (STRICTLY ENFORCED):
- NO emotional storytelling
- NO identity framing ("this could be your dream home")
- NO life transformation language ("imagine waking up here")
- NO persuasion frameworks or psychological triggers
- NO personal reflection or vulnerability
- Keep language transactional and compliance-safe`,

    personal: `
DOMAIN: PERSONAL POSTS (Story & Reflection)

CRITICAL RULES FOR PERSONAL POSTS:
- Write in FIRST PERSON ("I", "me", "my")
- The user's context is your SOURCE MATERIAL - incorporate their SPECIFIC details
- Don't generate generic inspirational fluff - use THEIR story
- For milestone posts: Use THEIR milestone, THEIR reflection
- For lesson posts: Expand on THEIR lesson, don't replace it with generic wisdom
- For behind-the-scenes: Describe THEIR actual experience, not imagined scenarios

WHAT TO DO WITH USER CONTEXT:
- If they say "I got 8 hours of sleep" → Write about THEIR sleep experience
- If they say "It's my 5th year in real estate" → Write about THEIR 5 years
- For takeaways: EXPAND and ENHANCE what they wrote, don't just copy verbatim

PERSONAL DOMAIN CONSTRAINTS (STRICTLY ENFORCED):
- NEVER mention property listings, prices, or transactions
- NEVER use property-specific language (beds, baths, sqft, just listed, etc.)
- NEVER sound promotional or sales-driven
- NEVER generate generic "Imagine..." or "Picture this..." filler
- This is about THE PERSON and THEIR specific story`,

    professional: `
DOMAIN: PROFESSIONAL POSTS (Education & Authority)
- Position the agent as a trusted expert
- Share market insights, tips, or client success stories
- Focus on value, expertise, and credibility
- Use educational, authoritative language

PROFESSIONAL DOMAIN CONSTRAINTS (STRICTLY ENFORCED):
- NEVER use personal life narratives or casual vulnerability
- NEVER include specific property listings unless in client success context
- Keep tone informative, not emotional
- This is about expertise, not personality`,
  };

  // Get copywriting framework for Personal/Professional domains
  let copywritingInstructions = '';
  if (intent && (domain === 'personal' || domain === 'professional')) {
    const bundle = getTechniqueBundle(domain, intent);
    if (bundle) {
      copywritingInstructions = buildCopywritingInstructions(bundle, intent);
    }
  }

  return `${baseRules}
${domainRules[domain]}
${copywritingInstructions}`;
}

// ============================================================================
// USER PROMPT BUILDER
// ============================================================================

function buildCaptionUserPrompt(params: CaptionRequest): string {
  const { property, context, postIntent, tone, platform, agentName } = params;

  const domain = getIntentDomain(postIntent);
  const parsedContext = parseContextFields(context);
  const hook = getIntentHook(postIntent, parsedContext, property);
  const cta = getIntentCTA(postIntent);
  const template = getCaptionStructureTemplate(postIntent, property, parsedContext, agentName);
  const toneInstructions = getCaptionToneInstructions(tone);
  const structuredContext = buildStructuredContext(postIntent, parsedContext, property);

  return `GENERATE A CAPTION USING THIS TEMPLATE:

═══════════════════════════════════════════════════════════════
TEMPLATE STRUCTURE:
═══════════════════════════════════════════════════════════════
${template}
═══════════════════════════════════════════════════════════════

HOOK TO USE: ${hook}

CTA TO USE: ${cta}

${structuredContext}

TONE: ${tone.toUpperCase()}
${toneInstructions}

═══════════════════════════════════════════════════════════════
INSTRUCTIONS:
═══════════════════════════════════════════════════════════════
1. Use the template structure exactly
2. Replace {placeholders} with the provided data
3. Write {body_copy} as 2-4 short, punchy sentences in ${tone} tone

FOR PERSONAL POSTS - READ CAREFULLY:
- The USER-PROVIDED CONTEXT above contains THEIR actual story/experience
- Your job is to EXPAND and ENHANCE their words into polished copy
- Do NOT replace their story with generic inspirational content
- Do NOT start with "Imagine..." or "Picture this..." - use THEIR experience
- If they wrote about sleep, write about THEIR sleep experience
- If they wrote about a milestone, celebrate THEIR specific milestone
- For {takeaway} fields: EXPAND on what they wrote, don't just copy verbatim

4. Use the provided hook and CTA
5. Keep emojis as shown
6. Output ONLY the caption - no explanations

GENERATE THE CAPTION NOW:`;
}

// ============================================================================
// STRUCTURED CONTEXT BUILDER - Intent-specific labeled sections
// ============================================================================

function buildStructuredContext(
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
- Beds: ${property.beds || 'TBD'}
- Baths: ${property.baths || 'TBD'}
- SqFt: ${property.sqft?.toLocaleString() || 'TBD'}
- Type: ${property.propertyType || 'Single Family'}
${property.description ? `- Description: ${property.description}` : ''}
${property.arv ? `- ARV: $${property.arv.toLocaleString()}` : ''}
${property.repairCost ? `- Repair Estimate: $${property.repairCost.toLocaleString()}` : ''}`);
  }

  // Check parsed context for property description (from GHL "Social media property description" field)
  // This is passed as "Property Description:" in the context string
  if (parsedContext.propertyDescription) {
    sections.push(`ADDITIONAL PROPERTY CONTEXT (USE THIS IN THE BODY COPY):
${parsedContext.propertyDescription}`);
  }

  // Intent-specific context fields
  const intentContextSections = getIntentContextSections(intent, parsedContext);
  if (intentContextSections) {
    sections.push(intentContextSections);
  }

  return sections.join('\n\n');
}

function getIntentContextSections(intent: string, ctx: Record<string, string>): string {
  const sections: string[] = [];

  switch (intent) {
    // ===== PERSONAL INTENTS =====
    // IMPORTANT: For Personal intents, these are the user's ACTUAL words/story.
    // The AI must EXPAND on these, not replace them with generic content.
    case 'life-update':
      if (ctx.story || ctx.rawContext) {
        sections.push(`THE USER'S ACTUAL UPDATE (expand on THIS, don't invent new content):\n"${ctx.story || ctx.rawContext}"`);
      }
      break;

    case 'milestone':
      if (ctx.milestone) sections.push(`THE USER'S SPECIFIC MILESTONE (celebrate THIS):\n"${ctx.milestone}"`);
      if (ctx.whyItMatters) sections.push(`THE USER'S REFLECTION (expand on THIS):\n"${ctx.whyItMatters}"`);
      if (!ctx.milestone && ctx.rawContext) sections.push(`THE USER'S MILESTONE (celebrate THIS):\n"${ctx.rawContext}"`);
      break;

    case 'lesson-insight':
      if (ctx.lesson || ctx.rawContext) sections.push(`THE USER'S LESSON (expand on THIS insight):\n"${ctx.lesson || ctx.rawContext}"`);
      if (ctx.takeaway) sections.push(`THE USER'S TAKEAWAY (enhance THIS, don't just copy verbatim):\n"${ctx.takeaway}"`);
      break;

    case 'behind-the-scenes':
      if (ctx.bts || ctx.rawContext) {
        sections.push(`THE USER'S BTS MOMENT (describe THIS specific experience):\n"${ctx.bts || ctx.rawContext}"`);
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
// CAPTION STRUCTURE TEMPLATES - ALL INTENTS COVERED
// ============================================================================

function getCaptionStructureTemplate(
  intent: string,
  property: Property | null,
  context: Record<string, string>,
  agentName?: string
): string {
  const city = property?.city || '{city}';
  // Build signature based on agent name
  const signature = agentName
    ? `${agentName} | Purple Homes`
    : 'Purple Homes | Your Trusted Real Estate Partner';

  // ===== PROPERTY TEMPLATES =====
  const propertyTemplates: Record<string, string> = {
    'just-listed': `{hook}

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

${signature}`,

    'sold': `{hook}

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

${signature}`,

    'under-contract': `{hook}

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

${signature}`,

    'price-reduced': `{hook}

📍 {address}
💰 NOW {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

${signature}`,

    'price-drop': `{hook}

📍 {address}
💰 NOW {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

${signature}`,

    'open-house': `{hook}

📅 {openHouseDateTime}
📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

${signature}`,

    'coming-soon': `{hook}

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

${signature}`,

    'investment': `{hook}

📍 {address}
💰 Asking: {price}
📊 ARV: {arv} | Potential Profit: {profit}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

${signature}`,
  };

  // ===== PERSONAL TEMPLATES =====
  // STACCATO STYLE: Short sentences. Fragments. No conjunctions. Punch hard.
  const personalTemplates: Record<string, string> = {
    'life-update': `{hook}

{body_copy}
RULES: 3-5 SHORT sentences. Fragments OK. Use user's words. NO "I finally", "It was nice", "I feel".
Example format: "No emails. No showings. Just family. [specific detail]. [reflection]."

{cta}

${signature}`,

    'milestone': `{hook}

{body_copy}
RULES: Start with the NUMBER repeated in staccato. "100 families. 100 stories. 100 reasons."
Then 2-3 short sentences about meaning. NO "I'm thrilled", "privilege", "grateful for".

🙏 {one_sentence_gratitude}

{cta}

${signature}`,

    'lesson-insight': `{hook}

{body_copy}
RULES: State the lesson directly. Short sentences. Then the implication.
Example: "The best deals? Listings no one wants. Ugly houses. That's where opportunity hides."

💭 {takeaway_one_liner}

{cta}

${signature}`,

    'behind-the-scenes': `{hook}

{body_copy}
RULES: Numbers first. "3 hours. One property. Garage furniture." Then what happened. Short bursts.

{cta}

${signature}`,
  };

  // ===== PROFESSIONAL TEMPLATES =====
  // STACCATO STYLE: Short sentences. Facts. Numbers. No filler.
  const professionalTemplates: Record<string, string> = {
    'market-update': `{hook}

📈 {stats_in_staccato}
RULES: "Listings: Up 23%. Days on market: 34." NO "Currently at" or "approximately".

{what_it_means}
RULES: 2-3 short sentences. "Buyers have breathing room. Finally. Negotiation power shifting."

{cta}

${signature}`,

    'buyer-tips': `{hook}

{tip_body}
RULES: Lead with the problem/stat. "3 deals fell apart. Hidden issues. Every one."
Then the solution in fragments. NO "I wanted to share" or "It's important".

💡 {punchline}
RULES: One punchy sentence. "Skip inspection, inherit nightmare."

{cta}

${signature}`,

    'seller-tips': `{hook}

{tip_body}
RULES: Lead with the stat. "Correctly priced = 18 days faster. Fact."
Then implications. Short. Punchy. NO "Here's something important" or "sellers should know".

💡 {punchline}

{cta}

${signature}`,

    'investment-insight': `{hook}

{insight_body}
RULES: Numbers first. "Under 4 units? Residential financing. Phoenix: 3.2% cap. Tucson: 4.8%."
Then analysis in fragments.

📊 {metric_punchline}

{cta}

${signature}`,

    'client-success-story': `{hook}

📋 The Challenge:
{challenge_staccato}
RULES: Short fragments. "First-time buyers. Lost to cash. Three times."

✅ The Solution:
{solution_staccato}
RULES: What you did. Brief. "Connected with lender. 14-day close."

🎉 The Result:
{result_staccato}
RULES: The win. "Dream home. $5K under. Done."

{cta}

${signature}`,

    'community-spotlight': `{hook}

{spotlight_body}
RULES: Details in fragments. "Every Saturday. 8am-noon. Fresh produce. Live music."
Then why it matters. Short.

📍 {location_punchline}
RULES: "Support local. Eat well. Meet neighbors."

{cta}

${signature}`,

    // Legacy intents
    'personal-value': `{hook}

{body_copy}

{cta}

${signature}`,

    'success-story': `{hook}

{body_copy}

{cta}

${signature}`,

    'general': `{body_copy}

{cta}

${signature}`,
  };

  // Merge all templates
  const allTemplates: Record<string, string> = {
    ...propertyTemplates,
    ...personalTemplates,
    ...professionalTemplates,
  };

  // FAIL LOUDLY if template is missing - never silently fallback
  if (!allTemplates[intent]) {
    console.error(`[AI API] CRITICAL: Missing caption template for intent: ${intent}`);
    throw new Error(`Missing caption template for intent: ${intent}. This is a configuration error.`);
  }

  return allTemplates[intent];
}

// ============================================================================
// TONE INSTRUCTIONS
// ============================================================================

function getCaptionToneInstructions(tone: string): string {
  const instructions: Record<string, string> = {
    professional: `Professional tone: Polished, authoritative, credible. Use words like: exceptional, distinguished, premier, strategic, optimal.`,
    casual: `Casual tone: Relaxed, conversational, real. Use words like: honestly, love this, pretty cool, check this out, real talk.`,
    urgent: `Urgent tone: Time-sensitive, action-driving, punchy. Use words like: just dropped, won't last, moving fast, act now, don't miss.`,
    friendly: `Friendly tone: Warm, approachable, personal. Use words like: imagine, picture this, excited to share, can't wait, thrilled.`,
    luxury: `Luxury tone: Sophisticated, elegant, refined. Use words like: exquisite, curated, bespoke, residence, exceptional craftsmanship.`,
    investor: `Investor tone: Analytical, numbers-focused, ROI-driven. Use words like: cap rate, cash flow, ARV, upside potential, solid returns.`,
  };
  return instructions[tone] || instructions.professional;
}

// ============================================================================
// PHASE 4: STARTUP INTEGRITY CHECK
// ============================================================================

/**
 * The authoritative list of 16 intents from Canonical Prompt Templates v1.2
 *
 * Property (6): just-listed, sold, open-house, price-drop, coming-soon, investment
 * Personal (4): life-update, milestone, lesson-insight, behind-the-scenes
 * Professional (6): market-update, buyer-tips, seller-tips, investment-insight,
 *                   client-success-story, community-spotlight
 */
const EXPECTED_INTENTS = [
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

const EXPECTED_INTENT_COUNT = 16;

interface IntegrityCheckResult {
  passed: boolean;
  expectedIntents: number;
  foundIntents: number;
  missingIntents: string[];
  extraIntents: string[];
  timestamp: string;
}

/**
 * Check that all expected intents are registered in INTENT_DOMAINS
 */
function runIntegrityCheck(): IntegrityCheckResult {
  try {
    const registeredIntents = Object.keys(INTENT_DOMAINS).filter(
      // Exclude legacy intents from count
      (intent) => !['under-contract', 'price-reduced', 'personal-value', 'success-story', 'general'].includes(intent)
    );
    const registered = new Set(registeredIntents);
    const expected = new Set(EXPECTED_INTENTS);

    const missingIntents: string[] = [];
    const extraIntents: string[] = [];

    // Check for missing intents
    for (const intent of EXPECTED_INTENTS) {
      if (!INTENT_DOMAINS[intent]) {
        missingIntents.push(intent);
      }
    }

    // Check for extra intents
    for (const intent of registeredIntents) {
      if (!expected.has(intent)) {
        extraIntents.push(intent);
      }
    }

    const passed = missingIntents.length === 0;
    const result: IntegrityCheckResult = {
      passed,
      expectedIntents: EXPECTED_INTENT_COUNT,
      foundIntents: registeredIntents.length,
      missingIntents,
      extraIntents,
      timestamp: new Date().toISOString(),
    };

    // Log result
    if (passed) {
      console.log(`[AI-INTEGRITY] ✅ All ${EXPECTED_INTENT_COUNT} intents registered correctly`);
    } else {
      console.error(`[AI-INTEGRITY] ❌ INTEGRITY CHECK FAILED`);
      console.error(`[AI-INTEGRITY] Expected: ${EXPECTED_INTENT_COUNT}, Found: ${result.foundIntents}`);
      if (missingIntents.length > 0) {
        console.error(`[AI-INTEGRITY] Missing intents: ${missingIntents.join(', ')}`);
      }
    }

    return result;
  } catch (error) {
    console.error('[AI-INTEGRITY] Error running integrity check:', error);
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

// Run integrity check at module load (cold start)
const integrityResult = runIntegrityCheck();

// ============================================================================
// PHASE 4: HEALTH SIGNALS
// ============================================================================

const FAIL_HARD_THRESHOLD = 0.1; // 10% fail-hard rate = degraded
const FAIL_HARD_CRITICAL = 0.2; // 20% fail-hard rate = critical
const REGENERATION_WARNING = 0.3; // 30% regeneration rate = warning

type HealthStatus = 'healthy' | 'degraded' | 'critical';

interface HealthSignal {
  status: HealthStatus;
  failHardRate: number;
  regenerationRate: number;
  topViolations: Array<{ ruleId: string; count: number }>;
  warnings: string[];
}

function calculateHealthSignal(): HealthSignal {
  try {
    const total = aiMetrics.totalGenerations;
    const warnings: string[] = [];

    // Calculate rates
    const failHardRate = total > 0 ? aiMetrics.failHards / total : 0;
    const regenerationRate = total > 0 ? aiMetrics.regenerations / total : 0;

    // Determine status
    let status: HealthStatus = 'healthy';

    if (failHardRate >= FAIL_HARD_CRITICAL) {
      status = 'critical';
      warnings.push(`CRITICAL: Fail-hard rate at ${(failHardRate * 100).toFixed(1)}%`);
    } else if (failHardRate >= FAIL_HARD_THRESHOLD) {
      status = 'degraded';
      warnings.push(`WARNING: Fail-hard rate at ${(failHardRate * 100).toFixed(1)}%`);
    }

    if (regenerationRate >= REGENERATION_WARNING) {
      warnings.push(`WARNING: High regeneration rate at ${(regenerationRate * 100).toFixed(1)}%`);
    }

    // Get top violations
    const topViolations = Object.entries(aiMetrics.violationsByRule)
      .map(([ruleId, count]) => ({ ruleId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Check for domain-specific issues
    for (const [domain, domainMetrics] of Object.entries(aiMetrics.byDomain)) {
      const domainTotal = domainMetrics.total;
      if (domainTotal >= 10) {
        const domainFailHardRate = domainMetrics.failHard / domainTotal;
        if (domainFailHardRate >= FAIL_HARD_THRESHOLD) {
          warnings.push(`WARNING: ${domain} domain fail-hard rate at ${(domainFailHardRate * 100).toFixed(1)}%`);
        }
      }
    }

    return {
      status,
      failHardRate,
      regenerationRate,
      topViolations,
      warnings,
    };
  } catch {
    return {
      status: 'healthy',
      failHardRate: 0,
      regenerationRate: 0,
      topViolations: [],
      warnings: [],
    };
  }
}
