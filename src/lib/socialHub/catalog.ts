/**
 * Social Hub Catalog
 *
 * Central catalog for tabs, intents, templates, and tones.
 * This is the single source of truth for all Social Hub options.
 */

import {
  IntentDefinition,
  TemplateDefinition,
  ToneDefinition,
  TabDefinition,
} from './types';

// ============ TABS ============
export const TABS: TabDefinition[] = [
  {
    id: 'property',
    label: 'Property',
    icon: '🏠',
    description: 'Posts about specific property listings',
  },
  {
    id: 'personal',
    label: 'Personal',
    icon: '👤',
    description: 'Personal brand and life updates',
  },
  {
    id: 'professional',
    label: 'Professional',
    icon: '💼',
    description: 'Market insights, tips, and client stories',
  },
];

// ============ TONES ============
export const TONES: ToneDefinition[] = [
  { id: 'professional', label: 'Professional', icon: '👔', description: 'Business-appropriate, polished' },
  { id: 'friendly', label: 'Friendly', icon: '😊', description: 'Warm, approachable' },
  { id: 'luxury', label: 'Luxury', icon: '✨', description: 'High-end, sophisticated' },
  { id: 'urgent', label: 'Urgent', icon: '⚡', description: 'Time-sensitive, action-driven' },
  { id: 'casual', label: 'Casual', icon: '😎', description: 'Relaxed, conversational' },
  { id: 'investor', label: 'Investor', icon: '📈', description: 'Data-focused, ROI-oriented' },
];

// ============ TEMPLATES ============
export const TEMPLATES: TemplateDefinition[] = [
  { id: 'just-listed', label: 'Just Listed', icon: '🏷️', requiresProperty: true },
  { id: 'just-sold', label: 'Just Sold', icon: '🎉', requiresProperty: true },
  { id: 'open-house', label: 'Open House', icon: '🚪', requiresProperty: true },
  { id: 'price-drop', label: 'Price Drop', icon: '💰', requiresProperty: true },
  { id: 'coming-soon', label: 'Coming Soon', icon: '👀', requiresProperty: true },
  { id: 'value-tips', label: 'Value Tips', icon: '💡', requiresProperty: false },
  { id: 'success-story', label: 'Success Story', icon: '⭐', requiresProperty: false },
  { id: 'custom', label: 'Custom Image', icon: '📷', requiresProperty: false },
  { id: 'none', label: 'Text Only', icon: '📝', requiresProperty: false },
];

