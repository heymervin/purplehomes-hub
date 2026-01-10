import React from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import { TemplateCard } from './TemplateCard';
import {
  getAllTemplates,
} from '@/lib/templates/profiles';
import type { TemplateProfile } from '@/lib/templates/types';

interface TemplateSelectorProps {
  selectedTemplateId: string | null;
  onSelect: (template: TemplateProfile) => void;
  hasProperty: boolean;           // Is a property selected?
  propertyHasImages: boolean;     // Does the property have images?
}

export function TemplateSelector({
  selectedTemplateId,
  onSelect,
  hasProperty,
  propertyHasImages,
}: TemplateSelectorProps) {
  // Templates with AI field extraction support
  const aiSupportedTemplateIds = ['personal-value', 'open-house'];

  // Check if template is available
  const isTemplateAvailable = (template: TemplateProfile): boolean => {
    if (template.requiresProperty && !hasProperty) return false;
    if (template.requiresImages && !propertyHasImages) return false;
    return true;
  };

  // Get unavailability reason
  const getUnavailableReason = (template: TemplateProfile): string | null => {
    if (template.requiresProperty && !hasProperty) {
      return 'Select a property first';
    }
    if (template.requiresImages && !propertyHasImages) {
      return 'Property needs images';
    }
    return null;
  };

  // Split templates into AI-supported and manual
  const allTemplates = getAllTemplates();
  const aiSupportedTemplates = allTemplates.filter(t => aiSupportedTemplateIds.includes(t.id));
  const manualTemplates = allTemplates.filter(t => !aiSupportedTemplateIds.includes(t.id));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h2 className="text-lg font-semibold">Choose a Template</h2>
      </div>

      {/* AI-Supported Templates */}
      {aiSupportedTemplates.length > 0 && (
        <div className="space-y-4">
          {/* AI Section Header */}
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-purple-500" />
            <div>
              <h3 className="font-medium text-sm">AI-Powered Templates</h3>
              <p className="text-xs text-muted-foreground">
                Fields auto-filled from your caption and context
              </p>
            </div>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {aiSupportedTemplates.map((template) => {
              const isSelected = selectedTemplateId === template.id;
              const isAvailable = isTemplateAvailable(template);
              const unavailableReason = getUnavailableReason(template);

              return (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={isSelected}
                  isAvailable={isAvailable}
                  unavailableReason={unavailableReason}
                  onSelect={() => isAvailable && onSelect(template)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Separator */}
      {aiSupportedTemplates.length > 0 && manualTemplates.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Other Templates
            </span>
          </div>
        </div>
      )}

      {/* Manual Templates */}
      {manualTemplates.length > 0 && (
        <div className="space-y-4">
          {/* Template Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {manualTemplates.map((template) => {
              const isSelected = selectedTemplateId === template.id;
              const isAvailable = isTemplateAvailable(template);
              const unavailableReason = getUnavailableReason(template);

              return (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={isSelected}
                  isAvailable={isAvailable}
                  unavailableReason={unavailableReason}
                  onSelect={() => isAvailable && onSelect(template)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
