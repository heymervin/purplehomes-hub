import type { Property } from '@/types';
import type { CaptionTone, Platform } from '@/components/social/create-wizard/types';

export interface CaptionGenerationParams {
  property: Property | null;
  context: string;
  tone: CaptionTone;
  platform: Platform;
  templateType?: string;
}

/**
 * Build the system prompt for caption generation
 */
export function buildCaptionSystemPrompt(): string {
  return `You are a world-class real estate copywriter with 15+ years of experience writing high-converting social media content. You've worked with luxury brokerages, investment firms, and top-producing agents.

YOUR WRITING PRINCIPLES:
1. NEVER copy-paste the property description or context verbatim
2. ALWAYS rewrite and weave details naturally into compelling copy
3. Lead with emotion, support with facts
4. Every sentence must earn its place — no filler
5. Write like you're talking to ONE person, not "buyers" or "investors"
6. Use specific details to create vivid mental images
7. End with ONE clear call-to-action (not multiple)

WHAT MAKES GREAT REAL ESTATE COPY:
- Opens with a hook that stops the scroll
- Paints a picture of the lifestyle, not just the house
- Uses power words: stunning, rare, exceptional, coveted, pristine
- Creates urgency without being pushy or fake
- Speaks to the buyer's aspirations and desires
- Includes social proof when possible
- Has rhythm — mix short punchy sentences with longer ones

WHAT TO AVOID:
- Generic phrases like "Don't miss out!" or "Act fast!"
- Listing features without benefits
- Copy-pasting the description at the end
- Starting with "Looking for..." or "Are you searching for..."
- Exclamation points on every sentence!!!
- Emojis overload 🏠🏡🏠🔑💰🎉
- Writing that sounds like every other agent

FORMATTING RULES:
- Use line breaks for readability
- 2-4 emojis maximum, strategically placed
- Hashtags go at the END, separated from main copy
- Keep paragraphs short (2-3 sentences max)`;
}

/**
 * Build the user prompt based on parameters
 */
export function buildCaptionUserPrompt(params: CaptionGenerationParams): string {
  const { property, context, tone, platform, templateType } = params;

  // Build property details section
  let propertyDetails = '';
  if (property) {
    propertyDetails = `
PROPERTY DATA:
- Address: ${property.address || 'Not provided'}
- City: ${property.city || 'Not provided'}
- State: ${property.state || 'Not provided'}
- Price: ${property.price ? `$${property.price.toLocaleString()}` : 'Not provided'}
${property.downPayment ? `- Down Payment: $${property.downPayment.toLocaleString()} (IMPORTANT: Use this to show entry cost/affordability!)` : ''}
${property.monthlyPayment ? `- Monthly Payment: $${property.monthlyPayment.toLocaleString()}/mo (IMPORTANT: Use this for affordability messaging!)` : ''}
- Bedrooms: ${property.beds || 'Not provided'}
- Bathrooms: ${property.baths || 'Not provided'}
- Square Feet: ${property.sqft ? property.sqft.toLocaleString() : 'Not provided'}
- Property Type: ${property.propertyType || 'Not provided'}
- Condition: ${property.condition || 'Not provided'}
${property.description ? `- Description: ${property.description}` : ''}`;
  }

  // Context section
  const contextSection = context
    ? `\nADDITIONAL CONTEXT (use to inform your writing, do NOT copy verbatim):\n${context}`
    : '';

  // Tone instructions
  const toneInstructions = getToneInstructions(tone);

  // Platform instructions
  const platformInstructions = getPlatformInstructions(platform);

  // Template type instructions
  const templateInstructions = getTemplateInstructions(templateType);

  return `Write a ${platform.toUpperCase()} caption for this real estate post.

${propertyDetails}
${contextSection}

TONE: ${tone.toUpperCase()}
${toneInstructions}

PLATFORM: ${platform.toUpperCase()}
${platformInstructions}

${templateInstructions}

IMPORTANT REMINDERS:
- The "Additional Context" is background info for YOU — do not paste it into the caption
- Extract the key selling points and rewrite them in your own compelling words
- Make sure every detail serves the story you're telling
- Write something you'd be proud to show a luxury brokerage as a portfolio piece

Write the caption now. Output ONLY the caption text, no explanations or alternatives.`;
}

/**
 * Get tone-specific instructions
 */
