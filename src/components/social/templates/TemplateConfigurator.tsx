import React, { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, Loader2, Sparkles, Check, AlertCircle, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TemplateFieldInput } from './TemplateFieldInput';
import { AutoFilledField } from './AutoFilledField';
import {
  resolveAllFields,
  areAllFieldsValid,
  getValidationErrors,
  preparePropertyForTemplate,
  buildImejisPayload,
} from '@/lib/templates/fieldMapper';
import { renderImejisTemplate } from '@/services/imejis/api';
import { extractTemplateFieldsFromCaption } from '@/services/openai/captionExtractor';
import type { Property } from '@/types';
import type { TemplateProfile } from '@/lib/templates/types';
import { cn } from '@/lib/utils';

interface TemplateConfiguratorProps {
  template: TemplateProfile;
  property: Property | null;
  userInputs: Record<string, string>;
  onUserInputChange: (field: string, value: string) => void;
  onBack: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generatedImageUrl?: string | null;
  showLivePreview?: boolean; // New prop for Stage 3 preview
  caption?: string; // Current caption for re-extraction
  postContext?: string; // Context for re-extraction
  onReExtract?: (fields: Record<string, string>) => void; // Callback for re-extraction
}

export function TemplateConfigurator({
  template,
  property,
  userInputs,
  onUserInputChange,
  onBack,
  onGenerate,
  isGenerating,
  generatedImageUrl,
  showLivePreview = false,
  caption,
  postContext,
  onReExtract,
}: TemplateConfiguratorProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isReExtracting, setIsReExtracting] = useState(false);

  // Prepare property with computed fields
  const preparedProperty = property ? preparePropertyForTemplate(property) : null;

  // Resolve all field values
  const resolvedFields = useMemo(() => {
    return resolveAllFields(template, preparedProperty, userInputs);
  }, [template, preparedProperty, userInputs]);

  // Validation
  const isValid = areAllFieldsValid(resolvedFields);
  const errors = getValidationErrors(resolvedFields);

  // Generate preview on demand (not automatically)
  const handleGeneratePreview = async () => {
    if (!isValid) return;

    setIsLoadingPreview(true);
    try {
      const payload = buildImejisPayload(template, resolvedFields);
      const result = await renderImejisTemplate(payload);

      if (result.success && result.imageUrl) {
        // Clean up old preview URL
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(result.imageUrl);
      }
    } catch (error) {
      console.error('Preview generation error:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Auto-generate preview once when all fields are valid (initial load only)
  const [hasGeneratedInitialPreview, setHasGeneratedInitialPreview] = useState(false);
  useEffect(() => {
    if (showLivePreview && isValid && !hasGeneratedInitialPreview && !previewUrl) {
      setHasGeneratedInitialPreview(true);
      handleGeneratePreview();
    }
  }, [showLivePreview, isValid, hasGeneratedInitialPreview, previewUrl]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Re-extract fields from caption
  const handleReExtract = async () => {
    if (!caption || !onReExtract) return;

    setIsReExtracting(true);
    try {
      const result = await extractTemplateFieldsFromCaption(
        template.id,
        caption,
        postContext
      );

      if (result.success && result.data) {
        onReExtract(result.data);
      }
    } catch (error) {
      console.error('Re-extraction error:', error);
    } finally {
      setIsReExtracting(false);
    }
  };

  // Separate auto-filled and user-input fields
  const autoFilledFields = Object.entries(template.fields).filter(
    ([, config]) => config.source !== 'user-input'
  );
  const userInputFieldEntries = Object.entries(template.fields).filter(
    ([, config]) => config.source === 'user-input'
  );

  // Group user input fields by prefixes (for visual grouping)
  const groupedUserInputs = useMemo(() => {
    const groups: Record<string, Array<[string, any]>> = {};

    userInputFieldEntries.forEach(entry => {
      const [fieldKey] = entry;

      // Match patterns like "tip1Image", "tip1Title", "tip1Body"
      const match = fieldKey.match(/^(tip\d+)/);
      if (match) {
        const groupKey = match[1];
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(entry);
      } else {
        // Ungrouped fields
        if (!groups['_ungrouped']) groups['_ungrouped'] = [];
        groups['_ungrouped'].push(entry);
      }
    });

    return groups;
  }, [userInputFieldEntries]);

  const hasGroupedFields = Object.keys(groupedUserInputs).some(key => key !== '_ungrouped');

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
        <div className="space-y-6 order-2 lg:order-1">
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✏️</span>
                    <h3 className="font-medium">Your Input</h3>
                    <Badge variant="secondary" className="text-xs">
                      {userInputFieldEntries.length} field{userInputFieldEntries.length > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Re-extract button */}
                  {caption && onReExtract && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReExtract}
                      disabled={isReExtracting}
                      className="text-xs"
                    >
                      {isReExtracting ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Re-extract from Caption
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Ungrouped fields first */}
                  {groupedUserInputs['_ungrouped']?.map(([fieldKey, fieldConfig]) => (
                    <TemplateFieldInput
                      key={fieldKey}
                      fieldKey={fieldKey}
                      fieldConfig={fieldConfig}
                      value={userInputs[fieldKey] || ''}
                      onChange={(value) => onUserInputChange(fieldKey, value)}
                      error={resolvedFields.get(fieldKey)?.error}
                    />
                  ))}

                  {/* Grouped fields with visual separators */}
                  {hasGroupedFields && Object.entries(groupedUserInputs)
                    .filter(([key]) => key !== '_ungrouped')
                    .map(([groupKey, fields]) => {
                      const groupNumber = groupKey.replace('tip', '');
                      const hasErrors = fields.some(([fieldKey]) => resolvedFields.get(fieldKey)?.error);

                      return (
                        <div key={groupKey} className="space-y-3">
                          {/* Group header */}
                          <div className={cn(
                            "flex items-center gap-2 pt-3 border-t",
                            hasErrors && "border-red-200"
                          )}>
                            <h4 className="font-medium text-sm">
                              Tip {groupNumber}
                            </h4>
                            {hasErrors && (
                              <AlertCircle className="h-3 w-3 text-red-500" />
                            )}
                          </div>

                          {/* Group fields */}
                          <div className="space-y-3 pl-3">
                            {fields.map(([fieldKey, fieldConfig]) => (
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
                        </div>
                      );
                    })}
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
                    Please fix the following before continuing:
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

          {/* Ready message */}
          {isValid && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Template Configured!
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Your image will be generated when you publish the post.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Live Preview */}
        {showLivePreview && (
          <div className="space-y-4 order-1 lg:order-2">
            <Card className="sticky top-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-purple-500" />
                    <h3 className="font-medium">Preview</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePreview}
                    disabled={isLoadingPreview || !isValid}
                    className="text-xs"
                  >
                    {isLoadingPreview ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refresh
                      </>
                    )}
                  </Button>
                </div>

                {/* Preview Image */}
                {previewUrl ? (
                  <div className="relative aspect-square rounded-lg overflow-hidden border border-purple-200 bg-purple-50/50">
                    <img
                      src={previewUrl}
                      alt="Template preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
                    <div className="text-center p-4">
                      <Eye className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        {isValid ? 'Generating preview...' : 'Fill in all required fields to see preview'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Preview Info */}
                {previewUrl && (
                  <div className="mt-3 p-2 rounded bg-purple-50 dark:bg-purple-950/20 border border-purple-200">
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                      Click "Refresh" after editing fields to update preview.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
