import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardState, PostIntent } from '../../types';
import { POST_INTENTS } from '../../types';

interface PostIntentSubstepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  onNext: () => void;
}

export default function PostIntentSubstep({ state, updateState, onNext }: PostIntentSubstepProps) {
  const handleSelect = (intentId: PostIntent) => {
    updateState({ postIntent: intentId });
  };

  // Intents that have matching image templates
  const templateLinkedIntents = ['just-listed', 'sold', 'open-house', 'personal-value', 'success-story'];

  return (
    <div className="space-y-6">
      {/* Context Input */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Label htmlFor="postContext" className="text-base">
              Property Highlights & Details <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              {state.selectedProperty
                ? 'These details were auto-filled from your property. Edit if needed.'
                : 'Describe what makes this property special and worth sharing.'}
            </p>
          </div>
        </div>
        <Textarea
          id="postContext"
          placeholder="E.g., 'Beautifully renovated 3-bed with new kitchen, granite countertops, stainless appliances. Great neighborhood near top schools and shopping. Move-in ready!'"
          value={state.postContext}
          onChange={(e) => updateState({ postContext: e.target.value })}
          rows={4}
          className="resize-none"
        />
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
          <div className="text-blue-600 dark:text-blue-400 text-lg">💡</div>
          <div className="flex-1 text-xs text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">This information is used in two ways:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>AI incorporates these details into your caption text</li>
              <li>Template image fields are auto-filled (for templates like "Value Tips" and "Open House")</li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-1">What are you announcing?</h3>
        <p className="text-sm text-muted-foreground">
          Choose the purpose of your post. This determines the key message.
        </p>
      </div>

      {/* Intent Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {POST_INTENTS.map((intent) => {
          const hasTemplate = templateLinkedIntents.includes(intent.id);
          const isSelected = state.postIntent === intent.id;

          return (
            <Card
              key={intent.id}
              onClick={() => handleSelect(intent.id)}
              className={cn(
                "cursor-pointer transition-all hover:border-purple-400",
                hasTemplate && !isSelected && "bg-purple-50/50 dark:bg-purple-950/10 border-purple-200/50",
                isSelected && "border-purple-600 ring-2 ring-purple-200 bg-purple-50 dark:bg-purple-950/20"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{intent.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{intent.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {intent.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Intent Preview */}
      {state.postIntent && (
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-2">Selected intent:</p>
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {POST_INTENTS.find(i => i.id === state.postIntent)?.icon}
            </span>
            <span className="font-medium">
              {POST_INTENTS.find(i => i.id === state.postIntent)?.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Keywords that will be included:{' '}
            <span className="text-purple-600">
              {POST_INTENTS.find(i => i.id === state.postIntent)?.keywords.slice(0, 3).join(', ')}
            </span>
          </p>
        </div>
      )}

      {/* Next Button */}
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!state.postIntent || !state.postContext || state.postContext.trim().length === 0}
          className="gap-2 bg-purple-600 hover:bg-purple-700"
        >
          Next: Choose Tone
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
