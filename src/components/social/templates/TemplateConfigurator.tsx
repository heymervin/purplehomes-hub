import React, { useMemo } from 'react';
import { ChevronLeft, Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TemplateFieldInput } from './TemplateFieldInput';
import { AutoFilledField } from './AutoFilledField';
import { TemplatePreview } from './TemplatePreview';
import {
  resolveAllFields,
  areAllFieldsValid,
  getValidationErrors,
  preparePropertyForTemplate,
} from '@/lib/templates/fieldMapper';
import type { Property } from '@/types';
import type { TemplateProfile } from '@/lib/templates/types';

interface TemplateConfiguratorProps {
  template: TemplateProfile;
  property: Property | null;
  userInputs: Record<string, string>;
  onUserInputChange: (field: string, value: string) => void;
  onBack: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function TemplateConfigurator({
  template,
  property,
  userInputs,
  onUserInputChange,
  onBack,
  onGenerate,
  isGenerating,
}: TemplateConfiguratorProps) {
  // Prepare property with computed fields
  const preparedProperty = property ? preparePropertyForTemplate(property) : null;

  // Resolve all field values
  const resolvedFields = useMemo(() => {
    return resolveAllFields(template, preparedProperty, userInputs);
  }, [template, preparedProperty, userInputs]);

  // Validation
  const isValid = areAllFieldsValid(resolvedFields);
  const errors = getValidationErrors(resolvedFields);

  // Separate auto-filled and user-input fields
  const autoFilledFields = Object.entries(template.fields).filter(
    ([, config]) => config.source !== 'user-input'
  );
  const userInputFieldEntries = Object.entries(template.fields).filter(
    ([, config]) => config.source === 'user-input'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{template.icon}</span>
          <div>
            <h2 className="text-lg font-semibold">{template.name}</h2>
            <p className="text-sm text-muted-foreground">{template.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-6">
          {/* Auto-filled Section */}
          {autoFilledFields.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-green-500" />
                  <h3 className="font-medium">Auto-filled from Property</h3>
                  <Badge variant="secondary" className="text-xs">
                    {autoFilledFields.length} fields
                  </Badge>
                </div>

                <div className="space-y-3">
                  {autoFilledFields.map(([fieldKey, fieldConfig]) => {
                    const resolved = resolvedFields.get(fieldKey);
                    return (
                      <AutoFilledField
                        key={fieldKey}
                        fieldKey={fieldKey}
                        fieldConfig={fieldConfig}
                        resolvedValue={resolved}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Input Section */}
          {userInputFieldEntries.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">✏️</span>
                  <h3 className="font-medium">Your Input</h3>
                  <Badge variant="secondary" className="text-xs">
                    {userInputFieldEntries.length} field{userInputFieldEntries.length > 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="space-y-4">
                  {userInputFieldEntries.map(([fieldKey, fieldConfig]) => (
                    <TemplateFieldInput
                      key={fieldKey}
                      fieldKey={fieldKey}
                      fieldConfig={fieldConfig}
                      value={userInputs[fieldKey] || ''}
                      onChange={(value) => onUserInputChange(fieldKey, value)}
                      error={resolvedFields.get(fieldKey)?.error}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No inputs needed message */}
          {userInputFieldEntries.length === 0 && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Ready to Generate!
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      All fields are automatically filled from your property data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200 text-sm">
                    Please fix the following:
                  </p>
                  <ul className="text-sm text-red-600 dark:text-red-400 mt-1 list-disc list-inside">
                    {errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={onGenerate}
            disabled={!isValid || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Image
              </>
            )}
          </Button>
        </div>

        {/* Right: Preview */}
        <div className="lg:sticky lg:top-4">
          <TemplatePreview
            template={template}
            resolvedFields={resolvedFields}
          />
        </div>
      </div>
    </div>
  );
}
