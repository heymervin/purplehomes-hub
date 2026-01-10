import React, { useEffect, useState } from 'react';
import { Info, Plus, X } from 'lucide-react';
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

// Suggested hashtags based on real estate
const DEFAULT_HASHTAGS = [
  '#PurpleHomes',
  '#RealEstate',
  '#HomesForSale',
  '#JustListed',
  '#DreamHome',
  '#NewListing',
  '#PropertyForSale',
  '#Investment',
  '#RealtorLife',
  '#HouseHunting',
  // Spanish/Latino community hashtags
  '#DuenoADueno',
  '#CompraTuCasa',
  '#HogaresParaFamilias',
  '#PathToHomeownership',
  '#HelpingFamiliesBuyHomes',
  '#HomeownershipJourney',
];

interface HashtagsStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

export default function HashtagsStep({ state, updateState }: HashtagsStepProps) {
  const [customHashtag, setCustomHashtag] = useState('');

  // Generate suggested hashtags on mount
  useEffect(() => {
    if (state.suggestedHashtags.length === 0) {
      const suggested = generateSuggestedHashtags(state);
      updateState({
        suggestedHashtags: suggested,
        selectedHashtags: suggested.slice(0, 5), // Select first 5 by default
      });
    }
  }, []);

  // Generate hashtags based on property/context
  function generateSuggestedHashtags(wizardState: WizardState): string[] {
    const hashtags = [...DEFAULT_HASHTAGS];

    if (wizardState.selectedProperty) {
      const { city, state: propertyState } = wizardState.selectedProperty;
      if (city) {
        const cityHashtag = `#${city.replace(/\s+/g, '')}`;
        if (!hashtags.includes(cityHashtag)) {
          hashtags.push(cityHashtag);
        }
      }
      if (propertyState) {
        const stateHashtag = `#${propertyState}RealEstate`;
        if (!hashtags.includes(stateHashtag)) {
          hashtags.push(stateHashtag);
        }
      }
    }

    return [...new Set(hashtags)]; // Remove duplicates
  }

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

  const platformLabels: Record<Platform, { icon: string; name: string; desc: string }> = {
    facebook: { icon: 'FB', name: 'Facebook', desc: 'Include top 5 only' },
    instagram: { icon: 'IG', name: 'Instagram', desc: 'Include all (max 30)' },
    linkedin: { icon: 'LI', name: 'LinkedIn', desc: 'No hashtags' },
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Hashtags</h2>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              Select relevant hashtags to increase your post's reach
            </TooltipContent>
          </Tooltip>
        </div>

        <p className="text-muted-foreground">
          Suggested hashtags based on your post:
        </p>

        {/* Hashtag Grid */}
        <div className="flex flex-wrap gap-2">
          {allHashtags.map((hashtag) => {
            const isSelected = state.selectedHashtags.includes(hashtag);
            const isCustom = state.customHashtags.includes(hashtag);

            return (
              <Badge
                key={hashtag}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all text-sm py-1.5 px-3",
                  isSelected && "bg-purple-600 hover:bg-purple-700"
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

        {/* Selected count */}
        <p className="text-sm text-muted-foreground">
          {totalSelected} hashtag{totalSelected !== 1 ? 's' : ''} selected
        </p>

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

          {(['facebook', 'instagram', 'linkedin'] as Platform[]).map((platform) => {
            const settings = state.platformHashtagSettings[platform];
            const { icon, name, desc } = platformLabels[platform];

            return (
              <div key={platform} className="flex items-center gap-3">
                <Checkbox
                  id={`hashtag-${platform}`}
                  checked={settings.enabled}
                  onCheckedChange={(checked) => {
                    updateState({
                      platformHashtagSettings: {
                        ...state.platformHashtagSettings,
                        [platform]: { ...settings, enabled: !!checked },
                      },
                    });
                  }}
                />
                <label htmlFor={`hashtag-${platform}`} className="flex items-center gap-2 cursor-pointer">
                  <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-medium">
                    {icon}
                  </span>
                  <span className="font-medium">{name}:</span>
                  <span className="text-muted-foreground text-sm">{desc}</span>
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
