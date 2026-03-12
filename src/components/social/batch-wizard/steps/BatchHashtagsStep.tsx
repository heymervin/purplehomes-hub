/**
 * Step 4: Batch Hashtags
 *
 * Select hashtags that will be applied to ALL posts.
 * Can customize per platform.
 */

import { useState, useMemo } from 'react';
import { Hash, Plus, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';
import type { BatchWizardState } from '../types';
import type { Platform } from '../../create-wizard/types';

// Common real estate hashtags
const SUGGESTED_HASHTAGS = {
  general: [
    '#realestate',
    '#realtor',
    '#property',
    '#home',
    '#homesforsale',
    '#househunting',
    '#dreamhome',
    '#newhome',
  ],
  'just-listed': [
    '#justlisted',
    '#newlisting',
    '#forsale',
    '#comingsoon',
    '#openhouse',
  ],
  sold: ['#justsold', '#sold', '#closingday', '#newowners', '#realtorsuccess'],
  investment: [
    '#realestateinvesting',
    '#investmentproperty',
    '#passiveincome',
    '#cashflow',
    '#fliphouse',
  ],
  luxury: [
    '#luxuryrealestate',
    '#luxuryhomes',
    '#milliondollarlisting',
    '#luxurylifestyle',
  ],
};

interface BatchHashtagsStepProps {
  properties: Property[];
  state: BatchWizardState;
  updateState: (updates: Partial<BatchWizardState>) => void;
}

export default function BatchHashtagsStep({
  properties,
  state,
  updateState,
}: BatchHashtagsStepProps) {
  const [customHashtag, setCustomHashtag] = useState('');

  // Get relevant suggested hashtags based on post intent
  const relevantHashtags = useMemo(() => {
    const intent = state.postIntent;
    const intentHashtags =
      SUGGESTED_HASHTAGS[intent as keyof typeof SUGGESTED_HASHTAGS] ||
      SUGGESTED_HASHTAGS['just-listed'];
    return [...new Set([...intentHashtags, ...SUGGESTED_HASHTAGS.general])];
  }, [state.postIntent]);

  // All selected hashtags (suggested + custom)
  const allHashtags = [...state.selectedHashtags, ...state.customHashtags];

  const toggleHashtag = (hashtag: string) => {
    if (state.selectedHashtags.includes(hashtag)) {
      updateState({
        selectedHashtags: state.selectedHashtags.filter((h) => h !== hashtag),
      });
    } else {
      updateState({
        selectedHashtags: [...state.selectedHashtags, hashtag],
      });
    }
  };

  const addCustomHashtag = () => {
    if (!customHashtag.trim()) return;

    let tag = customHashtag.trim();
    if (!tag.startsWith('#')) tag = '#' + tag;
    tag = tag.toLowerCase().replace(/\s+/g, '');

    if (!state.customHashtags.includes(tag) && !state.selectedHashtags.includes(tag)) {
      updateState({
        customHashtags: [...state.customHashtags, tag],
      });
    }
    setCustomHashtag('');
  };

  const removeCustomHashtag = (hashtag: string) => {
    updateState({
      customHashtags: state.customHashtags.filter((h) => h !== hashtag),
    });
  };

  const togglePlatformHashtags = (platform: Platform, enabled: boolean) => {
    updateState({
      platformHashtagSettings: {
        ...state.platformHashtagSettings,
        [platform]: {
          ...state.platformHashtagSettings[platform],
          enabled,
        },
      },
    });
  };

  const updatePlatformLimit = (platform: Platform, limit: number | null) => {
    updateState({
      platformHashtagSettings: {
        ...state.platformHashtagSettings,
        [platform]: {
          ...state.platformHashtagSettings[platform],
          limit,
        },
      },
    });
  };

  const selectAllSuggested = () => {
    updateState({ selectedHashtags: [...relevantHashtags] });
  };

  const clearAll = () => {
    updateState({ selectedHashtags: [], customHashtags: [] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Hashtags</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select hashtags to add to all {state.selectedPropertyIds.length} posts
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={selectAllSuggested} className="gap-2">
          <Sparkles className="h-3 w-3" />
          Select All Suggested
        </Button>
        {allHashtags.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear All
          </Button>
        )}
      </div>

      {/* Selected Hashtags */}
      {allHashtags.length > 0 && (
        <div className="p-4 bg-primary/10 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{allHashtags.length} hashtags selected</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.selectedHashtags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer hover:bg-muted"
                onClick={() => toggleHashtag(tag)}
              >
                {tag}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
            {state.customHashtags.map((tag) => (
              <Badge
                key={tag}
                className="bg-primary cursor-pointer hover:bg-primary/90"
                onClick={() => removeCustomHashtag(tag)}
              >
                {tag}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Hashtags */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Suggested Hashtags</Label>
        <div className="flex flex-wrap gap-2">
          {relevantHashtags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleHashtag(tag)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm transition-all',
                state.selectedHashtags.includes(tag)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Add Custom Hashtag */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Add Custom Hashtag</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Enter hashtag..."
            value={customHashtag}
            onChange={(e) => setCustomHashtag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomHashtag();
              }
            }}
            className="flex-1"
          />
          <Button onClick={addCustomHashtag} disabled={!customHashtag.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Platform Settings */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Platform Settings</Label>
        <div className="space-y-3">
          {/* Facebook */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                id="fb-hashtags"
                checked={state.platformHashtagSettings.facebook.enabled}
                onCheckedChange={(checked) => togglePlatformHashtags('facebook', !!checked)}
              />
              <Label htmlFor="fb-hashtags" className="cursor-pointer">
                Facebook
              </Label>
            </div>
            {state.platformHashtagSettings.facebook.enabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Limit:</span>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={state.platformHashtagSettings.facebook.limit || ''}
                  onChange={(e) =>
                    updatePlatformLimit('facebook', e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder="No limit"
                  className="w-20 h-8 text-sm"
                />
              </div>
            )}
          </div>

          {/* Instagram */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                id="ig-hashtags"
                checked={state.platformHashtagSettings.instagram.enabled}
                onCheckedChange={(checked) => togglePlatformHashtags('instagram', !!checked)}
              />
              <Label htmlFor="ig-hashtags" className="cursor-pointer">
                Instagram
              </Label>
            </div>
            {state.platformHashtagSettings.instagram.enabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Limit:</span>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={state.platformHashtagSettings.instagram.limit || ''}
                  onChange={(e) =>
                    updatePlatformLimit('instagram', e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder="No limit"
                  className="w-20 h-8 text-sm"
                />
              </div>
            )}
          </div>

          {/* LinkedIn */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                id="li-hashtags"
                checked={state.platformHashtagSettings.linkedin.enabled}
                onCheckedChange={(checked) => togglePlatformHashtags('linkedin', !!checked)}
              />
              <Label htmlFor="li-hashtags" className="cursor-pointer">
                LinkedIn
              </Label>
            </div>
            {state.platformHashtagSettings.linkedin.enabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Limit:</span>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={state.platformHashtagSettings.linkedin.limit || ''}
                  onChange={(e) =>
                    updatePlatformLimit('linkedin', e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder="No limit"
                  className="w-20 h-8 text-sm"
                />
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Instagram recommends 3-5 hashtags for best engagement. LinkedIn works best with 3-5 or none.
        </p>
      </div>
    </div>
  );
}
