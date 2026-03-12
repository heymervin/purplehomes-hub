import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardState, CaptionTone } from '../../types';
import { TONE_PRESETS, POST_INTENTS } from '../../types';

interface ToneSubstepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ToneSubstep({ state, updateState, onNext, onBack }: ToneSubstepProps) {
  const handleSelect = (toneId: CaptionTone) => {
    updateState({ tone: toneId });
  };

  const selectedIntent = POST_INTENTS.find(i => i.id === state.postIntent);
  const selectedTone = TONE_PRESETS.find(t => t.id === state.tone);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-1">How should it sound?</h3>
        <p className="text-sm text-muted-foreground">
          Choose the voice and style of your caption.
        </p>
      </div>

      {/* Show selected intent reminder */}
      <div className="flex items-center gap-2 text-sm bg-primary/5 px-3 py-2 rounded-lg">
        <span>{selectedIntent?.icon}</span>
        <span className="text-muted-foreground">Post Intent:</span>
        <span className="font-medium text-primary">
          {selectedIntent?.label}
        </span>
      </div>

      {/* Tone Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {TONE_PRESETS.map((tone) => (
          <Card
            key={tone.id}
            onClick={() => handleSelect(tone.id)}
            className={cn(
              "cursor-pointer transition-all hover:border-primary/40",
              state.tone === tone.id && "border-primary ring-2 ring-primary/20 bg-primary/5"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{tone.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{tone.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {tone.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Example Preview */}
      {selectedTone && (
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-2">Example of {selectedTone.label} tone:</p>
          <p className="text-sm italic">"{selectedTone.example}"</p>
        </div>
      )}

      {/* Combination Preview */}
      {state.postIntent && state.tone && (
        <div className="border rounded-lg p-4 bg-gradient-to-r from-primary/5 to-transparent">
          <p className="text-sm font-medium mb-2">Your caption will be:</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-primary/10 rounded text-primary">
              {selectedIntent?.label}
            </span>
            <span className="text-muted-foreground">+</span>
            <span className="px-2 py-1 bg-primary/10 rounded text-primary">
              {selectedTone?.label} tone
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!state.tone}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Generate Caption
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
