import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, X, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardState } from '../../types';
import {
  BASE_HASHTAGS,
  PREFERRED_HASHTAGS,
  INTENT_HASHTAGS,
  generateLocationHashtags,
  PLATFORM_HASHTAG_RULES,
} from '@/lib/socialHub';

interface HashtagPickerSubstepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function HashtagPickerSubstep({
  state,
  updateState,
  onNext,
  onBack,
}: HashtagPickerSubstepProps) {
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

  // Initialize hashtags when entering this substep
  useEffect(() => {
    const suggestionsChanged =
      JSON.stringify(state.suggestedHashtags.sort()) !==
      JSON.stringify(suggestedHashtags.sort());

    if (state.suggestedHashtags.length === 0 || suggestionsChanged) {
      // Auto-select first 7 by default
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
        selectedHashtags: state.selectedHashtags.filter((h) => h !== hashtag),
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

    if (
      !state.customHashtags.includes(formatted) &&
      !state.suggestedHashtags.includes(formatted)
    ) {
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
      customHashtags: state.customHashtags.filter((h) => h !== hashtag),
      selectedHashtags: state.selectedHashtags.filter((h) => h !== hashtag),
    });
  };

  const allHashtags = [...state.suggestedHashtags, ...state.customHashtags];
  const totalSelected = state.selectedHashtags.length;

  // Group hashtags by category for better UX
  const hashtagCategories = useMemo(() => {
    const categories: { name: string; hashtags: string[] }[] = [];
    const intentHashtags = INTENT_HASHTAGS[state.postIntent] || [];

    // Brand hashtags
    const brandHashtags = allHashtags.filter((h) => BASE_HASHTAGS.includes(h));
    if (brandHashtags.length > 0) {
      categories.push({ name: 'Brand', hashtags: brandHashtags });
    }

    // Preferred community hashtags
    const preferredHashtags = allHashtags.filter((h) =>
      PREFERRED_HASHTAGS.includes(h)
    );
    if (preferredHashtags.length > 0) {
      categories.push({ name: 'Community', hashtags: preferredHashtags });
    }

    // Intent hashtags
    const matchedIntentHashtags = allHashtags.filter((h) =>
      intentHashtags.includes(h)
    );
    if (matchedIntentHashtags.length > 0) {
      categories.push({ name: 'Post Type', hashtags: matchedIntentHashtags });
    }

    // Location hashtags
    const locationHashtags = allHashtags.filter(
      (h) =>
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
  const intentLabel = state.postIntent
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Hash className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Choose Hashtags</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Suggested based on your{' '}
          <span className="font-medium text-foreground">{intentLabel}</span> post
          {state.selectedProperty && (
            <>
              {' '}
              in{' '}
              <span className="font-medium text-foreground">
                {state.selectedProperty.city}, {state.selectedProperty.state}
              </span>
            </>
          )}
        </p>
      </div>

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
                      isSelected && 'bg-primary hover:bg-primary/90'
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
          <span className="font-medium text-foreground">{totalSelected}</span>{' '}
          hashtag{totalSelected !== 1 ? 's' : ''} selected
        </p>
        {totalSelected > 15 && (
          <p className="text-xs text-amber-600">
            Consider using fewer hashtags for better engagement
          </p>
        )}
      </div>

      {/* Add custom hashtag */}
      <div>
        <Label className="mb-2 block text-sm">Add custom hashtag</Label>
        <div className="flex gap-2">
          <Input
            value={customHashtag}
            onChange={(e) => setCustomHashtag(e.target.value)}
            placeholder="#YourHashtag"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
            className="flex-1"
          />
          <Button onClick={handleAddCustom} variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Platform info */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        <p className="font-medium mb-1">Platform limits:</p>
        <ul className="space-y-0.5">
          <li>Instagram: Up to {PLATFORM_HASHTAG_RULES.instagram.maxHashtags} hashtags</li>
          <li>Facebook: Up to {PLATFORM_HASHTAG_RULES.facebook.maxHashtags} hashtags</li>
          <li>LinkedIn: Hashtags not recommended</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Next: Generate Caption
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