// ============ INTENTS ============
export const INTENTS: IntentDefinition[] = [
  // -----------------
  // PROPERTY TAB
  // -----------------
  {
    id: 'just-listed',
    tab: 'property',
    label: 'Just Listed',
    icon: '🏷️',
    description: 'Announce a new property on the market',
    requiresProperty: true,
    defaultTone: 'urgent',
    fields: [],
    allowedTemplates: ['just-listed', 'custom', 'none'],
  },
  {
    id: 'sold',
    tab: 'property',
    label: 'Just Sold',
    icon: '🎉',
    description: 'Celebrate a successful sale',
    requiresProperty: true,
    defaultTone: 'professional',
    fields: [],
    allowedTemplates: ['just-sold', 'custom', 'none'],
  },
  {
    id: 'open-house',
    tab: 'property',
    label: 'Open House',
    icon: '🚪',
    description: 'Promote an upcoming open house event',
    requiresProperty: true,
    defaultTone: 'friendly',
    fields: [
      {
        key: 'openHouseDateTime',
        label: 'Open house date & time',
        type: 'text',
        placeholder: 'Saturday · Jan 15 · 2–4 PM',
        required: true,
        helpText: 'This will be featured prominently in your caption',
      },
    ],
    allowedTemplates: ['open-house', 'custom', 'none'],
  },
  {
    id: 'price-drop',
    tab: 'property',
    label: 'Price Drop',
    icon: '💰',
    description: 'Announce a price reduction',
    requiresProperty: true,
    defaultTone: 'urgent',
    fields: [
      {
        key: 'priceDropNote',
        label: 'Optional note',
        type: 'text',
        placeholder: 'e.g., New price makes this a great value',
        helpText: 'Add context about why this is a good opportunity',
      },
    ],
    allowedTemplates: ['price-drop', 'just-listed', 'custom', 'none'],
  },
  {
    id: 'coming-soon',
    tab: 'property',
    label: 'Coming Soon',
    icon: '👀',
    description: 'Tease a property before it hits the market',
    requiresProperty: true,
    defaultTone: 'urgent',
    fields: [
      {
        key: 'teaser',
        label: 'Teaser line',
        type: 'text',
        placeholder: 'What makes this one special?',
        maxChars: 120,
        helpText: 'Create excitement without giving everything away',
      },
    ],
    allowedTemplates: ['coming-soon', 'custom', 'none'],
  },
  {
    id: 'investment',
    tab: 'property',
    label: 'Investment Opportunity',
    icon: '📈',
    description: 'Highlight investment potential',
    requiresProperty: true,
    defaultTone: 'investor',
    fields: [
      {
        key: 'roiAngle',
        label: 'Investment angle',
        type: 'text',
        placeholder: 'e.g., cash flow, appreciation, rental demand',
        helpText: 'What makes this a smart investment?',
      },
    ],
    allowedTemplates: ['just-listed', 'custom', 'none'],
  },

  // -----------------
  // PERSONAL TAB
  // -----------------
  {
    id: 'life-update',
    tab: 'personal',
    label: 'Life Update',
    icon: '🌟',
    description: 'Share a personal moment or update',
    defaultTone: 'casual',
    fields: [
      {
        key: 'story',
        label: "What's your update?",
        type: 'textarea',
        placeholder: 'Share a real moment in 2–5 lines…',
        required: true,
        maxChars: 600,
        helpText: 'This becomes your hook + caption body',
      },
    ],
    allowedTemplates: ['custom', 'none'],
  },
  {
    id: 'milestone',
    tab: 'personal',
    label: 'Milestone',
    icon: '🏆',
    description: 'Celebrate an achievement or anniversary',
    defaultTone: 'friendly',
    fields: [
      {
        key: 'milestone',
        label: 'What milestone?',
        type: 'text',
        required: true,
        maxChars: 120,
        placeholder: 'e.g., 5 years in real estate, 100th home sold',
      },
      {
        key: 'whyItMatters',
        label: 'Why it matters (optional)',
        type: 'textarea',
        maxChars: 400,
        placeholder: 'Share the journey or what this means to you',
      },
    ],
    allowedTemplates: ['custom', 'none'],
  },
  {
    id: 'lesson-insight',
    tab: 'personal',
    label: 'Lesson / Insight',
    icon: '💡',
    description: 'Share something you learned',
    defaultTone: 'professional',
    fields: [
      {
        key: 'lesson',
        label: 'What did you learn?',
        type: 'textarea',
        required: true,
        maxChars: 500,
        placeholder: 'Share the lesson in your own words',
      },
      {
        key: 'takeaway',
        label: 'One takeaway (optional)',
        type: 'text',
        maxChars: 140,
        placeholder: 'The key point readers should remember',
      },
    ],
    allowedTemplates: ['custom', 'none'],
  },
  {
    id: 'behind-the-scenes',
    tab: 'personal',
    label: 'Behind the Scenes',
    icon: '🎬',
    description: 'Show what goes on in your day-to-day',
    defaultTone: 'friendly',
    fields: [
      {
        key: 'bts',
        label: "What's happening behind the scenes?",
        type: 'textarea',
        required: true,
        maxChars: 500,
        placeholder: 'Give people a peek into your real work life',
      },
    ],
    allowedTemplates: ['custom', 'none'],
  },

  // -----------------
  // PROFESSIONAL TAB
  // (Absorbs Market Update, Client Story, Community)
  // -----------------
  {
    id: 'market-update',
    tab: 'professional',
    label: 'Market Update',
    icon: '📊',
    description: 'Share local market statistics and trends',
    defaultTone: 'professional',
    fields: [
      {
        key: 'headline',
        label: 'Market headline',
        type: 'text',
        required: true,
        maxChars: 40,
        placeholder: 'e.g., Inventory Up 12%',
        helpText: 'Keep it short (3-5 words) for image templates',
      },
      {
        key: 'stats',
        label: 'Key stats (optional)',
        type: 'textarea',
        maxChars: 400,
        placeholder: 'Median price, DOM, rates, etc.',
      },
      {
        key: 'soWhat',
        label: 'Why it matters',
        type: 'textarea',
        required: true,
        maxChars: 400,
        placeholder: 'What does this mean for buyers/sellers?',
        helpText: 'Help your audience understand the impact',
      },
    ],
    allowedTemplates: ['value-tips', 'custom', 'none'],
  },
  {
    id: 'buyer-tips',
    tab: 'professional',
    label: 'Buyer Tips',
    icon: '🏡',
    description: 'Share advice for home buyers',
    defaultTone: 'friendly',
    fields: [
      {
        key: 'tipTitle',
        label: 'Tip title',
        type: 'text',
        required: true,
        maxChars: 35,
        placeholder: 'e.g., 3 Buyer Mistakes',
        helpText: 'Keep it short (3-5 words) for image templates',
      },
      {
        key: 'tipBody',
        label: 'Tip details',
        type: 'textarea',
        required: true,
        maxChars: 600,
        placeholder: 'Explain the tip in detail',
        helpText: 'These details generate your hook + talking points',
      },
    ],
    allowedTemplates: ['value-tips', 'custom', 'none'],
  },
  {
    id: 'seller-tips',
    tab: 'professional',
    label: 'Seller Tips',
    icon: '🏷️',
    description: 'Share advice for home sellers',
    defaultTone: 'professional',
    fields: [
      {
        key: 'tipTitle',
        label: 'Tip title',
        type: 'text',
        required: true,
        maxChars: 35,
        placeholder: 'e.g., Staging Secrets',
        helpText: 'Keep it short (3-5 words) for image templates',
      },
      {
        key: 'tipBody',
        label: 'Tip details',
        type: 'textarea',
        required: true,
        maxChars: 600,
        placeholder: 'Explain the tip in detail',
        helpText: 'These details generate your hook + talking points',
      },
    ],
    allowedTemplates: ['value-tips', 'custom', 'none'],
  },
  {
    id: 'investment-insight',
    tab: 'professional',
    label: 'Investment Insight',
    icon: '💹',
    description: 'Share investment advice or analysis',
    defaultTone: 'investor',
    fields: [
      {
        key: 'insight',
        label: 'Insight',
        type: 'textarea',
        required: true,
        maxChars: 600,
        placeholder: 'Share your investment insight or analysis',
      },
      {
        key: 'metric',
        label: 'Optional metric',
        type: 'text',
        maxChars: 120,
        placeholder: 'Cap rate, CoC return, rent estimate...',
        helpText: 'Numbers add credibility',
      },
    ],
    allowedTemplates: ['value-tips', 'custom', 'none'],
  },
  {
    id: 'client-success-story',
    tab: 'professional',
    label: 'Client Success Story',
    icon: '⭐',
    description: 'Share a client testimonial or win',
    defaultTone: 'friendly',
    fields: [
      {
        key: 'challenge',
        label: 'Client challenge',
        type: 'textarea',
        required: true,
        maxChars: 300,
        placeholder: 'What was their situation or challenge?',
      },
      {
        key: 'solution',
        label: 'How you helped',
        type: 'textarea',
        required: true,
        maxChars: 300,
        placeholder: 'What did you do to help them?',
      },
      {
        key: 'result',
        label: 'Outcome',
        type: 'text',
        required: true,
        maxChars: 120,
        placeholder: 'e.g., Closed in 2 weeks, $20K over asking',
        helpText: 'The happy ending!',
      },
    ],
    allowedTemplates: ['success-story', 'custom', 'none'],
  },
  {
    id: 'community-spotlight',
    tab: 'professional',
    label: 'Community Spotlight',
    icon: '🏘️',
    description: 'Feature a local business, event, or neighbor',
    defaultTone: 'friendly',
    fields: [
      {
        key: 'spotlight',
        label: 'Who/what are you featuring?',
        type: 'text',
        required: true,
        maxChars: 120,
        placeholder: 'e.g., Joe\'s Coffee on Main Street',
      },
      {
        key: 'details',
        label: 'Why they matter',
        type: 'textarea',
        required: true,
        maxChars: 400,
        placeholder: 'What makes them special?',
      },
      {
        key: 'cta',
        label: 'Call-to-action (optional)',
        type: 'text',
        maxChars: 140,
        placeholder: 'e.g., Go check them out this weekend!',
      },
    ],
    allowedTemplates: ['custom', 'none'],
  },
];

