/**
 * Presets System Constants
 *
 * Default settings, storage key, and starter presets.
 */

import type { Preset } from './types';

// localStorage key
export const PRESETS_STORAGE_KEY = 'purple-homes-presets';

// Maximum number of presets allowed
export const MAX_PRESETS = 20;

// Preset name validation
export const PRESET_NAME_MIN_LENGTH = 2;
export const PRESET_NAME_MAX_LENGTH = 50;

// Default starter presets (created on first load)
export const STARTER_PRESETS: Omit<Preset, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Just Listed - Professional',
    postIntent: 'just-listed',
    tone: 'professional',
    hashtags: [
      'justlisted',
      'newlisting',
      'realestate',
      'homeforsale',
      'purplehomes',
    ],
    templateId: null,
    platforms: ['facebook', 'instagram'],
    isDefault: true,
    usageCount: 0,
  },
  {
    name: 'Just Listed - Casual',
    postIntent: 'just-listed',
    tone: 'casual',
    hashtags: ['justlisted', 'newhome', 'househunting', 'dreamhome'],
    templateId: null,
    platforms: ['facebook', 'instagram'],
    isDefault: false,
    usageCount: 0,
  },
  {
    name: 'Price Reduced',
    postIntent: 'price-reduced',
    tone: 'urgent',
    hashtags: ['pricereduced', 'pricecut', 'realestate', 'hotdeal', 'mustsee'],
    templateId: null,
    platforms: ['facebook', 'instagram'],
    isDefault: false,
    usageCount: 0,
  },
  {
    name: 'Investment Property',
    postIntent: 'investment',
    tone: 'investor',
    hashtags: [
      'investmentproperty',
      'realestateinvesting',
      'cashflow',
      'passiveincome',
    ],
    templateId: null,
    platforms: ['facebook', 'linkedin'],
    isDefault: false,
    usageCount: 0,
  },
];
