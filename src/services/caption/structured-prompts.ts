/**
 * Structured Caption Generation System v2
 *
 * Key Principle: Structure is FIXED per post intent. Tone affects BODY COPY only.
 *
 * Every caption follows:
 * [HEADER LINE - Intent specific]
 * [PROPERTY DETAILS - Emoji bullets]
 * [BODY COPY - 2-4 sentences, tone affects this]
 * [CALL TO ACTION - Intent specific]
 * [TAGLINE]
 */

import type { Property } from '@/types';
import type { PostIntent, CaptionTone, Platform } from '@/components/social/create-wizard/types';

export interface StructuredCaptionParams {
  property: Property | null;
  context: string;
  postIntent: PostIntent;
  tone: CaptionTone;
  platform: Platform;
}

/**
 * System prompt for structured caption generation
 */
export function buildStructuredSystemPrompt(): string {
  return `You are a real estate social media copywriter. You create structured, scannable captions that perform well on social media.

YOUR RULES:
1. ALWAYS follow the exact structure template provided
2. Fill in the bracketed placeholders with property data
3. Write body copy that matches the specified TONE
4. Keep body copy to 2-4 sentences MAX
5. Never add extra sections or change the structure
6. Never copy-paste the context verbatim — use it to inform your body copy
7. Hashtags are handled separately — never include them

OUTPUT FORMAT:
- Output ONLY the caption text
- Use the exact emoji bullets shown in the template
- Maintain line breaks as shown
- No explanations or alternatives`;
}

/**
 * Build user prompt with structure template
 */
export function buildStructuredUserPrompt(params: StructuredCaptionParams): string {
  const { property, context, postIntent, tone, platform } = params;

  // Get the structure template
  const structureTemplate = getStructureTemplate(postIntent, property);

  // Get tone instructions for body copy
  const toneInstructions = getToneInstructions(tone);

  // Get CTA options
  const ctaOptions = getCTAOptions(postIntent);

  // Get platform-specific adjustments
  const platformNotes = getPlatformNotes(platform);

  // Property context
  const propertyContext = property
    ? `
PROPERTY DATA:
- Address: ${property.address || 'TBD'}
- City: ${property.city || 'TBD'}
- State: ${property.state || ''}
- Price: $${property.price?.toLocaleString() || 'TBD'}
${property.downPayment ? `- Down Payment: $${property.downPayment.toLocaleString()} (HIGHLIGHT THIS for entry cost - shows affordability!)` : ''}
${property.monthlyPayment ? `- Monthly Payment: $${property.monthlyPayment.toLocaleString()}/mo (HIGHLIGHT THIS for affordability - more relatable than listing price!)` : ''}
- Beds: ${property.beds || 'TBD'}
- Baths: ${property.baths || 'TBD'}
- SqFt: ${property.sqft?.toLocaleString() || 'TBD'}
- Property Type: ${property.propertyType || 'Single Family'}
${property.description ? `- Description: ${property.description}` : ''}
${property.arv ? `- ARV: $${property.arv.toLocaleString()}` : ''}
${property.repairCost ? `- Repair Estimate: $${property.repairCost.toLocaleString()}` : ''}`
    : '';

  const additionalContext = context
    ? `
ADDITIONAL CONTEXT (use to inform body copy, do NOT copy verbatim):
${context}`
    : '';

  return `Generate a ${platform} caption using this EXACT structure:

═══════════════════════════════════════════════════════════════
STRUCTURE TEMPLATE (follow exactly):
═══════════════════════════════════════════════════════════════
${structureTemplate}
═══════════════════════════════════════════════════════════════

${propertyContext}
${additionalContext}

═══════════════════════════════════════════════════════════════
BODY COPY TONE: ${tone.toUpperCase()}
${toneInstructions}
═══════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════
CTA OPTIONS (choose one that fits):
${ctaOptions.map((cta) => `- "${cta}"`).join('\n')}
═══════════════════════════════════════════════════════════════

${platformNotes}

IMPORTANT:
1. Replace all {placeholders} with actual property data
2. Write body copy in the specified TONE (2-4 sentences)
3. Choose ONE appropriate CTA from the options
4. Keep the exact structure and emoji formatting
5. Do NOT add hashtags

Generate the caption now:`;
}

/**
 * Get structure template for each post intent
 */
export function getStructureTemplate(intent: PostIntent, property: Property | null): string {
  const city = property?.city || '{city}';

  const templates: Record<PostIntent, string> = {
    'just-listed': `🏠 JUST LISTED in ${city}!

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy - 2-4 sentences in the specified tone}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    sold: `🎉 SOLD in ${city}!

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy - 2-4 sentences in the specified tone}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'under-contract': `📝 UNDER CONTRACT in ${city}!

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy - 2-4 sentences in the specified tone}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'price-reduced': `💰 PRICE REDUCED in ${city}!

📍 {address}
💰 NOW {new_price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy - 2-4 sentences in the specified tone}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'open-house': `🚪 OPEN HOUSE in ${city}!

📅 {date} | ⏰ {time}
📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy - 2-4 sentences in the specified tone}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'coming-soon': `👀 COMING SOON in ${city}!

📍 {address}
💰 {price}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy - 2-4 sentences in the specified tone}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    investment: `📈 INVESTMENT OPPORTUNITY in ${city}!

📍 {address}
💰 Asking: {price}
📊 ARV: {arv} | Potential Profit: {potential_profit}
🏡 {beds} Beds • {baths} Baths • {sqft} SF

{body_copy - 2-4 sentences in the specified tone}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    'market-update': `📊 MARKET UPDATE: ${city}

