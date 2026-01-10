import React from 'react';
import { Sparkles } from 'lucide-react';
import { TemplateCard } from './TemplateCard';
import {
  getAllTemplates,
  getTemplatesByCategory,
  TEMPLATE_CATEGORIES,
} from '@/lib/templates/profiles';
import type { TemplateProfile, TemplateCategory } from '@/lib/templates/types';

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
  const categories: TemplateCategory[] = ['property', 'brand', 'testimonial'];

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h2 className="text-lg font-semibold">Choose a Template</h2>
      </div>

      {/* Categories */}
      {categories.map((category) => {
        const categoryConfig = TEMPLATE_CATEGORIES[category];
        const templates = getTemplatesByCategory(category);

        if (templates.length === 0) return null;

        return (
          <div key={category} className="space-y-4">
            {/* Category Header */}
            <div className="flex items-center gap-2">
              <span className="text-xl">{categoryConfig.icon}</span>
              <div>
                <h3 className="font-medium">{categoryConfig.label}</h3>
                <p className="text-sm text-muted-foreground">
                  {categoryConfig.description}
                </p>
              </div>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {templates.map((template) => {
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
      })}
    </div>
  );
}
