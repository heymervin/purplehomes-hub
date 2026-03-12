/**
 * BatchWizardProgress - Progress indicator for the batch wizard
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BatchWizardStep, BATCH_STEP_CONFIG, BATCH_WIZARD_STEPS } from '../types';

interface BatchWizardProgressProps {
  currentStep: BatchWizardStep;
  onStepClick?: (step: BatchWizardStep) => void;
}

export function BatchWizardProgress({ currentStep, onStepClick }: BatchWizardProgressProps) {
  const currentIndex = BATCH_WIZARD_STEPS.indexOf(currentStep);

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between w-full">
        {BATCH_WIZARD_STEPS.map((step, index) => {
          const config = BATCH_STEP_CONFIG[step];
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isClickable = index <= currentIndex;

          return (
            <React.Fragment key={step}>
              {/* Step Circle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => isClickable && onStepClick?.(step)}
                    disabled={!isClickable}
                    className={cn(
                      'flex flex-col items-center gap-1.5 transition-all',
                      isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-all',
                        isCompleted && 'bg-primary text-primary-foreground',
                        isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                        !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        config.number
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium hidden sm:block',
                        isCurrent && 'text-primary',
                        isCompleted && 'text-primary',
                        !isCompleted && !isCurrent && 'text-muted-foreground'
                      )}
                    >
                      {config.shortTitle}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{config.title}</p>
                  <p className="text-xs text-muted-foreground">{config.tooltip}</p>
                </TooltipContent>
              </Tooltip>

              {/* Connector Line */}
              {index < BATCH_WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    index < currentIndex ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