{body_copy - 3-5 sentences with market insights}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,

    general: `{header}

{body_copy - 2-4 sentences in the specified tone}

{cta}

Purple Homes | Your Trusted Real Estate Partner`,
  };

  return templates[intent] || templates.general;
}

/**
 * Get tone-specific instructions for body copy
 */
export function getToneInstructions(tone: CaptionTone): string {
  const instructions: Record<CaptionTone, string> = {
    professional: `Write body copy that is:
- Polished and authoritative
- Focused on value and features
- Confident but not boastful
- Uses words like: exceptional, premier, distinguished, ideal
Example: "This impeccably maintained home offers the perfect blend of comfort and convenience. Ideally situated in a sought-after neighborhood, it presents an exceptional opportunity for discerning buyers."`,

    casual: `Write body copy that is:
- Conversational and relatable
- Like talking to a friend
- Can use contractions and light humor
- Uses words like: honestly, pretty amazing, love this, check this out
Example: "Okay, can we talk about this kitchen? 😍 Honestly, this one checks all the boxes. If I was looking right now, I'd already be scheduling a tour."`,

    urgent: `Write body copy that is:
- Time-sensitive and action-oriented
- Creates genuine scarcity (if true)
- Short, punchy sentences
- Uses words like: just listed, won't last, moving fast, act now
Example: "Just listed this morning and already generating buzz. At this price point? It won't last the week. The time to move is now."`,

    friendly: `Write body copy that is:
- Warm and welcoming
- Paints a lifestyle picture
- Emotionally engaging
- Uses words like: imagine, picture this, your next chapter, home sweet home
Example: "Picture this: weekend barbecues in that backyard, movie nights in that cozy living room, making memories in a place you'll love coming home to."`,

    luxury: `Write body copy that is:
- Sophisticated and elevated
- Understated elegance (don't oversell)
- Appeals to discerning taste
- Uses words like: exquisite, curated, bespoke, refined, residence
Example: "A residence of distinction for those who appreciate architectural excellence and refined living. Every detail has been thoughtfully curated."`,

    investor: `Write body copy that is:
- Numbers-focused and analytical
- ROI and cash flow oriented
- Direct and no-fluff
- Uses words like: cap rate, cash flow, ARV, upside potential, numbers
Example: "The numbers speak for themselves: strong rental demand, solid cash flow potential, and significant equity upside. This is a deal that pencils out."`,
  };

  return instructions[tone] || instructions.professional;
}

/**
 * Get CTA options for each post intent
 */
export function getCTAOptions(intent: PostIntent): string[] {
  const ctas: Record<PostIntent, string[]> = {
    'just-listed': [
      'Interested? DM us to schedule your private showing.',
      'Want to see it first? Send us a message.',
      "Comment 'INFO' for all the details.",
      "Ready to tour? Let's make it happen.",
    ],
    sold: [
      "Thinking of selling? Let's chat about your goals.",
      "Want results like this? Let's talk.",
      "Looking for your dream home? We'd love to help.",
      'Congrats to our amazing buyers! 🎉',
    ],
    'under-contract': [
      'Missed this one? More coming soon. DM to be first.',
      "Don't worry — we have more great options. Message us.",
      'Want first access to the next one? Follow for updates.',
    ],
    'price-reduced': [
      "Better price, same amazing home. Let's talk.",
      "Now's your chance. DM before someone else does.",
      "Interested? Let's schedule a showing.",
    ],
    'open-house': [
      'Stop by — no appointment needed!',
      "We'd love to see you there!",
      'Mark your calendar and bring your questions.',
      'See you this weekend!',
    ],
    'coming-soon': [
      'Want first access? DM to get on the list.',
      'Follow for the full reveal.',
      "Comment 'NOTIFY' to be the first to know.",
    ],
    investment: [
      'Serious inquiries only. DM for the full breakdown.',
      'Want the numbers? Send us a message.',
      "Ready to run the numbers together? Let's talk.",
    ],
    'market-update': [
      "Questions about the market? Let's chat.",
      "Thinking about buying or selling? Now's a great time to strategize.",
      'Want personalized advice? DM us.',
    ],
    general: ["Questions? We're here to help.", 'DM us anytime.', "Let's connect!"],
  };

  return ctas[intent] || ctas.general;
}

/**
 * Get platform-specific notes
 */
export function getPlatformNotes(platform: Platform): string {
  const notes: Record<Platform, string> = {
    facebook: `PLATFORM NOTES (Facebook):
- This length and format works well
- Emojis are appropriate
- Can be slightly longer if needed`,

    instagram: `PLATFORM NOTES (Instagram):
- Keep it scannable
- First line is crucial (shows before "...more")
- Emojis help with visual breaks
- This format performs well on IG`,

    linkedin: `PLATFORM NOTES (LinkedIn):
- Keep the structure but tone down emojis slightly
- More professional audience
- Can emphasize market/investment angle
- Replace playful emojis with more neutral ones if needed`,
  };

  return notes[platform] || notes.facebook;
}