// ============ CAPTION HOOKS BY INTENT ============
export const INTENT_HOOKS: Record<string, (context: Record<string, any>) => string> = {
  // Property
  'just-listed': (ctx) => `🏠 JUST LISTED in ${ctx.city || 'your area'}!`,
  'sold': (ctx) => `🎉 JUST SOLD in ${ctx.city || 'your area'}!`,
  'open-house': (ctx) => `🚪 OPEN HOUSE in ${ctx.city || 'your area'}!`,
  'price-drop': (ctx) => `💰 PRICE DROP in ${ctx.city || 'your area'}!`,
  'coming-soon': (ctx) => `👀 COMING SOON in ${ctx.city || 'your area'}!`,
  'investment': (ctx) => `📈 INVESTMENT OPPORTUNITY in ${ctx.city || 'your area'}!`,
  // Personal
  'life-update': () => `🌟 A little update from me...`,
  'milestone': (ctx) => `🏆 ${ctx.milestone || 'Milestone reached!'}`,
  'lesson-insight': () => `💡 Something I learned recently...`,
  'behind-the-scenes': () => `🎬 Behind the scenes...`,
  // Professional
  'market-update': (ctx) => `📊 ${ctx.headline || 'Market Update'}`,
  'buyer-tips': (ctx) => `🏡 ${ctx.tipTitle || 'Buyer Tip'}`,
  'seller-tips': (ctx) => `🏷️ ${ctx.tipTitle || 'Seller Tip'}`,
  'investment-insight': () => `💹 Investment Insight`,
  'client-success-story': () => `⭐ Client Success Story`,
  'community-spotlight': (ctx) => `🏘️ Spotlight: ${ctx.spotlight || 'Local Feature'}`,
};

