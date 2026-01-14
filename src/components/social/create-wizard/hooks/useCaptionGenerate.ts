import { useState, useCallback } from 'react';
import type { Property } from '@/types';
import type { CaptionTone, Platform, PostIntent } from '../types';

interface GenerateCaptionParams {
  property: Property | null;
  context: string;
  tone: CaptionTone;
  platform: Platform | 'all';
  postIntent?: PostIntent;
  templateType?: string;
}

interface GenerateCaptionResult {
  success: boolean;
  caption: string;
  error?: string;
}

export function useCaptionGenerate() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCaption = useCallback(async (params: GenerateCaptionParams): Promise<GenerateCaptionResult> => {
    setIsGenerating(true);

    try {
      // Use the AI caption API
      const response = await fetch('/api/ai?action=caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: params.property,
          context: params.context,
          tone: params.tone,
          platform: params.platform,
          postIntent: params.postIntent || 'just-listed',
        }),
      });

      if (!response.ok) {
        // If new API fails, try fallback to old API
        console.warn('[Caption] New API failed, trying GHL API...');
        const fallbackResponse = await fetch('/api/ghl?resource=ai-caption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property: params.property,
            context: params.context,
            tone: params.tone,
            platform: params.platform,
            postIntent: params.postIntent,
          }),
        });

        if (!fallbackResponse.ok) {
          const fallbackCaption = generateFallbackCaption(params);
          return { success: true, caption: fallbackCaption };
        }

        const fallbackData = await fallbackResponse.json();
        return { success: true, caption: fallbackData.caption || generateFallbackCaption(params) };
      }

      const data = await response.json();
      return { success: true, caption: data.caption || generateFallbackCaption(params) };
    } catch (error) {
      console.error('Caption generation error:', error);
      // Return fallback caption instead of failing
      const fallbackCaption = generateFallbackCaption(params);
      return { success: true, caption: fallbackCaption };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateCaption,
    isGenerating,
  };
}

// Determine the domain for an intent
type IntentDomain = 'property' | 'personal' | 'professional';

function getIntentDomain(intent: PostIntent): IntentDomain {
  const personalIntents: PostIntent[] = ['life-update', 'milestone', 'lesson-insight', 'behind-the-scenes'];
  const professionalIntents: PostIntent[] = [
    'market-update', 'buyer-tips', 'seller-tips', 'investment-insight',
    'client-success-story', 'community-spotlight', 'personal-value', 'success-story'
  ];

  if (personalIntents.includes(intent)) return 'personal';
  if (professionalIntents.includes(intent)) return 'professional';
  return 'property';
}

