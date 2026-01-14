import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, RefreshCw, Loader2, Copy, Check, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCaptionGenerate } from '../../hooks/useCaptionGenerate';
import type { WizardState, Platform } from '../../types';
import { POST_INTENTS, TONE_PRESETS } from '../../types';
import { PLATFORM_HASHTAG_RULES } from '@/lib/socialHub';
import { getAgentById } from '@/lib/socialHub/agents';

interface EditCaptionSubstepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  onBack: () => void;
}

export default function EditCaptionSubstep({ state, updateState, onBack }: EditCaptionSubstepProps) {
  const [activePlatform, setActivePlatform] = useState<Platform>('facebook');
  const [copiedPlatform, setCopiedPlatform] = useState<Platform | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { generateCaption } = useCaptionGenerate();

  const selectedIntent = POST_INTENTS.find(i => i.id === state.postIntent);
  const selectedTone = TONE_PRESETS.find(t => t.id === state.tone);

  // Get platform-specific hashtags respecting limits
  const getHashtagsForPlatform = (platform: Platform): string => {
    const settings = state.platformHashtagSettings[platform];
    if (!settings?.enabled) return '';

    const rules = PLATFORM_HASHTAG_RULES[platform];
    const maxTags = rules?.maxHashtags || 5;
    const hashtags = state.selectedHashtags.slice(0, maxTags);

    return hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '';
  };

  // Compute hashtag preview per platform
  const hashtagsPerPlatform = useMemo(() => ({
    facebook: getHashtagsForPlatform('facebook'),
    instagram: getHashtagsForPlatform('instagram'),
    linkedin: getHashtagsForPlatform('linkedin'),
  }), [state.selectedHashtags, state.platformHashtagSettings]);

  // Auto-generate caption when this substep loads
  useEffect(() => {
    if (!state.captions.facebook) {
      handleGenerateAll();
    }
  }, []);

  // Get agent name for signature
  const agentName = state.selectedAgentId ? getAgentById(state.selectedAgentId)?.name : undefined;

  // Generate caption for a single platform
  const handleGenerate = async (platform: Platform) => {
    setIsGenerating(true);
    updateState({ isGeneratingCaption: true });

    try {
      const result = await generateCaption({
        property: state.selectedProperty,
        context: state.postContext,
        tone: state.tone,
        platform,
        postIntent: state.postIntent,
        agentName,
      });

      if (result.success) {
        if (state.useSameCaptionForAll) {
          updateState({
            captions: {
              facebook: result.caption,
              instagram: result.caption,
              linkedin: result.caption,
            },
          });
        } else {
          updateState({
            captions: {
              ...state.captions,
              [platform]: result.caption,
            },
          });
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
      updateState({ isGeneratingCaption: false });
    }
  };

  // Generate for all platforms
  const handleGenerateAll = async () => {
    setIsGenerating(true);
    updateState({ isGeneratingCaption: true });

    const platforms: Platform[] = ['facebook', 'instagram', 'linkedin'];
    const newCaptions: Record<Platform, string> = { ...state.captions };

    for (const platform of platforms) {
      try {
        const result = await generateCaption({
          property: state.selectedProperty,
          context: state.postContext,
          tone: state.tone,
          platform,
          postIntent: state.postIntent,
          agentName,
        });

        if (result.success) {
          newCaptions[platform] = result.caption;
        }
      } catch (error) {
        console.error(`Error generating ${platform} caption:`, error);
      }
    }

    updateState({ captions: newCaptions });
    setIsGenerating(false);
    updateState({ isGeneratingCaption: false });
  };

  // Handle caption edit
  const handleCaptionChange = (platform: Platform, value: string) => {
    if (state.useSameCaptionForAll) {
      updateState({
        captions: {
          facebook: value,
          instagram: value,
          linkedin: value,
        },
      });
    } else {
      updateState({
        captions: {
          ...state.captions,
          [platform]: value,
        },
      });
    }
  };

  // Get full caption with hashtags for a platform
  const getFullCaption = (platform: Platform): string => {
    const caption = state.captions[platform];
    const hashtags = hashtagsPerPlatform[platform];
    return caption + hashtags;
  };

  // Copy caption with hashtags
  const handleCopy = async (platform: Platform) => {
    await navigator.clipboard.writeText(getFullCaption(platform));
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Current Selection Summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm bg-purple-50 dark:bg-purple-950/20 px-3 py-1.5 rounded-full">
          <span>{selectedIntent?.icon}</span>
          <span className="font-medium">{selectedIntent?.label}</span>
        </div>
        <div className="flex items-center gap-2 text-sm bg-purple-50 dark:bg-purple-950/20 px-3 py-1.5 rounded-full">
          <span>{selectedTone?.icon}</span>
          <span className="font-medium">{selectedTone?.label}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateAll}
          disabled={isGenerating}
          className="gap-2"
        >
          <RefreshCw className={cn("h-3 w-3", isGenerating && "animate-spin")} />
          Regenerate All
        </Button>
      </div>

      {/* Same caption toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="same-caption"
          checked={state.useSameCaptionForAll}
          onCheckedChange={(checked) => {
            updateState({ useSameCaptionForAll: !!checked });
            if (checked) {
              // Sync all to current platform's caption
              const currentCaption = state.captions[activePlatform];
              updateState({
                captions: {
                  facebook: currentCaption,
                  instagram: currentCaption,
                  linkedin: currentCaption,
                },
              });
            }
          }}
        />
        <Label htmlFor="same-caption" className="text-sm cursor-pointer">
          Use same caption for all platforms
        </Label>
      </div>

      {/* Platform Tabs */}
      <Tabs value={activePlatform} onValueChange={(v) => setActivePlatform(v as Platform)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="facebook" className="gap-2">
            <span>FB</span> Facebook
          </TabsTrigger>
          <TabsTrigger value="instagram" className="gap-2">
            <span>IG</span> Instagram
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="gap-2">
            <span>LI</span> LinkedIn
          </TabsTrigger>
        </TabsList>

        {(['facebook', 'instagram', 'linkedin'] as Platform[]).map((platform) => {
          const platformHashtags = hashtagsPerPlatform[platform];
          const hashtagCount = platformHashtags ? state.selectedHashtags.slice(0, PLATFORM_HASHTAG_RULES[platform]?.maxHashtags || 5).length : 0;

          return (
            <TabsContent key={platform} value={platform} className="mt-4 space-y-3">
              <div className="relative">
                <Textarea
                  value={state.captions[platform]}
                  onChange={(e) => handleCaptionChange(platform, e.target.value)}
                  placeholder="Your caption will appear here..."
                  rows={8}
                  className="resize-none font-sans"
                  disabled={isGenerating}
                />

                {isGenerating && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                      <span className="text-sm text-muted-foreground">Generating caption...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Hashtag Preview */}
              {platformHashtags && state.platformHashtagSettings[platform]?.enabled && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {hashtagCount} hashtag{hashtagCount !== 1 ? 's' : ''} will be added
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground break-words">
                    {platformHashtags.trim()}
                  </p>
                </div>
              )}

              {/* Caption Footer */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {getFullCaption(platform).length} characters (with hashtags)
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(platform)}
                    className="gap-1 h-8"
                  >
                    {copiedPlatform === platform ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </Button>

                  {!state.useSameCaptionForAll && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerate(platform)}
                      disabled={isGenerating}
                      className="gap-1 h-8"
                    >
                      <RefreshCw className={cn("h-3 w-3", isGenerating && "animate-spin")} />
                      Regenerate
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Back Button */}
      <div className="flex justify-start pt-4 border-t">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Change Hashtags
        </Button>
      </div>
    </div>
  );
}
