/**
 * Step 3: Batch Caption Generation
 *
 * Choose Post Intent + Tone, then generate captions for ALL properties.
 * Uses the structured caption system v2.
 */

import { useState } from 'react';
import { Sparkles, Check, Loader2, AlertCircle, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';
import type { BatchWizardState, PropertyPostState } from '../types';
import { POST_INTENTS, TONE_PRESETS, Platform } from '../../create-wizard/types';
import { PresetSelector } from '../../presets';
import type { Preset } from '@/lib/presets/types';

interface BatchCaptionStepProps {
  properties: Property[];
  state: BatchWizardState;
  updateState: (updates: Partial<BatchWizardState>) => void;
  updatePropertyState: (propertyId: string, updates: Partial<PropertyPostState>) => void;
  updatePropertyCaption: (propertyId: string, platform: Platform, caption: string) => void;
}

export default function BatchCaptionStep({
  properties,
  state,
  updateState,
  updatePropertyState,
  updatePropertyCaption,
}: BatchCaptionStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGeneratingId, setCurrentGeneratingId] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Handle preset application
  const handleApplyPreset = (preset: Preset) => {
    setSelectedPresetId(preset.id);
    updateState({
      postIntent: preset.postIntent,
      tone: preset.tone,
      selectedHashtags: preset.hashtags,
      selectedTemplateId: preset.templateId,
    });
  };

  const selectedProperties = properties.filter((p) =>
    state.selectedPropertyIds.includes(p.id)
  );

  // Count captions
  const withCaptions = Object.values(state.propertyStates).filter(
    (ps) => ps.captions?.facebook
  ).length;

  const selectedIntent = POST_INTENTS.find((i) => i.id === state.postIntent);
  const selectedTone = TONE_PRESETS.find((t) => t.id === state.tone);

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    updateState({ isGeneratingCaptions: true });

    let completed = 0;

    for (const property of selectedProperties) {
      setCurrentGeneratingId(property.id);
      updateState({
        captionGenerationStatus: {
          ...state.captionGenerationStatus,
          [property.id]: 'generating',
        },
      });

      try {
        // Call the structured caption API v2
        const response = await fetch('/api/social/generate-caption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property: {
              address: property.address,
              city: property.city,
              state: property.state,
              price: property.price,
              beds: property.beds,
              baths: property.baths,
              sqft: property.sqft,
              propertyType: property.propertyType,
              description: property.socialMediaPropertyDescription,
            },
            context: '',
            postIntent: state.postIntent,
            tone: state.tone,
            platform: 'facebook',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Use same caption for all platforms initially
          updatePropertyState(property.id, {
            captions: {
              facebook: data.caption,
              instagram: data.caption,
              linkedin: data.caption,
            },
            status: 'ready',
          });
          updateState({
            captionGenerationStatus: {
              ...state.captionGenerationStatus,
              [property.id]: 'complete',
            },
          });
        } else {
          throw new Error('Failed to generate caption');
        }
      } catch (error) {
        console.error(`Failed to generate caption for ${property.id}:`, error);
        updateState({
          captionGenerationStatus: {
            ...state.captionGenerationStatus,
            [property.id]: 'failed',
          },
        });
      }

      completed++;
      setGenerationProgress((completed / selectedProperties.length) * 100);
    }

    setIsGenerating(false);
    setCurrentGeneratingId(null);
    updateState({ isGeneratingCaptions: false });
  };

  const handleEditCaption = (property: Property) => {
    const ps = state.propertyStates[property.id];
    setEditingProperty(property);
    setEditCaption(ps?.captions?.facebook || '');
  };

  const handleSaveCaption = () => {
    if (editingProperty) {
      updatePropertyState(editingProperty.id, {
        captions: {
          facebook: editCaption,
          instagram: editCaption,
          linkedin: editCaption,
        },
      });
      setEditingProperty(null);
      setEditCaption('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Preset Selector */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Generate Captions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose your post intent and tone, then generate captions for all {selectedProperties.length}{' '}
            properties
          </p>
        </div>

        {/* Preset Selector */}
        <PresetSelector
          currentValues={{
            postIntent: state.postIntent,
            tone: state.tone,
            hashtags: state.selectedHashtags,
            templateId: state.selectedTemplateId,
            platforms: ['facebook', 'instagram'],
          }}
          onApply={handleApplyPreset}
          selectedPresetId={selectedPresetId}
          compact
        />
      </div>

      {/* Intent Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Post Intent</Label>
        <p className="text-sm text-muted-foreground">What are you announcing?</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {POST_INTENTS.map((intent) => (
            <button
              key={intent.id}
              onClick={() => updateState({ postIntent: intent.id })}
              className={cn(
                'p-3 rounded-lg border-2 transition-all text-center',
                state.postIntent === intent.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              )}
            >
              <span className="text-xl">{intent.icon}</span>
              <p className="text-xs font-medium mt-1">{intent.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tone Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Tone</Label>
        <p className="text-sm text-muted-foreground">How should it sound?</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {TONE_PRESETS.map((tone) => (
            <button
              key={tone.id}
              onClick={() => updateState({ tone: tone.id })}
              className={cn(
                'p-3 rounded-lg border-2 transition-all text-center',
                state.tone === tone.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              )}
            >
              <span className="text-xl">{tone.icon}</span>
              <p className="text-xs font-medium mt-1">{tone.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Selection Summary */}
      <div className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <span>{selectedIntent?.icon}</span>
          <span className="font-medium">{selectedIntent?.label}</span>
        </div>
        <span className="text-muted-foreground">+</span>
        <div className="flex items-center gap-2 text-sm">
          <span>{selectedTone?.icon}</span>
          <span className="font-medium">{selectedTone?.label}</span>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerateAll}
        disabled={isGenerating}
        className="w-full gap-2"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Captions... ({Math.round(generationProgress)}%)
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate {selectedProperties.length} Captions
          </>
        )}
      </Button>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="space-y-2">
          <Progress value={generationProgress} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">
            {currentGeneratingId
              ? `Generating caption for ${properties.find((p) => p.id === currentGeneratingId)?.address}...`
              : 'Preparing...'}
          </p>
        </div>
      )}

      {/* Captions Preview */}
      {withCaptions > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Generated Captions</Label>
            <Badge variant="secondary">{withCaptions} / {selectedProperties.length}</Badge>
          </div>
          <ScrollArea className="h-[250px] border rounded-lg">
            <div className="p-3 space-y-3">
              {selectedProperties.map((property) => {
                const ps = state.propertyStates[property.id];
                const status = state.captionGenerationStatus[property.id];
                const caption = ps?.captions?.facebook || '';

                return (
                  <div
                    key={property.id}
                    className="p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate max-w-[200px]">
                          {property.address}
                        </span>
                        {status === 'generating' && (
                          <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                        )}
                        {status === 'complete' && (
                          <Check className="h-3 w-3 text-green-600" />
                        )}
                        {status === 'failed' && (
                          <AlertCircle className="h-3 w-3 text-red-600" />
                        )}
                      </div>
                      {caption && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCaption(property)}
                          className="h-7 gap-1"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </Button>
                      )}
                    </div>
                    {caption ? (
                      <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                        {caption}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        {status === 'generating' ? 'Generating...' : 'No caption yet'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingProperty} onOpenChange={() => setEditingProperty(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Caption</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{editingProperty?.address}</p>
            <Textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingProperty(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCaption}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