// Generate a structured fallback caption when AI is unavailable
// Uses the same template format as the structured caption API v2
// CRITICAL: Respects domain isolation - Personal/Professional NEVER use property data
function generateFallbackCaption(params: GenerateCaptionParams): string {
  const { property, context, tone, postIntent } = params;
  const intent = postIntent || 'just-listed';
  const domain = getIntentDomain(intent);

  // Intent-specific headers
  const city = property?.city || 'your area';
  const intentHeaders: Record<PostIntent, string> = {
    // Property intents
    'just-listed': `🏠 JUST LISTED in ${city}!`,
    sold: `🎉 SOLD in ${city}!`,
    'under-contract': `📝 UNDER CONTRACT in ${city}!`,
    'price-reduced': `💰 PRICE REDUCED in ${city}!`,
    'price-drop': `💰 PRICE DROP in ${city}!`,
    'open-house': `🚪 OPEN HOUSE in ${city}!`,
    'coming-soon': `👀 COMING SOON in ${city}!`,
    investment: `📈 INVESTMENT OPPORTUNITY in ${city}!`,
    // Personal intents
    'life-update': `🌟 A little update from me...`,
    milestone: `🏆 Milestone achieved!`,
    'lesson-insight': `💡 Something I learned recently...`,
    'behind-the-scenes': `🎬 Behind the scenes...`,
    // Professional intents
    'market-update': `📊 Market Update`,
    'buyer-tips': `🏡 Buyer Tip`,
    'seller-tips': `🏷️ Seller Tip`,
    'investment-insight': `💹 Investment Insight`,
    'client-success-story': `⭐ Client Success Story`,
    'community-spotlight': `🏘️ Community Spotlight`,
    // Legacy intents
    'personal-value': `💡 Pro Tip`,
    'success-story': `⭐ Success Story`,
    general: '',
  };

  // Intent-specific CTAs
  const intentCTAs: Record<PostIntent, string> = {
    // Property intents
    'just-listed': 'Interested? DM us to schedule your private showing.',
    sold: "Thinking of selling? Let's chat about your goals.",
    'under-contract': 'Missed this one? More coming soon. DM to be first.',
    'price-reduced': "Better price, same amazing home. Let's talk.",
    'price-drop': "Don't miss this opportunity. DM for details.",
    'open-house': 'Stop by — no appointment needed!',
    'coming-soon': 'Want first access? DM to get on the list.',
    investment: 'Serious inquiries only. DM for the full breakdown.',
    // Personal intents
    'life-update': "What's new with you? Let me know in the comments!",
    milestone: 'Thank you for being part of this journey!',
    'lesson-insight': 'What do you think? Let me know below.',
    'behind-the-scenes': 'Any questions about what I do? Ask away!',
    // Professional intents
    'market-update': "Questions about the market? Let's chat.",
    'buyer-tips': 'Thinking of buying? DM me your questions.',
    'seller-tips': 'Thinking of selling? DM me your questions.',
    'investment-insight': 'Want to talk numbers? DM me.',
    'client-success-story': "Ready to write your own success story? Let's talk.",
    'community-spotlight': 'Know another local gem? Tag them below!',
    // Legacy intents
    'personal-value': 'Questions? DM me anytime.',
    'success-story': "Ready to write your own success story? Let's talk.",
    general: 'DM us anytime.',
  };

  const header = intentHeaders[intent] || '';
  const cta = intentCTAs[intent] || 'DM us anytime.';

  // ========================================
  // PERSONAL DOMAIN - Use context as body copy
  // ========================================
  if (domain === 'personal') {
    // Extract the main content from context
    let bodyCopy = '';

    if (context) {
      // Parse structured context (e.g., "What's your update?: i got 8 hours of sleep")
      const lines = context.split('\n').filter(line => line.trim());
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const value = line.substring(colonIndex + 1).trim();
          if (value) {
            bodyCopy = value;
            break;
          }
        }
      }
      // If no structured format, use the raw context
      if (!bodyCopy) {
        bodyCopy = context.trim();
      }
    }

    // If still no body copy, use a generic personal message
    if (!bodyCopy) {
      bodyCopy = "Just wanted to share a quick update with you all.";
    }

    return `${header}

${bodyCopy}

${cta}

Purple Homes | Your Trusted Real Estate Partner`;
  }

  // ========================================
  // PROFESSIONAL DOMAIN - Use context as body copy
  // ========================================
  if (domain === 'professional') {
    let bodyCopy = '';

    if (context) {
      // Parse structured context
      const lines = context.split('\n').filter(line => line.trim());
      const parsedFields: Record<string, string> = {};

      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim().toLowerCase();
          const value = line.substring(colonIndex + 1).trim();
          if (value) {
            parsedFields[key] = value;
          }
        }
      }

      // Build body copy from parsed fields or raw context
      const fieldValues = Object.values(parsedFields);
      if (fieldValues.length > 0) {
        bodyCopy = fieldValues.join('\n\n');
      } else {
        bodyCopy = context.trim();
      }
    }

    // If still no body copy, use a generic professional message
    if (!bodyCopy) {
      bodyCopy = "Here's something valuable I wanted to share with you.";
    }

    return `${header}

${bodyCopy}

${cta}

Purple Homes | Your Trusted Real Estate Partner`;
  }

  // ========================================
  // PROPERTY DOMAIN - Use property data
  // ========================================
  if (!property) {
    // Property domain but no property selected - this shouldn't happen
    // but handle gracefully with a generic message
    return `${header || '🏠 New Opportunity!'}

A new property opportunity is available. Contact us for details.

DM us anytime.

Purple Homes | Your Trusted Real Estate Partner`;
  }

  const { address, beds, baths, sqft, price } = property;

  // Tone-specific body copy for property posts
  const toneBodies: Record<CaptionTone, string> = {
    professional:
      'This property offers exceptional value in a sought-after location. An opportunity worth exploring for discerning buyers.',
    casual:
      "Okay, this one's pretty special! Great location, solid bones, and tons of potential. Definitely worth checking out.",
    urgent:
      "Just hit the market and already generating interest. At this price point? It won't last long. Time to move.",
    friendly:
      'A wonderful home in a great neighborhood. Perfect for those looking to put down roots.',
    luxury:
      'A residence of distinction for those who appreciate refined living. Every detail speaks to quality and craftsmanship.',
    investor:
      'The numbers on this one are solid. Strong fundamentals, good location, and real upside potential. Worth running the analysis.',
  };

  const bodyCopy = toneBodies[tone] || toneBodies.professional;

  // Build structured caption for property
  let caption = `${header}\n\n`;

  // Property details
  if (address) caption += `📍 ${address}\n`;
  if (price) caption += `💰 $${price.toLocaleString()}\n`;
  if (beds || baths || sqft) {
    const specs: string[] = [];
    if (beds) specs.push(`${beds} Beds`);
    if (baths) specs.push(`${baths} Baths`);
    if (sqft) specs.push(`${sqft.toLocaleString()} SF`);
    caption += `🏡 ${specs.join(' • ')}\n`;
  }

  // Body copy
  caption += `\n${bodyCopy}\n\n`;

  // CTA
  caption += `${cta}\n\n`;

  // Tagline
  caption += 'Purple Homes | Your Trusted Real Estate Partner';

  return caption;
}
