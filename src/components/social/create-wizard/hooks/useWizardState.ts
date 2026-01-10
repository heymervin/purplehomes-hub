import { useReducer, useCallback } from 'react';
import type { WizardState, WizardStep, CaptionSubstep } from '../types';
import { INITIAL_WIZARD_STATE, WIZARD_STEPS, CAPTION_SUBSTEPS } from '../types';

type WizardAction =
  | { type: 'UPDATE'; payload: Partial<WizardState> }
  | { type: 'GO_TO_STEP'; payload: WizardStep }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'RESET' };

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'UPDATE':
      return { ...state, ...action.payload };

    case 'GO_TO_STEP':
      return { ...state, currentStep: action.payload };

    case 'NEXT': {
      const currentIndex = WIZARD_STEPS.indexOf(state.currentStep);

      // Special handling for caption step - check substeps
      if (state.currentStep === 'caption') {
        const captionSubstepIndex = CAPTION_SUBSTEPS.indexOf(state.captionSubstep);
        if (captionSubstepIndex < CAPTION_SUBSTEPS.length - 1) {
          // Move to next substep
          return {
            ...state,
            captionSubstep: CAPTION_SUBSTEPS[captionSubstepIndex + 1],
          };
        }
      }

      // Move to next main step
      if (currentIndex < WIZARD_STEPS.length - 1) {
        const nextStep = WIZARD_STEPS[currentIndex + 1];
        return {
          ...state,
          currentStep: nextStep,
          // Reset caption substep when entering caption step
          captionSubstep: nextStep === 'caption' ? 'intent' : state.captionSubstep,
        };
      }
      return state;
    }

    case 'BACK': {
      const currentIndex = WIZARD_STEPS.indexOf(state.currentStep);

      // Special handling for caption step - check substeps
      if (state.currentStep === 'caption') {
        const captionSubstepIndex = CAPTION_SUBSTEPS.indexOf(state.captionSubstep);
        if (captionSubstepIndex > 0) {
          // Move to previous substep
          return {
            ...state,
            captionSubstep: CAPTION_SUBSTEPS[captionSubstepIndex - 1],
          };
        }
      }

      // Move to previous main step
      if (currentIndex > 0) {
        return { ...state, currentStep: WIZARD_STEPS[currentIndex - 1] };
      }
      return state;
    }

    case 'RESET':
      return INITIAL_WIZARD_STATE;

    default:
      return state;
  }
}

export function useWizardState() {
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_WIZARD_STATE);

  const updateState = useCallback((updates: Partial<WizardState>) => {
    dispatch({ type: 'UPDATE', payload: updates });
  }, []);

  const goToStep = useCallback((step: WizardStep) => {
    dispatch({ type: 'GO_TO_STEP', payload: step });
  }, []);

  const goNext = useCallback(() => {
    dispatch({ type: 'NEXT' });
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: 'BACK' });
  }, []);

  const resetWizard = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // Validation for navigation
  const canGoNext = useCallback(() => {
    switch (state.currentStep) {
      case 'source':
        // For property posts, must select a property
        if (state.postType === 'property') {
          return !!state.selectedProperty;
        }
        // Can always proceed for custom/text-only
        return true;
      case 'image':
        // Can proceed if has image, template selected, OR is text-only
        return state.postType === 'text-only' ||
          !!state.selectedTemplateId ||
          !!state.generatedImageUrl ||
          !!state.customImagePreview;
      case 'caption':
        // Must complete all substeps - only allow "Next" from main wizard when on edit substep
        if (state.captionSubstep !== 'edit') return true;
        return Object.values(state.captions).some(c => c.length > 0);
      case 'hashtags':
        // Can always proceed
        return true;
      case 'publish':
        // Must have at least one account selected
        return state.selectedAccounts.length > 0;
      default:
        return false;
    }
  }, [state]);

  const canGoBack = state.currentStep !== 'source' ||
    (state.currentStep === 'caption' && state.captionSubstep !== 'intent');

  return {
    state,
    updateState,
    goToStep,
    goNext,
    goBack,
    canGoNext: canGoNext(),
    canGoBack,
    resetWizard,
  };
}
