import React, { useState, useEffect, useRef } from 'react';
import { Info, Upload, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TemplateSelector, TemplateConfigurator } from '@/components/social/templates';
import { getTemplateById } from '@/lib/templates/profiles';
import { extractTemplateFieldsFromCaption } from '@/services/openai/captionExtractor';
import type { TemplateProfile } from '@/lib/templates/types';
import type { WizardState } from '../types';

interface ImageStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

export default function ImageStep({ state, updateState }: ImageStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateProfile | null>(null);
  const [userInputs, setUserInputs] = useState<Record<string, string>>(state.templateUserInputs || {});
  const [isExtractingFields, setIsExtractingFields] = useState(false);

  const isPropertyPost = state.postType === 'property' && state.selectedProperty;

  // Load selected template on mount if one was previously selected
  useEffect(() => {
    if (state.selectedTemplateId && !selectedTemplate) {
      const template = getTemplateById(state.selectedTemplateId);
      if (template) {
        setSelectedTemplate(template);
      }
    }
  }, [state.selectedTemplateId, selectedTemplate]);

  // Handle template selection with AI field extraction
  const handleSelectTemplate = async (template: TemplateProfile) => {
    setSelectedTemplate(template);
    setIsExtractingFields(true);

    // Get the caption (use Facebook caption as primary)
    const caption = state.captions.facebook || state.captions.instagram || state.captions.linkedin;

    // Try to extract fields from caption using OpenAI
    let extractedFields: Record<string, string> = {};
    if (caption && caption.length > 0) {
      const result = await extractTemplateFieldsFromCaption(
        template.id,
        caption,
        state.postContext // Pass the context from Stage 2
      );
      if (result.success && result.data) {
        extractedFields = result.data;
      }
    }

    setUserInputs(extractedFields);
    setIsExtractingFields(false);

    updateState({
      selectedTemplateId: template.id,
      templateUserInputs: extractedFields,
      generatedImageUrl: null,
      generatedImageBlob: null,
    });
  };

  // Handle user input change - save to state for later use during publish
  const handleUserInputChange = (field: string, value: string) => {
    setUserInputs(prev => ({ ...prev, [field]: value }));
    // Save to wizard state so it's available when publishing
    updateState({
      templateUserInputs: { ...userInputs, [field]: value },
    });
  };

  // Handle back to template selector
  const handleBackToSelector = () => {
    setSelectedTemplate(null);
    updateState({
      selectedTemplateId: null,
    });
  };

  // Handle custom image upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      updateState({
        customImageFile: file,
        customImagePreview: previewUrl,
        // Clear template selection when uploading custom
        selectedTemplateId: null,
        generatedImageUrl: null,
        generatedImageBlob: null,
      });
      setSelectedTemplate(null);
    }
  };

  // Clear custom image
  const handleClearCustomImage = () => {
    if (state.customImagePreview) {
      URL.revokeObjectURL(state.customImagePreview);
    }
    updateState({
      customImageFile: null,
      customImagePreview: null,
    });
  };

  // Show configurator if template selected
  if (selectedTemplate) {
    return (
      <TooltipProvider>
        {isExtractingFields ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Sparkles className="h-12 w-12 text-purple-500 animate-pulse" />
            <p className="text-lg font-medium">Extracting fields from your caption...</p>
            <p className="text-sm text-muted-foreground">Using AI to pre-fill template fields</p>
          </div>
        ) : (
          <TemplateConfigurator
            template={selectedTemplate}
            property={state.selectedProperty}
            userInputs={userInputs}
            onUserInputChange={handleUserInputChange}
            onBack={handleBackToSelector}
            onGenerate={() => {}} // No-op: generation happens at publish
            isGenerating={false}
            generatedImageUrl={null} // Don't show preview in Stage 3
          />
        )}
      </TooltipProvider>
    );
  }

  // Show template selector
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">
            {isPropertyPost ? 'Create Branded Image' : 'Add Image'}
          </h2>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              {isPropertyPost
                ? 'Create a professional branded image using our templates'
                : 'Upload an image for your post'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Property Post: Show Template Selector */}
        {isPropertyPost && (
          <>
            <TemplateSelector
              selectedTemplateId={null}
              onSelect={handleSelectTemplate}
              hasProperty={!!state.selectedProperty}
              propertyHasImages={!!(state.selectedProperty?.heroImage || state.selectedProperty?.images?.length)}
            />

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
          </>
        )}

        {/* Upload Custom Image */}
        <div>
          <Label className="mb-2 block">
            {isPropertyPost ? 'Upload custom image instead' : 'Upload Image'}
          </Label>

          {state.customImagePreview ? (
            <div className="relative">
              <img
                src={state.customImagePreview}
                alt="Custom upload"
                className="w-full h-48 object-cover rounded-lg border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleClearCustomImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-muted/50 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG up to 10MB
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Skip option for text-only */}
        {state.postType === 'text-only' && (
          <p className="text-sm text-muted-foreground">
            You can skip this step for a text-only post.
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