function getToneInstructions(tone: CaptionTone): string {
  const instructions: Record<CaptionTone, string> = {
    professional: `
- Polished, authoritative language
- Focus on value proposition and market positioning
- Avoid slang or overly casual phrases
- Convey expertise and trustworthiness
- Example vibe: "A rare opportunity in one of the city's most coveted neighborhoods."`,

    casual: `
- Warm, conversational, like texting a friend
- Use contractions (you'll, it's, don't)
- Can include light humor or personality
- Relatable and approachable
- Example vibe: "Okay but can we talk about this kitchen? 😍"`,

    urgent: `
- Create genuine urgency without being salesy
- Highlight scarcity, timing, or market conditions
- Use active, present-tense language
- Imply demand without desperation
- Example vibe: "Just listed this morning. Based on recent activity, I don't expect this to last the week."`,

    friendly: `
- Warm, welcoming, community-focused
- Emphasize lifestyle and neighborhood
- Paint a picture of daily life there
- Inclusive language
- Example vibe: "Picture this: Sunday morning coffee on that patio, kids playing in the yard..."`,

    luxury: `
- Sophisticated, elevated vocabulary
- Focus on exclusivity and craftsmanship
- Understated elegance (don't oversell)
- Appeal to discerning buyers
- Example vibe: "For those who appreciate the finer details, this residence delivers."`,

    investor: `
- Numbers-focused, ROI-driven
- Highlight cash flow, appreciation potential, cap rates
- Business-like but not boring
- Appeal to analytical mindset
- Example vibe: "At $185K with a projected ARV of $245K, the numbers speak for themselves."`,
  };

  return instructions[tone] || instructions.professional;
}

/**
 * Get platform-specific instructions
 */
function getPlatformInstructions(platform: Platform): string {
  const instructions: Record<Platform, string> = {
    facebook: `
- Length: 150-300 words (Facebook rewards longer, engaging content)
- Can tell a mini-story or paint a lifestyle picture
- Okay to be more detailed and conversational
- End with a soft call-to-action (comment, DM, share thoughts)
- 2-3 relevant emojis, not overdone
- DO NOT include hashtags in the main copy (add separately if needed)`,

    instagram: `
- Length: 100-200 words (punchy, scannable)
- First line is CRUCIAL — it's the hook before "...more"
- Visual language that complements the image
- Lifestyle-focused, aspirational
- 2-4 strategic emojis
- Line breaks for readability
- Hashtags go at the END, separated by line breaks`,

    linkedin: `
- Length: 150-250 words
- Professional, value-driven
- Can include market insights or industry perspective
- Position yourself as a trusted advisor
- Minimal emojis (0-2 max)
- NO hashtags in the main copy (add at end if any)
- End with thought-provoking question or clear CTA`,
  };

  return instructions[platform] || instructions.facebook;
}

/**
 * Get template type instructions
 */
function getTemplateInstructions(templateType?: string): string {
  if (!templateType || templateType === 'none') {
    return 'TEMPLATE TYPE: General listing post — focus on the property\'s best features and lifestyle appeal.';
  }

  const templates: Record<string, string> = {
    'new-listing': `
TEMPLATE TYPE: NEW LISTING ANNOUNCEMENT
- Lead with excitement/exclusivity of being first to market
- "Just hit the market" energy
- Emphasize freshness, opportunity
- Create urgency through newness, not pressure`,

    'just-listed': `
TEMPLATE TYPE: JUST LISTED
- Similar to new listing but can be slightly more detailed
- Focus on the "reveal" moment
- Build anticipation
- Invite engagement (tours, questions)`,

    'price-reduced': `
TEMPLATE TYPE: PRICE REDUCTION
- Frame as opportunity, not desperation
- "Now even more attainable" angle
- Mention original value is still there
- Create urgency around new price point
- Never say "price slashed" or sound desperate`,

    'open-house': `
TEMPLATE TYPE: OPEN HOUSE INVITATION
- Focus on the experience of visiting
- Include date/time clearly but naturally
- Paint a picture of what they'll see
- Make it feel like an exclusive event
- Clear logistics without being a bulletin board`,

    'just-sold': `
TEMPLATE TYPE: JUST SOLD / SUCCESS STORY
- Celebrate without bragging
- Thank clients (if appropriate)
- Subtle social proof of your effectiveness
- "Another family found their home" angle
- Invite others who want similar results`,

    'under-contract': `
TEMPLATE TYPE: UNDER CONTRACT
- Build FOMO without being obnoxious
- Celebrate the milestone
- Hint at demand/multiple offers if true
- Invite buyers who missed out to reach out
- Keep it classy`,

    'investment': `
TEMPLATE TYPE: INVESTMENT OPPORTUNITY
- Lead with the numbers that matter
- ARV, potential profit, cash flow
- Speak to investor mindset
- Be specific with projections
- Clear "serious inquiries" CTA`,

    'market-update': `
TEMPLATE TYPE: MARKET UPDATE / INSIGHT
- Position yourself as local expert
- Share genuine insight, not generic stats
- Connect market data to buyer/seller decisions
- Educational but not boring
- End with how you can help`,

    'coming-soon': `
TEMPLATE TYPE: COMING SOON / TEASER
- Build anticipation
- Reveal just enough to intrigue
- "Stay tuned" energy
- Encourage engagement to be notified
- Create exclusivity`,
  };

  return templates[templateType] || templates['new-listing'];
}
