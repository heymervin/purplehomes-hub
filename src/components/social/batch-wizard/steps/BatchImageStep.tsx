/**
 * Step 2: Batch Image Generation
 *
 * Choose ONE template for all properties.
 * Select agent (for templates with agent fields).
 * Per-property: pick hero image and supporting images.
 * Generate images for all selected properties.
 */

import { useState, useMemo } from 'react';
import { Image, Check, AlertCircle, Loader2, User, ChevronDown, ChevronUp, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { TemplateSelector } from '@/components/social/templates';
import { SupportingImagePicker } from '@/components/social/templates/SupportingImagePicker';
import { getTemplateById } from '@/lib/templates/profiles';
import { FALLBACK_AGENTS, getAgentById } from '@/lib/socialHub/agents';
import { useAgents } from '@/services/authApi';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';
import type { TemplateProfile } from '@/lib/templates/types';
import type { BatchWizardState, PropertyPostState } from '../types';

interface BatchImageStepProps {
  properties: Property[];
  state: BatchWizardState;
  updateState: (updates: Partial<BatchWizardState>) => void;
  updatePropertyState: (propertyId: string, updates: Partial<PropertyPostState>) => void;
}

export default function BatchImageStep({
  properties,
  state,
  updateState,
  updatePropertyState,
}: BatchImageStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGeneratingId, setCurrentGeneratingId] = useState<string | null>(null);
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

  // Fetch dynamic agents from API (admins with profiles)
  const { data: dynamicAgents } = useAgents();
  const agents = dynamicAgents && dynamicAgents.length > 0 ? dynamicAgents : FALLBACK_AGENTS;

  const selectedProperties = properties.filter((p) =>
    state.selectedPropertyIds.includes(p.id)
  );

  const selectedTemplate = state.selectedTemplateId
    ? getTemplateById(state.selectedTemplateId)
    : null;

  // Check if template needs supporting images
  const templateNeedsSupportingImages = useMemo(() => {
    if (!selectedTemplate) return false;
    return Object.values(selectedTemplate.fields).some(
      field => field.propertyPath?.startsWith('images[')
    );
  }, [selectedTemplate]);

  // Count properties by image status
  const withExistingImage = selectedProperties.filter((p) => p.heroImage).length;
  const withoutImage = selectedProperties.length - withExistingImage;
  const needsGeneration = state.skipExistingImages ? withoutImage : selectedProperties.length;

  // Check generation status
  const generatedCount = Object.values(state.propertyStates).filter(
    (ps) => ps.generatedImageUrl
  ).length;

  // Handle template selection
  const handleSelectTemplate = (template: TemplateProfile) => {
    updateState({ selectedTemplateId: template.id });
  };

  // Handle supporting image selection per property
  const handleSupportingImagesChange = (propertyId: string, images: string[]) => {
    updatePropertyState(propertyId, {
      selectedSupportingImages: images,
    });
  };

  // Handle hero image selection per property
  const handleHeroImageChange = (propertyId: string, heroImage: string) => {
    updatePropertyState(propertyId, {
      selectedHeroImage: heroImage,
    });
  };

  const handleGenerateAll = async () => {
    if (!state.selectedTemplateId) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    updateState({ isGeneratingImages: true });

    const propertiesToGenerate = state.skipExistingImages
      ? selectedProperties.filter((p) => !p.heroImage)
      : selectedProperties;

    let completed = 0;

    for (const property of propertiesToGenerate) {
      setCurrentGeneratingId(property.id);
      updateState({
        imageGenerationStatus: {
          ...state.imageGenerationStatus,
          [property.id]: 'generating',
        },
      });

      try {
        const propertyState = state.propertyStates[property.id];
        const selectedAgent = state.selectedAgentId
          ? getAgentById(state.selectedAgentId, agents)
          : agents[0];

        // Use selected hero image or fall back to property's hero image
        const heroImage = propertyState?.selectedHeroImage || property.heroImage;

        // Use selected supporting images or fall back to property's images
        const supportingImages = propertyState?.selectedSupportingImages || property.images || [];

        // Call Imejis API to generate image
        const response = await fetch('/api/ghl?resource=imejis-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: state.selectedTemplateId,
            property: {
              address: property.address,
              city: property.city,
              state: property.state,
              zipCode: property.zipCode,
              price: property.price,
              downPayment: property.downPayment,
              beds: property.beds,
              baths: property.baths,
              sqft: property.sqft,
              heroImage: heroImage,
              images: supportingImages,
            },
            agent: selectedAgent,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          updatePropertyState(property.id, {
            generatedImageUrl: data.imageUrl || data.url,
            status: 'ready',
          });
          updateState({
            imageGenerationStatus: {
              ...state.imageGenerationStatus,
              [property.id]: 'complete',
            },
          });
        } else {
          throw new Error('Failed to generate image');
        }
      } catch (error) {
        console.error(`Failed to generate image for ${property.id}:`, error);
        updateState({
          imageGenerationStatus: {
            ...state.imageGenerationStatus,
            [property.id]: 'failed',
          },
        });
        updatePropertyState(property.id, {
          status: 'failed',
          error: 'Image generation failed',
        });
      }

      completed++;
      setGenerationProgress((completed / propertiesToGenerate.length) * 100);
    }

    setIsGenerating(false);
    setCurrentGeneratingId(null);
    updateState({ isGeneratingImages: false });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Generate Images</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a template and generate branded images for your {selectedProperties.length}{' '}
          properties
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-muted/50 rounded-lg text-center">
          <p className="text-2xl font-bold">{selectedProperties.length}</p>
          <p className="text-xs text-muted-foreground">Selected</p>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">{withExistingImage}</p>
          <p className="text-xs text-muted-foreground">Have Images</p>
        </div>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-600">{withoutImage}</p>
          <p className="text-xs text-muted-foreground">Need Images</p>
        </div>
      </div>

      {/* Agent Selector */}
      <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/30 dark:bg-purple-950/10">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-5 w-5 text-purple-600" />
          <Label className="font-medium text-base mb-0">Posting As</Label>
        </div>
        <Select
          value={state.selectedAgentId || 'krista'}
          onValueChange={(value) => updateState({ selectedAgentId: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select agent" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-muted-foreground text-xs">({agent.phone})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-2">
          Agent info will appear on all generated images
        </p>
      </div>

      {/* Template Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Choose Template</Label>
        <div className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50/30 dark:bg-purple-950/10">
          <TemplateSelector
            selectedTemplateId={state.selectedTemplateId}
            onSelect={handleSelectTemplate}
            hasProperty={selectedProperties.length > 0}
            propertyHasImages={selectedProperties.some(p => p.heroImage || (p.images && p.images.length > 0))}
          />
        </div>
      </div>

      {/* Per-Property Image Selection */}
      {selectedTemplate && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Property Images</Label>
            <Badge variant="secondary">
              {templateNeedsSupportingImages ? 'Hero + Supporting' : 'Hero Only'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Click on a property to select which images to use for the template
          </p>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {selectedProperties.map((property) => {
                const propertyState = state.propertyStates[property.id];
                const isExpanded = expandedPropertyId === property.id;
                const hasImages = property.heroImage || (property.images && property.images.length > 0);
                const allImages = [
                  ...(property.heroImage ? [property.heroImage] : []),
                  ...(property.images || []),
                ].filter((img, idx, arr) => arr.indexOf(img) === idx);

                return (
                  <Collapsible
                    key={property.id}
                    open={isExpanded}
                    onOpenChange={() => setExpandedPropertyId(isExpanded ? null : property.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "w-full p-3 rounded-lg border transition-all text-left",
                          "hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/20",
                          isExpanded && "border-purple-400 bg-purple-50/50 dark:bg-purple-950/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* Property thumbnail */}
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {property.heroImage ? (
                              <img
                                src={property.heroImage}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Property info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {property.address}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {allImages.length} images available
                            </p>
                          </div>

                          {/* Status badges */}
                          <div className="flex items-center gap-2">
                            {propertyState?.selectedHeroImage && (
                              <Badge variant="outline" className="text-xs">
                                Hero set
                              </Badge>
                            )}
                            {propertyState?.selectedSupportingImages?.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {propertyState.selectedSupportingImages.length} supporting
                              </Badge>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="mt-2 p-4 bg-muted/30 rounded-lg space-y-4">
                        {!hasImages ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No images available for this property
                          </p>
                        ) : (
                          <>
                            {/* Hero Image Selection */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Hero Image</Label>
                              <p className="text-xs text-muted-foreground">
                                Select the main image for this property's post
                              </p>
                              <div className="grid grid-cols-4 gap-2">
                                {allImages.map((img, idx) => {
                                  const isSelected = (propertyState?.selectedHeroImage || property.heroImage) === img;
                                  return (
                                    <button
                                      key={`hero-${img}-${idx}`}
                                      onClick={() => handleHeroImageChange(property.id, img)}
                                      className={cn(
                                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                                        isSelected
                                          ? "border-purple-500 ring-2 ring-purple-500/20"
                                          : "border-transparent hover:border-muted-foreground/50"
                                      )}
                                    >
                                      <img
                                        src={img}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                      {isSelected && (
                                        <div className="absolute top-1 right-1 bg-purple-600 text-white rounded-full p-0.5">
                                          <Check className="h-3 w-3" />
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Supporting Images Selection */}
                            {templateNeedsSupportingImages && (
                              <SupportingImagePicker
                                property={property}
                                selectedImages={propertyState?.selectedSupportingImages || []}
                                onSelectionChange={(images) => handleSupportingImagesChange(property.id, images)}
                                maxImages={3}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Skip Existing Toggle */}
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
        <Checkbox
          id="skip-existing"
          checked={state.skipExistingImages}
          onCheckedChange={(checked) => updateState({ skipExistingImages: !!checked })}
        />
        <div>
          <Label htmlFor="skip-existing" className="cursor-pointer font-medium">
            Skip properties that already have images
          </Label>
          <p className="text-xs text-muted-foreground">
            {state.skipExistingImages
              ? `Will generate for ${withoutImage} properties`
              : `Will generate for all ${selectedProperties.length} properties (overwrite existing)`}
          </p>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerateAll}
        disabled={!state.selectedTemplateId || isGenerating || needsGeneration === 0}
        className="w-full gap-2"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Images... ({Math.round(generationProgress)}%)
          </>
        ) : (
          <>
            <Image className="h-4 w-4" />
            Generate {needsGeneration} Images
          </>
        )}
      </Button>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="space-y-2">
          <Progress value={generationProgress} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">
            {currentGeneratingId
              ? `Generating image for ${properties.find((p) => p.id === currentGeneratingId)?.address}...`
              : 'Preparing...'}
          </p>
        </div>
      )}

      {/* Preview Grid */}
      {generatedCount > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Generated Preview</Label>
            <Badge variant="secondary">{generatedCount} generated</Badge>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {selectedProperties.map((property) => {
                const propertyState = state.propertyStates[property.id];
                const imageUrl = propertyState?.generatedImageUrl || property.heroImage;
                const status = state.imageGenerationStatus[property.id];

                return (
                  <div
                    key={property.id}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}

                    {/* Status Overlay */}
                    {status === 'generating' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      </div>
                    )}
                    {status === 'complete' && (
                      <div className="absolute top-1 right-1">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                    {status === 'failed' && (
                      <div className="absolute top-1 right-1">
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <AlertCircle className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
