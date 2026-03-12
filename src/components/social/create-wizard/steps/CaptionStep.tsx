import React, { useState } from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PostIntentSubstep, ToneSubstep, HashtagPickerSubstep, EditCaptionSubstep } from './caption-substeps';
import { PresetSelector } from '../../presets';
import type { WizardState, CaptionSubstep } from '../types';
import { CAPTION_SUBSTEPS, CAPTION_SUBSTEP_CONFIG } from '../types';
import type { Preset } from '@/lib/presets/types';

interface CaptionStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

export default function CaptionStep({ state, updateState }: CaptionStepProps) {
  const currentSubstepIndex = CAPTION_SUBSTEPS.indexOf(state.captionSubstep);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Handle preset application
  const handleApplyPreset = (preset: Preset) => {
    setSelectedPresetId(preset.id);
    updateState({
      postIntent: preset.postIntent,
      tone: preset.tone,
      selectedHashtags: preset.hashtags,
      selectedTemplateId: preset.templateId,
      // Skip to edit substep since intent and tone are set
      captionSubstep: 'edit',
    });
  };

  const goToSubstep = (substep: CaptionSubstep) => {
    updateState({ captionSubstep: substep });
  };

  const goNextSubstep = () => {
    const nextIndex = currentSubstepIndex + 1;
    if (nextIndex < CAPTION_SUBSTEPS.length) {
      updateState({ captionSubstep: CAPTION_SUBSTEPS[nextIndex] });
    }
  };

  const goPrevSubstep = () => {
    const prevIndex = currentSubstepIndex - 1;
    if (prevIndex >= 0) {
      updateState({ captionSubstep: CAPTION_SUBSTEPS[prevIndex] });
    }
  };

  const renderSubstep = () => {
    switch (state.captionSubstep) {
      case 'intent':
        return (
          <PostIntentSubstep
            state={state}
            updateState={updateState}
            onNext={goNextSubstep}
          />
        );
      case 'tone':
        return (
          <ToneSubstep
            state={state}
            updateState={updateState}
            onNext={goNextSubstep}
            onBack={goPrevSubstep}
          />
        );
      case 'hashtags':
        return (
          <HashtagPickerSubstep
            state={state}
            updateState={updateState}
            onNext={goNextSubstep}
            onBack={goPrevSubstep}
          />
        );
      case 'edit':
        return (
          <EditCaptionSubstep
            state={state}
            updateState={updateState}
            onBack={goPrevSubstep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with Preset Selector */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Caption</h2>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                Choose your post intent, tone, and write your caption
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Preset Selector */}
          <PresetSelector
            currentValues={{
              postIntent: state.postIntent,
              tone: state.tone,
              hashtags: state.selectedHashtags,
              templateId: state.selectedTemplateId,
              platforms: state.selectedAccounts.length > 0
                ? ['facebook', 'instagram'] // Default platforms
                : ['facebook', 'instagram'],
            }}
            onApply={handleApplyPreset}
            selectedPresetId={selectedPresetId}
          />
        </div>

        {/* Sub-step Progress */}
        <div className="flex items-center gap-2 pb-4 border-b">
          {CAPTION_SUBSTEPS.map((substep, index) => {
            const config = CAPTION_SUBSTEP_CONFIG[substep];
            const isCompleted = index < currentSubstepIndex;
            const isCurrent = index === currentSubstepIndex;
            const isClickable = index <= currentSubstepIndex;

            return (
              <React.Fragment key={substep}>
                <button
                  onClick={() => isClickable && goToSubstep(substep)}
                  disabled={!isClickable}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
                    isCompleted && "bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary",
                    isCurrent && "bg-primary text-primary-foreground",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground",
                    isClickable ? "cursor-pointer hover:opacity-80" : "cursor-not-allowed"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-background text-primary",
                    !isCompleted && !isCurrent && "bg-muted-foreground/20"
                  )}>
                    {isCompleted ? '✓' : index + 1}
                  </span>
                  <span className="hidden sm:inline">{config.title}</span>
                </button>

                {index < CAPTION_SUBSTEPS.length - 1 && (
                  <div className={cn(
                    "w-8 h-0.5",
                    index < currentSubstepIndex ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Substep Content */}
        {renderSubstep()}
      </div>
    </TooltipProvider>
  );
}