// ============ CAPTION CTAs BY INTENT ============
export const INTENT_CTAS: Record<string, string> = {
  // Property
  'just-listed': 'DM for details or to schedule a showing.',
  'sold': 'Thinking of selling? DM me to chat.',
  'open-house': 'See you there! DM with questions.',
  'price-drop': "Don't miss this one. DM for details.",
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
};

// ============ HASHTAG CONFIGURATION ============

/**
 * Platform-specific hashtag rules
 */
export const PLATFORM_HASHTAG_RULES: Record<string, {
  enabled: boolean;
  maxHashtags: number;
  description: string;
}> = {
  instagram: {
    enabled: true,
    maxHashtags: 15, // Optimal is 5-15, max 30
    description: 'Hashtags improve discoverability',
  },
  facebook: {
    enabled: true,
    maxHashtags: 5, // Minimal, most users don't use them
    description: 'Use sparingly (2-5)',
  },
  linkedin: {
    enabled: false,
    maxHashtags: 3, // Generally not recommended
    description: 'Not recommended',
  },
};

/**
 * Intent-specific hashtag suggestions
 * These are added to the base hashtags based on intent
 */
export const INTENT_HASHTAGS: Record<string, string[]> = {
  // Property intents - location and property focused
  'just-listed': [
    '#JustListed',
    '#NewListing',
    '#HomeForSale',
    '#HouseHunting',
    '#RealEstateAgent',
  ],
  'sold': [
    '#JustSold',
    '#SoldHome',
    '#ClosingDay',
    '#HappyHomeowners',
    '#RealEstateSuccess',
  ],
  'open-house': [
    '#OpenHouse',
    '#HouseTour',
    '#HomeShowing',
    '#WeekendOpenHouse',
    '#ComeVisit',
  ],
  'price-drop': [
    '#PriceReduced',
    '#PriceDrop',
    '#ReducedPrice',
    '#GreatDeal',
    '#MustSee',
  ],
  'coming-soon': [
    '#ComingSoon',
    '#SneakPeek',
    '#NewListingAlert',
    '#StayTuned',
    '#OffMarket',
  ],
  'investment': [
    '#InvestmentProperty',
    '#RealEstateInvestor',
    '#CashFlow',
    '#ROI',
    '#PassiveIncome',
  ],

  // Personal intents - personal brand focused
  'life-update': [
    '#RealtorLife',
    '#MyJourney',
    '#RealTalk',
    '#LifeUpdate',
  ],
  'milestone': [
    '#Milestone',
    '#Achievement',
    '#Grateful',
    '#Blessed',
    '#RealEstateJourney',
  ],
  'lesson-insight': [
    '#LessonsLearned',
    '#RealEstateTips',
    '#WisdomWednesday',
    '#GrowthMindset',
  ],
  'behind-the-scenes': [
    '#BehindTheScenes',
    '#BTS',
    '#AgentLife',
    '#DayInTheLife',
    '#RealtorBTS',
  ],

  // Professional intents - industry and education focused
  'market-update': [
    '#MarketUpdate',
    '#RealEstateMarket',
    '#MarketTrends',
    '#HousingMarket',
    '#MarketReport',
  ],
  'buyer-tips': [
    '#BuyerTips',
    '#FirstTimeHomeBuyer',
    '#HomeBuyingTips',
    '#BuyerAdvice',
    '#HomeOwnership',
  ],
  'seller-tips': [
    '#SellerTips',
    '#SellingYourHome',
    '#HomeSellingTips',
    '#SellYourHome',
    '#HomeStagingTips',
  ],
  'investment-insight': [
    '#InvestmentTips',
    '#RealEstateInvesting',
    '#PropertyInvestment',
    '#WealthBuilding',
    '#FinancialFreedom',
  ],
  'client-success-story': [
    '#SuccessStory',
    '#HappyClients',
    '#ClientLove',
    '#Testimonial',
    '#DreamHomeFound',
  ],
  'community-spotlight': [
    '#LocalBusiness',
    '#SupportLocal',
    '#CommunityLove',
    '#NeighborhoodSpotlight',
    '#LocalGems',
  ],
};

