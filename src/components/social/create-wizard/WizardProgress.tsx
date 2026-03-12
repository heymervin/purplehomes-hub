import { Check, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { WizardStep } from './types';
import { STEP_CONFIG, WIZARD_STEPS } from './types';

interface WizardProgressProps {
  currentStep: WizardStep;
  steps: WizardStep[];
  onStepClick: (step: WizardStep) => void;
}

export default function WizardProgress({
  currentStep,
  steps,
  onStepClick,
}: WizardProgressProps) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <TooltipProvider>
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Step Indicators */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const config = STEP_CONFIG[step];
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isClickable = index <= currentIndex;

            return (
              <Tooltip key={step}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => isClickable && onStepClick(step)}
                    disabled={!isClickable}
                    className={cn(
                      "flex flex-col items-center gap-2 group",
                      isClickable ? "cursor-pointer" : "cursor-not-allowed"
                    )}
                  >
                    {/* Circle */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                        isCompleted && "bg-primary border-primary text-primary-foreground",
                        isCurrent && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                        !isCompleted && !isCurrent && "bg-background border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-semibold">{config.number}</span>
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={cn(
                        "text-xs font-medium transition-colors",
                        (isCompleted || isCurrent) ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {config.title}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="flex items-center gap-2">
                  <Info className="h-3 w-3" />
                  {config.tooltip}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
