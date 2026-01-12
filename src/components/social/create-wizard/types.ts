import type { Property } from '@/types';

// ============================================
// POST TYPES
// ============================================
export type PostType = 'property' | 'custom' | 'text-only';

// ============================================
// WIZARD STEPS
// ============================================
export type WizardStep = 'source' | 'image' | 'caption' | 'hashtags' | 'publish';
export type CaptionSubstep = 'intent' | 'tone' | 'edit';

export const WIZARD_STEPS: WizardStep[] = ['source', 'caption', 'image', 'hashtags', 'publish'];
export const CAPTION_SUBSTEPS: CaptionSubstep[] = ['intent', 'tone', 'edit'];

export const STEP_CONFIG: Record<WizardStep, { number: number; title: string; tooltip: string }> = {
  source: {
    number: 1,
    title: 'Source',
    tooltip: 'Choose what type of post you want to create',
  },
  caption: {
    number: 2,
    title: 'Caption',
    tooltip: 'Choose your post intent, tone, and write your caption',
  },
  image: {
    number: 3,
    title: 'Image',
    tooltip: 'Create a branded image or upload your own',
  },
  hashtags: {
    number: 4,
    title: 'Hashtags',
    tooltip: 'Select relevant hashtags for your post',
  },
  publish: {
    number: 5,
    title: 'Publish',
    tooltip: 'Preview and publish your post',
  },
};

export const CAPTION_SUBSTEP_CONFIG: Record<CaptionSubstep, { title: string; description: string }> = {
  intent: {
    title: 'Post Intent',
    description: 'What are you announcing?',
  },
  tone: {
    title: 'Tone',
    description: 'How should it sound?',
  },
  edit: {
    title: 'Edit Caption',
    description: 'Review and refine your caption',
  },
};

// ============================================
// POST INTENT (What type of announcement)
// ============================================
export type PostIntent =
  // Property intents
  | 'just-listed'
  | 'sold'
  | 'under-contract'
  | 'price-reduced'
  | 'price-drop'
  | 'open-house'
  | 'coming-soon'
  | 'investment'
  // Personal intents
  | 'life-update'
  | 'milestone'
  | 'lesson-insight'
  | 'behind-the-scenes'
  // Professional intents
  | 'market-update'
  | 'buyer-tips'
  | 'seller-tips'
  | 'investment-insight'
  | 'client-success-story'
  | 'community-spotlight'
  // Legacy intents (for backward compatibility)
  | 'personal-value'
  | 'success-story'
  | 'general';

export interface PostIntentConfig {
  id: PostIntent;
  label: string;
  icon: string;
  description: string;
  keywords: string[];
}

export const POST_INTENTS: PostIntentConfig[] = [
  // Templates with matching image templates (shown first)
  {
    id: 'just-listed',
    label: 'Just Listed',
    icon: '🏷️',
    description: 'Announce a new property on the market',
    keywords: ['just listed', 'new listing', 'just hit the market', 'now available'],
  },
  {
    id: 'sold',
    label: 'Sold',
    icon: '🎉',
    description: 'Celebrate a closed deal',
    keywords: ['sold', 'closed', 'new owners', 'another happy buyer'],
  },
  {
    id: 'open-house',
    label: 'Open House',
    icon: '🚪',
    description: 'Invite people to visit',
    keywords: ['open house', 'come see', 'tour', 'showing', 'visit'],
  },
  {
    id: 'personal-value',
    label: 'Personal Value',
    icon: '💡',
    description: 'Share tips and expertise',
    keywords: ['tips', 'advice', 'homebuying tips', 'real estate tips', 'pro tip'],
  },
  {
    id: 'success-story',
    label: 'Success Story',
    icon: '⭐',
    description: 'Highlight client testimonials',
    keywords: ['testimonial', 'success story', 'happy client', 'client review'],
  },
  // Other intents (no matching templates)
  {
    id: 'under-contract',
    label: 'Under Contract',
    icon: '📝',
    description: 'Property is pending sale',
    keywords: ['under contract', 'pending', 'accepted offer', 'off the market'],
  },
  {
    id: 'price-reduced',
    label: 'Price Reduced',
    icon: '💰',
    description: 'Announce a price reduction',
    keywords: ['price reduced', 'new price', 'price drop', 'reduced'],
  },
  {
    id: 'coming-soon',
    label: 'Coming Soon',
    icon: '👀',
    description: 'Build anticipation for upcoming listing',
    keywords: ['coming soon', 'sneak peek', 'stay tuned', 'hitting the market'],
  },
  {
    id: 'investment',
    label: 'Investment Opportunity',
    icon: '📈',
    description: 'Appeal to investors with numbers',
    keywords: ['investment', 'ROI', 'cash flow', 'ARV', 'profit potential'],
  },
  {
    id: 'market-update',
    label: 'Market Update',
    icon: '📊',
    description: 'Share market insights',
    keywords: ['market update', 'market trends', 'market report'],
  },
  {
    id: 'general',
    label: 'General Post',
    icon: '📱',
    description: 'Custom post without specific intent',
    keywords: [],
  },
];

