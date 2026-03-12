/**
 * BatchWizard - Multi-property social media post wizard
 *
 * Same flow as CreateWizard but for multiple properties:
 * 1. Select Properties
 * 2. Generate Images (batch)
 * 3. Generate Captions (batch)
 * 4. Hashtags
 * 5. Schedule/Stagger
 * 6. Review & Publish
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAirtableProperties } from '@/services/matchingApi';
import { useCreateSocialPost } from '@/services/ghlApi';
import { useBatchWizardState } from './hooks/useBatchWizardState';
import { BatchWizardProgress } from './components/BatchWizardProgress';
import { BatchWizardNavigation } from './components/BatchWizardNavigation';
import {
  SelectPropertiesStep,
  BatchImageStep,
  BatchCaptionStep,
  BatchHashtagsStep,
  BatchScheduleStep,
  BatchReviewStep,
} from './steps';
import { addHours, setHours, setMinutes } from 'date-fns';
import type { Property } from '@/types';

export default function BatchWizard() {
  const { toast } = useToast();
  const createPost = useCreateSocialPost();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);

  // Get properties from Airtable
  const { data: airtableData, isLoading } = useAirtableProperties(200);

  // Transform properties
  const properties: Property[] = useMemo(() => {
    if (isLoading || !airtableData?.properties) return [];

    return airtableData.properties.map((p) => ({
      id: p.recordId || p.opportunityId || '',
      ghlOpportunityId: p.opportunityId,
      propertyCode: p.propertyCode || 'N/A',
      address: p.address || '',
      city: p.city || '',
      state: p.state || '',
      price: p.price || 0,
      beds: p.beds || 0,
      baths: p.baths || 0,
      sqft: p.sqft,
      condition: p.condition,
      propertyType: p.propertyType,
      description: p.notes,
      heroImage: p.heroImage || '',
      images: p.images || [],
      status: 'pending' as const,
      caption: '',
      createdAt: p.createdAt || new Date().toISOString(),
      isDemo: false,
    }));
  }, [airtableData, isLoading]);

  // Wizard state
  const {
    state,
    updateState,
    selectedProperties,
    toggleProperty,
    selectAll,
    deselectAll,
    updatePropertyState,
    updatePropertyCaption,
    goToStep,
    goNext,
    goBack,
    canGoNext,
    canGoBack,
    resetWizard,
    stats,
  } = useBatchWizardState(properties);

  // Handle publish
  const handlePublish = async () => {
    if (state.selectedAccounts.length === 0) {
      toast({
        title: 'No accounts selected',
        description: 'Please select at least one social media account.',
        variant: 'destructive',
      });
      return;
    }

    setIsPublishing(true);
    setPublishProgress(0);

    const allHashtags = [...state.selectedHashtags, ...state.customHashtags];
    let completed = 0;
    let failed = 0;

    // Calculate scheduled times for staggered posts
    let scheduledTimes: Record<string, Date> = {};
    if (state.scheduleType === 'staggered' && state.staggerSettings.startDate) {
      const startDate = new Date(state.staggerSettings.startDate);
      const [hours, minutes] = state.staggerSettings.startTime.split(':').map(Number);
      let currentTime = setMinutes(setHours(startDate, hours), minutes);

      selectedProperties.forEach((property, index) => {
        scheduledTimes[property.id] = addHours(
          currentTime,
          index * state.staggerSettings.intervalHours
        );
      });
    }

    for (const property of selectedProperties) {
      try {
        const ps = state.propertyStates[property.id];
        const imageUrl = ps?.generatedImageUrl || property.heroImage;
        let caption = ps?.captions?.facebook || '';

        // Add hashtags
        if (allHashtags.length > 0 && state.platformHashtagSettings.facebook.enabled) {
          const limit = state.platformHashtagSettings.facebook.limit;
          const hashtags = limit ? allHashtags.slice(0, limit) : allHashtags;
          caption += '\n\n' + hashtags.join(' ');
        }

        // Build schedule date
        let scheduleDate: string | undefined;
        if (state.scheduleType === 'staggered' && scheduledTimes[property.id]) {
          scheduleDate = scheduledTimes[property.id].toISOString();
        }

        // Create post
        await createPost.mutateAsync({
          accountIds: state.selectedAccounts,
          summary: caption,
          media: imageUrl ? [{ url: imageUrl, type: 'image/png' }] : undefined,
          scheduleDate,
          status: state.scheduleType === 'now' ? 'published' : 'scheduled',
        });

        completed++;
      } catch (error) {
        console.error(`Failed to publish post for ${property.id}:`, error);
        failed++;
      }

      setPublishProgress(((completed + failed) / selectedProperties.length) * 100);
    }

    setIsPublishing(false);

    if (failed === 0) {
      toast({
        title: 'Batch published successfully!',
        description: `${completed} posts have been ${state.scheduleType === 'now' ? 'published' : 'scheduled'}.`,
      });
      resetWizard();
    } else {
      toast({
        title: 'Batch completed with errors',
        description: `${completed} succeeded, ${failed} failed.`,
        variant: 'destructive',
      });
    }
  };

  const handleNext = () => {
    if (state.currentStep === 'review') {
      handlePublish();
    } else {
      goNext();
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 'select':
        return (
          <SelectPropertiesStep
            properties={properties}
            state={state}
            onToggleProperty={toggleProperty}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
          />
        );
      case 'image':
        return (
          <BatchImageStep
            properties={selectedProperties}
            state={state}
            updateState={updateState}
            updatePropertyState={updatePropertyState}
          />
        );
      case 'caption':
        return (
          <BatchCaptionStep
            properties={selectedProperties}
            state={state}
            updateState={updateState}
            updatePropertyState={updatePropertyState}
            updatePropertyCaption={updatePropertyCaption}
          />
        );
      case 'hashtags':
        return (
          <BatchHashtagsStep
            properties={selectedProperties}
            state={state}
            updateState={updateState}
          />
        );
      case 'schedule':
        return (
          <BatchScheduleStep
            properties={selectedProperties}
            state={state}
            updateState={updateState}
          />
        );
      case 'review':
        return (
          <BatchReviewStep
            properties={selectedProperties}
            state={state}
            isPublishing={isPublishing}
            publishProgress={publishProgress}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <BatchWizardProgress
        currentStep={state.currentStep}
        onStepClick={goToStep}
      />

      {/* Step Content */}
      <Card className="mt-6">
        <CardContent className="p-6">{renderStep()}</CardContent>
      </Card>

      {/* Navigation */}
      <BatchWizardNavigation
        currentStep={state.currentStep}
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        onBack={goBack}
        onNext={handleNext}
        isPublishing={isPublishing}
        selectedCount={state.selectedPropertyIds.length}
      />
    </div>
  );
}
