import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Rocket, AlertCircle } from 'lucide-react';
import type { WizardStep } from './types';
import { STEP_CONFIG } from './types';

interface WizardNavigationProps {
  currentStep: WizardStep;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  isLastStep: boolean;
  isPublishing?: boolean;
  validationMessage?: string; // New prop for validation feedback
}

export default function WizardNavigation({
  currentStep,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  isLastStep,
  isPublishing = false,
  validationMessage,
}: WizardNavigationProps) {
  const stepKeys = Object.keys(STEP_CONFIG) as WizardStep[];
  const nextStepIndex = stepKeys.indexOf(currentStep) + 1;
  const nextStep = stepKeys[nextStepIndex] as WizardStep | undefined;
  const nextConfig = nextStep ? STEP_CONFIG[nextStep] : null;

  return (
    <div className="space-y-3 mt-6">
      {/* Validation Message */}
      {!canGoNext && validationMessage && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {validationMessage}
          </p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={!canGoBack}
        className="gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Button>

      {!isLastStep ? (
        <Button
          onClick={onNext}
          disabled={!canGoNext}
          className="gap-2 bg-purple-600 hover:bg-purple-700"
        >
          Next: {nextConfig?.title}
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={!canGoNext || isPublishing}
          className="gap-2 bg-purple-600 hover:bg-purple-700"
        >
          <Rocket className="h-4 w-4" />
          {isPublishing ? 'Publishing...' : 'Publish Now'}
        </Button>
      )}
      </div>
    </div>
  );
}