// ============================================
// TONE (How it should sound)
// ============================================
export type CaptionTone =
  | 'professional'
  | 'casual'
  | 'urgent'
  | 'friendly'
  | 'luxury'
  | 'investor';

export interface ToneConfig {
  id: CaptionTone;
  label: string;
  icon: string;
  description: string;
  example: string;
}

export const TONE_PRESETS: ToneConfig[] = [
  {
    id: 'professional',
    label: 'Professional',
    icon: '💼',
    description: 'Polished and authoritative',
    example: 'A rare opportunity in one of the city\'s most coveted neighborhoods.',
  },
  {
    id: 'casual',
    label: 'Casual',
    icon: '😊',
    description: 'Friendly and conversational',
    example: 'Okay but can we talk about this kitchen? 😍',
  },
  {
    id: 'urgent',
    label: 'Urgent',
    icon: '⚡',
    description: 'Time-sensitive energy',
    example: 'Just listed this morning. I don\'t expect this to last the week.',
  },
  {
    id: 'friendly',
    label: 'Friendly',
    icon: '🤗',
    description: 'Warm and welcoming',
    example: 'Picture this: Sunday morning coffee on that patio...',
  },
  {
    id: 'luxury',
    label: 'Luxury',
    icon: '✨',
    description: 'Sophisticated and elevated',
    example: 'For those who appreciate the finer details, this residence delivers.',
  },
  {
    id: 'investor',
    label: 'Investor',
    icon: '📊',
    description: 'Numbers and ROI focused',
    example: 'At $185K with a projected ARV of $245K, the numbers speak for themselves.',
  },
];

// Platform types
export type Platform = 'facebook' | 'instagram' | 'linkedin';

// ============================================
// WIZARD STATE
// ============================================
export interface WizardState {
  // Step 1: Content Source
  postType: PostType;
  selectedProperty: Property | null;

  // Step 2: Caption (Mini-Wizard)
  postContext: string;
  captionSubstep: CaptionSubstep;
  postIntent: PostIntent;
  tone: CaptionTone;
  captions: Record<Platform, string>;
  useSameCaptionForAll: boolean;
  selectedCaptionTemplate: string | null;

  // Step 3: Image
  selectedTemplateId: string | null;
  templateUserInputs: Record<string, string>; // User inputs for template fields
  generatedImageUrl: string | null;
  generatedImageBlob: Blob | null;
  customImageFile: File | null;
  customImagePreview: string | null;

  // Step 4: Hashtags
  suggestedHashtags: string[];
  selectedHashtags: string[];
  customHashtags: string[];
  platformHashtagSettings: Record<Platform, { enabled: boolean; limit: number | null }>;

  // Step 5: Publish
  selectedAccounts: string[];
  scheduleType: 'now' | 'later';
  scheduledDate: Date | null;
  scheduledTime: string | null;

  // UI State
  currentStep: WizardStep;
  isGeneratingImage: boolean;
  isGeneratingCaption: boolean;
  errors: Record<string, string>;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  // Step 1
  postType: 'property',
  selectedProperty: null,

  // Step 2
  selectedTemplateId: null,
  templateUserInputs: {},
  generatedImageUrl: null,
  generatedImageBlob: null,
  customImageFile: null,
  customImagePreview: null,
  postContext: '',

  // Step 3
  captionSubstep: 'intent',
  postIntent: 'just-listed',
  tone: 'professional',
  captions: {
    facebook: '',
    instagram: '',
    linkedin: '',
  },
  useSameCaptionForAll: true,
  selectedCaptionTemplate: null,

  // Step 4
  suggestedHashtags: [],
  selectedHashtags: [],
  customHashtags: [],
  platformHashtagSettings: {
    facebook: { enabled: true, limit: 5 },
    instagram: { enabled: true, limit: 30 },
    linkedin: { enabled: false, limit: null },
  },

  // Step 5
  selectedAccounts: [],
  scheduleType: 'now',
  scheduledDate: null,
  scheduledTime: null,

  // UI
  currentStep: 'source',
  isGeneratingImage: false,
  isGeneratingCaption: false,
  errors: {},
};