/**
 * Base hashtags that apply to all posts (brand + general)
 */
export const BASE_HASHTAGS = [
  '#PurpleHomes',
  '#RealEstate',
];

/**
 * Preferred community hashtags - always suggested prominently
 * These support Purple Homes' mission of helping families achieve homeownership
 */
export const PREFERRED_HASHTAGS = [
  '#DuenoADueno',
  '#CompraTuCasa',
  '#HogaresParaFamilias',
  '#PathToHomeownership',
  '#HelpingFamiliesBuyHomes',
  '#HomeownershipJourney',
];

/**
 * Location-based hashtag generators
 */
export function generateLocationHashtags(city?: string, state?: string): string[] {
  const hashtags: string[] = [];

  if (city) {
    // Clean city name for hashtag
    const cleanCity = city.replace(/[^a-zA-Z0-9]/g, '');
    hashtags.push(`#${cleanCity}`);
    hashtags.push(`#${cleanCity}RealEstate`);
    hashtags.push(`#${cleanCity}Homes`);
  }

  if (state) {
    const cleanState = state.replace(/[^a-zA-Z0-9]/g, '');
    hashtags.push(`#${cleanState}RealEstate`);
  }

  return hashtags;
}

/**
 * Generate complete hashtag list for an intent
 */
export function generateHashtagsForIntent(
  intentId: string,
  options?: {
    city?: string;
    state?: string;
    platform?: 'instagram' | 'facebook' | 'linkedin';
    includeBase?: boolean;
    includePreferred?: boolean;
  }
): string[] {
  const { city, state, platform = 'instagram', includeBase = true, includePreferred = true } = options || {};

  // Check if platform allows hashtags
  const platformRules = PLATFORM_HASHTAG_RULES[platform];
  if (!platformRules?.enabled) {
    return [];
  }

  const hashtags: string[] = [];

  // Add base hashtags (brand)
  if (includeBase) {
    hashtags.push(...BASE_HASHTAGS);
  }

  // Add preferred community hashtags
  if (includePreferred) {
    hashtags.push(...PREFERRED_HASHTAGS);
  }

  // Add intent-specific hashtags
  const intentHashtags = INTENT_HASHTAGS[intentId] || [];
  hashtags.push(...intentHashtags);

  // Add location hashtags for property intents
  const propertyIntents = ['just-listed', 'sold', 'open-house', 'price-drop', 'coming-soon', 'investment'];
  if (propertyIntents.includes(intentId)) {
    hashtags.push(...generateLocationHashtags(city, state));
  }

  // Remove duplicates and limit to platform max
  const uniqueHashtags = [...new Set(hashtags)];
  return uniqueHashtags.slice(0, platformRules.maxHashtags);
}
