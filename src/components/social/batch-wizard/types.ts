/**
 * Batch Wizard Types
 *
 * Multi-property wizard for batch social media posting.
 * Same flow as Create Wizard but for multiple properties at once.
 */

import type { Property } from '@/types';
import type { PostIntent, CaptionTone, Platform } from '../create-wizard/types';

// ============================================
// WIZARD STEPS
// ============================================
export type BatchWizardStep =
  | 'select'
  | 'image'
  | 'caption'
  | 'hashtags'
  | 'schedule'
  | 'review';

export const BATCH_WIZARD_STEPS: BatchWizardStep[] = [
  'select',
  'image',
  'caption',
  'hashtags',
  'schedule',
  'review',
];

export const BATCH_STEP_CONFIG: Record<
  BatchWizardStep,
  { number: number; title: string; shortTitle: string; tooltip: string }
> = {
  select: {
    number: 1,
    title: 'Select Properties',
    shortTitle: 'Select',
    tooltip: 'Choose which properties to include in this batch',
  },
  image: {
    number: 2,
    title: 'Generate Images',
    shortTitle: 'Image',
    tooltip: 'Choose a template and generate images for all properties',
  },
  caption: {
    number: 3,
    title: 'Generate Captions',
    shortTitle: 'Caption',
    tooltip: 'Choose post intent and tone, then generate captions for all',
  },
  hashtags: {
    number: 4,
    title: 'Hashtags',
    shortTitle: 'Tags',
    tooltip: 'Select hashtags to add to all posts',
  },
  schedule: {
    number: 5,
    title: 'Schedule',
    shortTitle: 'Schedule',
    tooltip: 'Post now or schedule with staggered timing',
  },
  review: {
    number: 6,
    title: 'Review & Publish',
    shortTitle: 'Review',
    tooltip: 'Review all posts and publish',
  },
};

// ============================================
// PROPERTY POST STATE (per property)
// ============================================
export interface PropertyPostState {
  propertyId: string;
  // Image
  hasExistingImage: boolean;
  generatedImageUrl: string | null;
  useExistingImage: boolean;
  selectedHeroImage: string | null;           // User-selected hero image
  selectedSupportingImages: string[];         // User-selected supporting images
  // Caption
  captions: Record<Platform, string>;
  // Status
  status: 'pending' | 'processing' | 'ready' | 'failed';
  error?: string;
}

// ============================================
// SCHEDULE OPTIONS
// ============================================
export type ScheduleType = 'now' | 'staggered' | 'queue' | 'specific';

export interface StaggerSettings {
  startDate: Date | null;
  startTime: string;
  intervalHours: number;
}

// ============================================
// BATCH WIZARD STATE
// ============================================
export interface BatchWizardState {
  // Step 1: Selected Properties
  selectedPropertyIds: string[];

  // Step 2: Image Settings
  selectedTemplateId: string | null;
  selectedAgentId: string | null;             // Agent for template generation
  skipExistingImages: boolean;
  imageGenerationStatus: Record<string, 'pending' | 'generating' | 'complete' | 'failed'>;

  // Step 3: Caption Settings
  postIntent: PostIntent;
  tone: CaptionTone;
  captionGenerationStatus: Record<string, 'pending' | 'generating' | 'complete' | 'failed'>;

  // Per-property state (images + captions)
  propertyStates: Record<string, PropertyPostState>;

  // Step 4: Hashtags
  suggestedHashtags: string[];
  selectedHashtags: string[];
  customHashtags: string[];
  platformHashtagSettings: Record<Platform, { enabled: boolean; limit: number | null }>;

  // Step 5: Schedule
  scheduleType: ScheduleType;
  staggerSettings: StaggerSettings;
  selectedAccounts: string[];

  // Step 6: Review
  // (uses propertyStates to show all posts)

  // UI State
  currentStep: BatchWizardStep;
  isGeneratingImages: boolean;
  isGeneratingCaptions: boolean;
  isPublishing: boolean;
  publishProgress: number;
  errors: Record<string, string>;
}

export const INITIAL_BATCH_WIZARD_STATE: BatchWizardState = {
  // Step 1
  selectedPropertyIds: [],

  // Step 2
  selectedTemplateId: null,
  selectedAgentId: 'krista',                  // Default to first agent
  skipExistingImages: true,
  imageGenerationStatus: {},

  // Step 3
  postIntent: 'just-listed',
  tone: 'professional',
  captionGenerationStatus: {},

  // Per-property state
  propertyStates: {},

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
  scheduleType: 'now',
  staggerSettings: {
    startDate: null,
    startTime: '09:00',
    intervalHours: 2,
  },
  selectedAccounts: [],

  // UI State
  currentStep: 'select',
  isGeneratingImages: false,
  isGeneratingCaptions: false,
  isPublishing: false,
  publishProgress: 0,
  errors: {},
};
