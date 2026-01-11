/**
 * AI API - Consolidated endpoint for AI-powered features
 *
 * Routes:
 * - action=insights (POST) - Generate match insights
 * - action=caption (POST) - Generate social media captions
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
    default:
      return res.status(400).json({
        error: 'Unknown action',
        validActions: ['insights', 'caption'],
      });
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
// CAPTION GENERATION (from api/social/generate-caption.ts)
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
}

interface CaptionResponse {
  caption: string;
  platform: string;
}

async function handleCaption(req: VercelRequest, res: VercelResponse) {
  const { property, context, postIntent, tone, platform }: CaptionRequest = req.body;

  if (!postIntent || !tone || !platform) {
    return res.status(400).json({ error: 'Missing required fields: postIntent, tone, platform' });
  }

  if (!OPENAI_API_KEY) {
    console.error('[AI API] OpenAI API key not configured');
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const systemPrompt = buildCaptionSystemPrompt();
    const userPrompt = buildCaptionUserPrompt({ property, context, postIntent, tone, platform });

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
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI API] OpenAI error:', errorText);
      return res.status(500).json({ error: 'Failed to generate caption' });
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content?.trim() || '';

    if (!caption) {
      return res.status(500).json({ error: 'Empty response from OpenAI' });
    }

    const result: CaptionResponse = { caption, platform };
    return res.status(200).json(result);
  } catch (error) {
    console.error('[AI API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function buildCaptionSystemPrompt(): string {
  return `You are a real estate social media copywriter. You create STRUCTURED, SCANNABLE captions with emojis and bullet points.

CRITICAL RULES - MUST FOLLOW EXACTLY:
1. PRESERVE THE EXACT STRUCTURE from the template - every line, every emoji, every bullet point
2. DO NOT write prose paragraphs - use the template's line-by-line format
3. KEEP all emojis exactly as shown in the template (🏠 📍 💰 🏡 etc.)
4. KEEP the bullet point format (Beds • Baths • SF)
5. Replace ONLY the {placeholders} with property data
6. Write body copy = 2-4 SHORT sentences matching the tone
7. Choose ONE CTA from provided options
8. NEVER add extra sections or change the layout
9. NEVER write formal prose - keep it punchy and structured
10. NEVER include hashtags

OUTPUT FORMAT: Copy the template structure EXACTLY, just fill in the blanks. No explanations, no extra text.`;
}

function buildCaptionUserPrompt(params: CaptionRequest): string {
  const { property, context, postIntent, tone, platform } = params;

  const structureTemplate = getCaptionStructureTemplate(postIntent, property);
  const toneInstructions = getCaptionToneInstructions(tone);
  const ctaOptions = getCaptionCTAOptions(postIntent);

  const propertyContext = property
    ? `
PROPERTY DATA:
- Address: ${property.address || 'TBD'}
- City: ${property.city || 'TBD'}
- Price: $${property.price?.toLocaleString() || 'TBD'}
- Beds: ${property.beds || 'TBD'}
- Baths: ${property.baths || 'TBD'}
- SqFt: ${property.sqft?.toLocaleString() || 'TBD'}
- Type: ${property.propertyType || 'Single Family'}
${property.description ? `- Description: ${property.description}` : ''}
${property.arv ? `- ARV: $${property.arv.toLocaleString()}` : ''}
${property.repairCost ? `- Repair Estimate: $${property.repairCost.toLocaleString()}` : ''}`
    : '';

  const additionalContext = context
    ? `
ADDITIONAL CONTEXT (inform body copy, don't copy):
${context}`
    : '';

  return `COPY THIS EXACT STRUCTURE (preserve all emojis, line breaks, bullet points):

═══════════════════════════════════════════════════════════════
TEMPLATE TO COPY:
═══════════════════════════════════════════════════════════════
${structureTemplate}
═══════════════════════════════════════════════════════════════

${propertyContext}
${additionalContext}

TONE FOR BODY COPY: ${tone.toUpperCase()}
${toneInstructions}

CTA OPTIONS (pick one):
${ctaOptions.map((cta) => `- "${cta}"`).join('\n')}

═══════════════════════════════════════════════════════════════
CRITICAL INSTRUCTIONS:
═══════════════════════════════════════════════════════════════
1. COPY the template line-by-line with ALL emojis and formatting
2. Replace {address} with actual address, {price} with actual price, etc.
3. Replace {body_copy} with 2-4 SHORT sentences in ${tone} tone
4. Replace {cta} with ONE option from the CTA list above
5. DO NOT write paragraphs - keep the structured bullet format
6. DO NOT add "New to market:" or prose intros - start with the emoji header
7. Output ONLY the filled template - no explanations

NOW OUTPUT THE FILLED TEMPLATE:`;
}

function getCaptionStructureTemplate(intent: string, property: Property | null): string {
  const city = property?.city || '{city}';

  const templates: Record<string, string> = {
    'just-listed': `🏠 JUST LISTED in ${city}!

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    sold: `🎉 SOLD in ${city}!

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'under-contract': `📝 UNDER CONTRACT in ${city}!

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'price-reduced': `💰 PRICE REDUCED in ${city}!

📍 {address}
💰 NOW {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'open-house': `🚪 OPEN HOUSE in ${city}!

📅 {date} | ⏰ {time}
📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'coming-soon': `👀 COMING SOON in ${city}!

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    investment: `📈 INVESTMENT OPPORTUNITY in ${city}!

📍 {address}
💰 Asking: {price}
📊 ARV: {arv} | Potential Profit: {profit}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'market-update': `📊 MARKET UPDATE: ${city}

{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    general: `{body_copy}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,
  };

  return templates[intent] || templates['just-listed'];
}

function getCaptionToneInstructions(tone: string): string {
  const instructions: Record<string, string> = {
    professional: `Professional tone: Polished, authoritative, value-focused. Words: exceptional, premier, ideal, distinguished.`,
    casual: `Casual tone: Conversational, friendly, relatable. Words: honestly, love this, pretty amazing, check this out.`,
    urgent: `Urgent tone: Time-sensitive, action-oriented, punchy sentences. Words: just listed, won't last, moving fast, act now.`,
    friendly: `Friendly tone: Warm, welcoming, lifestyle-focused. Words: imagine, picture this, your next chapter, home sweet home.`,
    luxury: `Luxury tone: Sophisticated, understated elegance. Words: exquisite, curated, bespoke, refined, residence.`,
    investor: `Investor tone: Numbers-focused, analytical, ROI-driven. Words: cap rate, cash flow, ARV, upside, deal.`,
  };
  return instructions[tone] || instructions.professional;
}

function getCaptionCTAOptions(intent: string): string[] {
  const ctas: Record<string, string[]> = {
    'just-listed': [
      'Interested? DM us to schedule your private showing.',
      'Want to see it first? Send us a message.',
      "Comment 'INFO' for all the details.",
    ],
    sold: [
      "Thinking of selling? Let's chat about your goals.",
      "Want results like this? Let's talk.",
    ],
    'under-contract': [
      'Missed this one? More coming soon. DM to be first.',
      'Want first access to the next one? Follow for updates.',
    ],
    'price-reduced': [
      "Better price, same amazing home. Let's talk.",
      "Now's your chance. DM before someone else does.",
    ],
    'open-house': ['Stop by — no appointment needed!', "We'd love to see you there!"],
    'coming-soon': [
      'Want first access? DM to get on the list.',
      "Comment 'NOTIFY' to be the first to know.",
    ],
    investment: [
      'Serious inquiries only. DM for the full breakdown.',
      'Want the numbers? Send us a message.',
    ],
    'market-update': [
      "Questions about the market? Let's chat.",
      'Want personalized advice? DM us.',
    ],
    general: ["Questions? We're here to help.", 'DM us anytime.'],
  };
  return ctas[intent] || ctas['just-listed'];
}
