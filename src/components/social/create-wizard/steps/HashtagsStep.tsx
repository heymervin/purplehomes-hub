import React, { useEffect, useState, useMemo } from 'react';
import { Info, Plus, X, Hash } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { WizardState, Platform } from '../types';
import {
  PLATFORM_HASHTAG_RULES,
  BASE_HASHTAGS,
  PREFERRED_HASHTAGS,
  INTENT_HASHTAGS,
  generateLocationHashtags,
} from '@/lib/socialHub';

interface HashtagsStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

export default function HashtagsStep({ state, updateState }: HashtagsStepProps) {
  const [customHashtag, setCustomHashtag] = useState('');

  // Generate smart hashtags based on intent and property
  const suggestedHashtags = useMemo(() => {
    const hashtags: string[] = [];

    // Add base hashtags (brand)
    hashtags.push(...BASE_HASHTAGS);

    // Add preferred community hashtags
    hashtags.push(...PREFERRED_HASHTAGS);

    // Add intent-specific hashtags
    const intentHashtags = INTENT_HASHTAGS[state.postIntent] || [];
    hashtags.push(...intentHashtags);

    // Add location hashtags if we have a property
    if (state.selectedProperty) {
      const locationHashtags = generateLocationHashtags(
        state.selectedProperty.city,
        state.selectedProperty.state
      );
      hashtags.push(...locationHashtags);
    }

    // Remove duplicates
    return [...new Set(hashtags)];
  }, [state.postIntent, state.selectedProperty]);

  // Initialize hashtags on mount or when suggestions change
  useEffect(() => {
    // Only update if suggestions have actually changed
    const suggestionsChanged = JSON.stringify(state.suggestedHashtags.sort()) !== JSON.stringify(suggestedHashtags.sort());

    if (state.suggestedHashtags.length === 0 || suggestionsChanged) {
      // Select first 7 by default
      const defaultCount = 7;
      updateState({
        suggestedHashtags,
        selectedHashtags: suggestedHashtags.slice(0, defaultCount),
      });
    }
  }, [suggestedHashtags]);

  // Toggle hashtag selection
  const toggleHashtag = (hashtag: string) => {
    const isSelected = state.selectedHashtags.includes(hashtag);
    if (isSelected) {
      updateState({
        selectedHashtags: state.selectedHashtags.filter(h => h !== hashtag),
      });
    } else {
      updateState({
        selectedHashtags: [...state.selectedHashtags, hashtag],
      });
    }
  };

  // Add custom hashtag
  const handleAddCustom = () => {
    if (!customHashtag.trim()) return;

    let formatted = customHashtag.trim();
    if (!formatted.startsWith('#')) {
      formatted = `#${formatted}`;
    }
    formatted = formatted.replace(/\s+/g, '');

    if (!state.customHashtags.includes(formatted) && !state.suggestedHashtags.includes(formatted)) {
      updateState({
        customHashtags: [...state.customHashtags, formatted],
        selectedHashtags: [...state.selectedHashtags, formatted],
      });
    }
    setCustomHashtag('');
  };

  // Remove custom hashtag
  const removeCustomHashtag = (hashtag: string) => {
    updateState({
      customHashtags: state.customHashtags.filter(h => h !== hashtag),
      selectedHashtags: state.selectedHashtags.filter(h => h !== hashtag),
    });
  };

  const allHashtags = [...state.suggestedHashtags, ...state.customHashtags];
  const totalSelected = state.selectedHashtags.length;

  // Platform configuration with smart limits
  const platformConfig: Record<Platform, {
    icon: string;
    name: string;
    maxHashtags: number;
    enabled: boolean;
    description: string;
  }> = {
    instagram: {
      icon: 'IG',
      name: 'Instagram',
      maxHashtags: PLATFORM_HASHTAG_RULES.instagram.maxHashtags,
      enabled: state.platformHashtagSettings.instagram.enabled,
      description: `Up to ${PLATFORM_HASHTAG_RULES.instagram.maxHashtags} hashtags`,
    },
    facebook: {
      icon: 'FB',
      name: 'Facebook',
      maxHashtags: PLATFORM_HASHTAG_RULES.facebook.maxHashtags,
      enabled: state.platformHashtagSettings.facebook.enabled,
      description: `Up to ${PLATFORM_HASHTAG_RULES.facebook.maxHashtags} hashtags`,
    },
    linkedin: {
      icon: 'LI',
      name: 'LinkedIn',
      maxHashtags: PLATFORM_HASHTAG_RULES.linkedin.maxHashtags,
      enabled: state.platformHashtagSettings.linkedin.enabled,
      description: 'Not recommended',
    },
  };

  // Calculate hashtags per platform
  const hashtagsPerPlatform = useMemo(() => {
    const result: Record<Platform, string[]> = {
      instagram: [],
      facebook: [],
      linkedin: [],
    };

    for (const platform of ['instagram', 'facebook', 'linkedin'] as Platform[]) {
      const config = platformConfig[platform];
      if (config.enabled) {
        result[platform] = state.selectedHashtags.slice(0, config.maxHashtags);
      }
    }

    return result;
  }, [state.selectedHashtags, state.platformHashtagSettings]);

  // Group hashtags by category for better UX
  const hashtagCategories = useMemo(() => {
    const categories: { name: string; hashtags: string[] }[] = [];
    const intentHashtags = INTENT_HASHTAGS[state.postIntent] || [];

    // Brand hashtags
    const brandHashtags = allHashtags.filter(h => BASE_HASHTAGS.includes(h));
    if (brandHashtags.length > 0) {
      categories.push({ name: 'Brand', hashtags: brandHashtags });
    }

    // Preferred community hashtags (homeownership mission)
    const preferredHashtags = allHashtags.filter(h => PREFERRED_HASHTAGS.includes(h));
    if (preferredHashtags.length > 0) {
      categories.push({ name: 'Community', hashtags: preferredHashtags });
    }

    // Intent hashtags
    const matchedIntentHashtags = allHashtags.filter(h => intentHashtags.includes(h));
    if (matchedIntentHashtags.length > 0) {
      categories.push({ name: 'Post Type', hashtags: matchedIntentHashtags });
    }

    // Location hashtags
    const locationHashtags = allHashtags.filter(h =>
      !BASE_HASHTAGS.includes(h) &&
      !PREFERRED_HASHTAGS.includes(h) &&
      !intentHashtags.includes(h) &&
      !state.customHashtags.includes(h)
    );
    if (locationHashtags.length > 0) {
      categories.push({ name: 'Location', hashtags: locationHashtags });
    }

    // Custom hashtags
    if (state.customHashtags.length > 0) {
      categories.push({ name: 'Custom', hashtags: state.customHashtags });
    }

    return categories;
  }, [allHashtags, state.postIntent, state.customHashtags]);

  // Get intent label for display
  const intentLabel = state.postIntent.split('-').map(
    word => word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-purple-500" />
          <h2 className="text-xl font-semibold">Hashtags</h2>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Hashtags help your post get discovered. We've selected relevant tags based on your post type and location.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Smart suggestion note */}
        <p className="text-sm text-muted-foreground">
          Suggested based on your <span className="font-medium text-foreground">{intentLabel}</span> post
          {state.selectedProperty && (
            <> in <span className="font-medium text-foreground">{state.selectedProperty.city}, {state.selectedProperty.state}</span></>
          )}
        </p>

        {/* Hashtag Categories */}
        <div className="space-y-4">
          {hashtagCategories.map((category) => (
            <div key={category.name}>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                {category.name}
              </Label>
              <div className="flex flex-wrap gap-2">
                {category.hashtags.map((hashtag) => {
                  const isSelected = state.selectedHashtags.includes(hashtag);
                  const isCustom = state.customHashtags.includes(hashtag);

                  return (
                    <Badge
                      key={hashtag}
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-all text-sm py-1.5 px-3',
                        isSelected && 'bg-purple-600 hover:bg-purple-700'
                      )}
                      onClick={() => toggleHashtag(hashtag)}
                    >
                      {hashtag}
                      {isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCustomHashtag(hashtag);
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Selected count */}
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{totalSelected}</span> hashtag{totalSelected !== 1 ? 's' : ''} selected
          </p>
          {totalSelected > 15 && (
            <p className="text-xs text-amber-600">
              Consider using fewer hashtags for better engagement
            </p>
          )}
        </div>

        {/* Add custom hashtag */}
        <div>
          <Label className="mb-2 block">Add custom hashtag</Label>
          <div className="flex gap-2">
            <Input
              value={customHashtag}
              onChange={(e) => setCustomHashtag(e.target.value)}
              placeholder="#YourHashtag"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              className="flex-1"
            />
            <Button onClick={handleAddCustom} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Platform-specific settings */}
        <div className="space-y-3">
          <Label>Platform settings</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Each platform has different best practices for hashtags
          </p>

          {(['instagram', 'facebook', 'linkedin'] as Platform[]).map((platform) => {
            const config = platformConfig[platform];
            const platformHashtags = hashtagsPerPlatform[platform];

            return (
              <div key={platform} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                <Checkbox
                  id={`hashtag-${platform}`}
                  checked={config.enabled}
                  onCheckedChange={(checked) => {
                    updateState({
                      platformHashtagSettings: {
                        ...state.platformHashtagSettings,
                        [platform]: {
                          ...state.platformHashtagSettings[platform],
                          enabled: !!checked
                        },
                      },
                    });
                  }}
                />
                <div className="flex-1">
                  <label htmlFor={`hashtag-${platform}`} className="flex items-center gap-2 cursor-pointer">
                    <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-medium">
                      {config.icon}
                    </span>
                    <span className="font-medium">{config.name}</span>
                    <span className="text-muted-foreground text-sm">· {config.description}</span>
                  </label>
                  {config.enabled && platformHashtags.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 ml-8">
                      Will use: {platformHashtags.slice(0, 3).join(' ')}
                      {platformHashtags.length > 3 && ` +${platformHashtags.length - 3} more`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
