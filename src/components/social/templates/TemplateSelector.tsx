import React from 'react';
import { Sparkles } from 'lucide-react';
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
  // Templates with AI field extraction support (shown first)
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

  // Sort templates: AI-supported first, then others
  const allTemplates = getAllTemplates();
  const sortedTemplates = [
    ...allTemplates.filter(t => aiSupportedTemplateIds.includes(t.id)),
    ...allTemplates.filter(t => !aiSupportedTemplateIds.includes(t.id)),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h2 className="text-lg font-semibold">Branded Image Templates</h2>
      </div>

      {/* All Templates in One Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedTemplates.map((template) => {
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
  );
}
