import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ChevronDown, Check, Sparkles, Building2, Image as ImageIcon, Upload, X, ArrowLeft, Eye, Rocket, RefreshCw, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperties, useSocialAccounts, useCreateSocialPost } from '@/services/ghlApi';
import { getTemplateById } from '@/lib/templates/profiles';
import { buildImejisPayload, resolveAllFields, preparePropertyForTemplate } from '@/lib/templates/fieldMapper';
import { renderImejisTemplate } from '@/services/imejis/api';
import { useCaptionGenerate } from '../create-wizard/hooks/useCaptionGenerate';
import { POST_INTENTS, TONE_PRESETS, type PostIntent, type CaptionTone, type Platform } from '../create-wizard/types';
import type { Property } from '@/types';
import { toast } from 'sonner';

// Template options for dropdown
const TEMPLATE_OPTIONS = [
  { id: 'just-listed', label: 'Just Listed', icon: '🏷️' },
  { id: 'just-sold', label: 'Just Sold', icon: '🎉' },
  { id: 'open-house', label: 'Open House', icon: '🚪' },
  { id: 'personal-value', label: 'Value Tips', icon: '💡' },
  { id: 'success-story', label: 'Success Story', icon: '⭐' },
  { id: 'custom', label: 'Custom Image', icon: '📷' },
  { id: 'none', label: 'No Image', icon: '📝' },
];

// Map intents to templates
const INTENT_TO_TEMPLATE: Record<string, string> = {
  'just-listed': 'just-listed',
  'sold': 'just-sold',
  'open-house': 'open-house',
  'personal-value': 'personal-value',
  'success-story': 'success-story',
};

type FormStep = 'form' | 'preview';

interface QuickPostFormState {
  selectedProperty: Property | null;
  scheduleTime: string; // "now", "tomorrow 9am", etc.
  intent: PostIntent;
  tone: CaptionTone;
  templateId: string | null;
  templateUserInputs: Record<string, string>;
  context: string;
  customImage: File | null;
  customImagePreview: string | null;
  // Generated content
  generatedCaption: string;
  generatedImageUrl: string | null;
  generatedImageBlob: Blob | null;
  // Selected accounts for publishing
  selectedAccounts: string[];
}

const INITIAL_STATE: QuickPostFormState = {
  selectedProperty: null,
  scheduleTime: 'now',
  intent: 'just-listed',
  tone: 'professional',
  templateId: null,
  templateUserInputs: {},
  context: '',
  customImage: null,
  customImagePreview: null,
  generatedCaption: '',
  generatedImageUrl: null,
  generatedImageBlob: null,
  selectedAccounts: [],
};

export function QuickPostForm() {
  const [state, setState] = useState<QuickPostFormState>(INITIAL_STATE);
  const [step, setStep] = useState<FormStep>('form');
  const [propertySearchOpen, setPropertySearchOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const { data: propertiesData } = useProperties();
  const properties = propertiesData?.properties || [];

  const { data: accountsData } = useSocialAccounts();
  const connectedAccounts = accountsData?.accounts || [];

  const { generateCaption } = useCaptionGenerate();
  const createPost = useCreateSocialPost();

  // Get selected template profile
  const selectedTemplate = state.templateId && state.templateId !== 'custom' && state.templateId !== 'none'
    ? getTemplateById(state.templateId)
    : null;

  // Get user input fields for selected template
  const userInputFields = useMemo(() => {
    if (!selectedTemplate) return [];
    return Object.entries(selectedTemplate.fields)
      .filter(([, config]) => config.source === 'user-input')
      .map(([key, config]) => ({ key, config }));
  }, [selectedTemplate]);

  // Auto-select template based on intent
  useEffect(() => {
    const mappedTemplate = INTENT_TO_TEMPLATE[state.intent];
    if (mappedTemplate && !state.templateId) {
      setState(prev => ({ ...prev, templateId: mappedTemplate }));
    }
  }, [state.intent]);

  // Auto-fill context when property is selected
  useEffect(() => {
    if (state.selectedProperty && !state.context) {
      const prop = state.selectedProperty;
      const parts = [];
      if (prop.beds) parts.push(`${prop.beds} bed`);
      if (prop.baths) parts.push(`${prop.baths} bath`);
      if (prop.sqft) parts.push(`${prop.sqft.toLocaleString()} sqft`);
      if (prop.price) parts.push(`$${prop.price.toLocaleString()}`);

      const description = prop.description || '';
      const autoContext = parts.length > 0
        ? `${parts.join(' | ')}. ${description}`.trim()
        : description;

      setState(prev => ({ ...prev, context: autoContext }));
    }
  }, [state.selectedProperty]);

  const handlePropertySelect = (property: Property) => {
    setState(prev => ({ ...prev, selectedProperty: property }));
    setPropertySearchOpen(false);
  };

  const handleIntentChange = (intent: PostIntent) => {
    const mappedTemplate = INTENT_TO_TEMPLATE[intent];
    setState(prev => ({
      ...prev,
      intent,
      templateId: mappedTemplate || prev.templateId,
      templateUserInputs: {}, // Reset inputs when intent changes
    }));
  };

  const handleTemplateChange = (templateId: string) => {
    setState(prev => ({
      ...prev,
      templateId,
      templateUserInputs: {}, // Reset inputs when template changes
    }));
  };

  const handleTemplateInputChange = (fieldKey: string, value: string) => {
    setState(prev => ({
      ...prev,
      templateUserInputs: { ...prev.templateUserInputs, [fieldKey]: value },
    }));
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setState(prev => ({
        ...prev,
        customImage: file,
        customImagePreview: preview,
        templateId: 'custom',
      }));
    }
  };

  const handleRemoveCustomImage = () => {
    if (state.customImagePreview) {
      URL.revokeObjectURL(state.customImagePreview);
    }
    setState(prev => ({
      ...prev,
      customImage: null,
      customImagePreview: null,
      templateId: null,
    }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      // 1. Generate caption
      const captionResult = await generateCaption({
        property: state.selectedProperty,
        context: state.context,
        tone: state.tone,
        platform: 'all',
        postIntent: state.intent,
      });

      if (captionResult.success) {
        setState(prev => ({ ...prev, generatedCaption: captionResult.caption }));
      }

      // 2. Generate image if template selected
      if (selectedTemplate && state.templateId !== 'custom' && state.templateId !== 'none') {
        const preparedProperty = state.selectedProperty
          ? preparePropertyForTemplate(state.selectedProperty)
          : null;
        const resolvedFields = resolveAllFields(selectedTemplate, preparedProperty, state.templateUserInputs);
        const payload = buildImejisPayload(selectedTemplate, resolvedFields);

        const imageResult = await renderImejisTemplate(payload);

        if (imageResult.success && imageResult.imageUrl) {
          setState(prev => ({
            ...prev,
            generatedImageUrl: imageResult.imageUrl!,
            generatedImageBlob: imageResult.imageBlob || null,
          }));
        }
      }

      // Auto-select first account if none selected
      if (state.selectedAccounts.length === 0 && connectedAccounts.length > 0) {
        setState(prev => ({
          ...prev,
          selectedAccounts: [connectedAccounts[0].id],
        }));
      }

      // Move to preview step
      setStep('preview');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (state.selectedAccounts.length === 0) {
      toast.error('Please select at least one account');
      return;
    }

    setIsPublishing(true);

    try {
      const imageUrl = state.generatedImageUrl || state.customImagePreview;

      await createPost.mutateAsync({
        accountIds: state.selectedAccounts,
        summary: state.generatedCaption,
        media: imageUrl ? [{ url: imageUrl, type: 'image/png' }] : undefined,
        status: state.scheduleTime === 'now' ? 'published' : 'scheduled',
      });

      toast.success('Post published successfully!');

      // Reset form
      setState(INITIAL_STATE);
      setStep('form');
    } catch (error) {
      console.error('Publish error:', error);
      toast.error('Failed to publish post');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleBackToForm = () => {
    setStep('form');
  };

  const toggleAccount = (accountId: string) => {
    setState(prev => ({
      ...prev,
      selectedAccounts: prev.selectedAccounts.includes(accountId)
        ? prev.selectedAccounts.filter(id => id !== accountId)
        : [...prev.selectedAccounts, accountId],
    }));
  };

  // Check if form is valid
  const isValid = useMemo(() => {
    // Must have intent and tone
    if (!state.intent || !state.tone) return false;

    // Must have context
    if (!state.context.trim()) return false;

    // If template requires property, must have property
    if (selectedTemplate?.requiresProperty && !state.selectedProperty) return false;

    // Check required template fields
    if (selectedTemplate) {
      for (const { key, config } of userInputFields) {
        if (config.inputConfig?.required && !state.templateUserInputs[key]?.trim()) {
          return false;
        }
      }
    }

    return true;
  }, [state, selectedTemplate, userInputFields]);

  // Render template-specific fields inline in the sentence
  const renderTemplateFields = () => {
    if (!selectedTemplate || userInputFields.length === 0) return null;

    return (
      <div className="mt-4 p-4 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{selectedTemplate.icon}</span>
          <span className="font-medium text-sm">{selectedTemplate.name} Fields</span>
          <Badge variant="secondary" className="text-xs">
            {userInputFields.length} field{userInputFields.length > 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="space-y-3">
          {userInputFields.map(({ key, config }) => (
            <div key={key} className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                {config.inputConfig?.label || key}
                {config.inputConfig?.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {config.dataType === 'textarea' ? (
                <Textarea
                  placeholder={config.inputConfig?.placeholder}
                  value={state.templateUserInputs[key] || ''}
                  onChange={(e) => handleTemplateInputChange(key, e.target.value)}
                  rows={config.inputConfig?.rows || 2}
                  maxLength={config.inputConfig?.maxLength}
                  className="text-sm"
                />
              ) : config.dataType === 'datetime' ? (
                <Input
                  type="text"
                  placeholder={config.inputConfig?.placeholder || 'Saturday, Jan 15 • 2-4 PM'}
                  value={state.templateUserInputs[key] || ''}
                  onChange={(e) => handleTemplateInputChange(key, e.target.value)}
                  className="text-sm"
                />
              ) : (
                <Input
                  type="text"
                  placeholder={config.inputConfig?.placeholder}
                  value={state.templateUserInputs[key] || ''}
                  onChange={(e) => handleTemplateInputChange(key, e.target.value)}
                  maxLength={config.inputConfig?.maxLength}
                  className="text-sm"
                />
              )}
              {config.inputConfig?.helpText && (
                <p className="text-xs text-muted-foreground">{config.inputConfig.helpText}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Preview Step UI
  if (step === 'preview') {
    const imageUrl = state.generatedImageUrl || state.customImagePreview;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBackToForm} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Edit
          </Button>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-500" />
              Preview Your Post
            </h2>
            <p className="text-sm text-muted-foreground">Review and publish</p>
          </div>
        </div>

        {/* Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Image + Caption */}
          <div className="space-y-4">
            {/* Image Preview */}
            {imageUrl && (
              <Card>
                <CardContent className="p-4">
                  <img
                    src={imageUrl}
                    alt="Post preview"
                    className="w-full rounded-lg border"
                  />
                </CardContent>
              </Card>
            )}

            {/* Caption Preview/Edit */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium text-sm flex items-center gap-2">
                    <Edit2 className="h-4 w-4" />
                    Caption
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="text-xs"
                  >
                    <RefreshCw className={cn("h-3 w-3 mr-1", isGenerating && "animate-spin")} />
                    Regenerate
                  </Button>
                </div>
                <Textarea
                  value={state.generatedCaption}
                  onChange={(e) => setState(prev => ({ ...prev, generatedCaption: e.target.value }))}
                  rows={8}
                  className="resize-none text-sm"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right: Account Selection + Publish */}
          <div className="space-y-4">
            {/* Account Selection */}
            <Card>
              <CardContent className="p-4">
                <label className="font-medium text-sm mb-3 block">Post to</label>
                {connectedAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No social accounts connected. Connect accounts in Settings.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {connectedAccounts.map((account) => (
                      <div
                        key={account.id}
                        onClick={() => toggleAccount(account.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          state.selectedAccounts.includes(account.id)
                            ? "border-purple-600 bg-purple-50 dark:bg-purple-950/20"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center",
                          state.selectedAccounts.includes(account.id)
                            ? "border-purple-600 bg-purple-600"
                            : "border-muted-foreground/30"
                        )}>
                          {state.selectedAccounts.includes(account.id) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <span className="font-medium flex-1">{account.accountName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {account.platform}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">Summary</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    {POST_INTENTS.find(i => i.id === state.intent)?.label} post
                  </li>
                  {state.selectedProperty && (
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      {state.selectedProperty.address}
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <span className={imageUrl ? "text-green-500" : "text-amber-500"}>
                      {imageUrl ? '✓' : '○'}
                    </span>
                    Image: {imageUrl ? 'Ready' : 'None'}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={state.selectedAccounts.length > 0 ? "text-green-500" : "text-red-500"}>
                      {state.selectedAccounts.length > 0 ? '✓' : '✗'}
                    </span>
                    {state.selectedAccounts.length} account(s) selected
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Publish Button */}
            <Button
              size="lg"
              className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
              disabled={state.selectedAccounts.length === 0 || isPublishing}
              onClick={handlePublish}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  {state.scheduleTime === 'now' ? 'Publish Now' : `Schedule for ${state.scheduleTime}`}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Form Step UI
  return (
    <div className="space-y-6">
      {/* Main Sentence Form */}
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Row 1: Property + Schedule */}
            <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
              <span className="text-muted-foreground">I want to post about</span>

              {/* Property Selector */}
              <Popover open={propertySearchOpen} onOpenChange={setPropertySearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "justify-between min-w-[200px] h-auto py-1.5 px-3",
                      state.selectedProperty
                        ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30"
                        : "border-dashed"
                    )}
                  >
                    {state.selectedProperty ? (
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-purple-600" />
                        <span className="truncate max-w-[180px]">
                          {state.selectedProperty.address}, {state.selectedProperty.city}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select property...</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search properties..." />
                    <CommandList>
                      <CommandEmpty>No properties found.</CommandEmpty>
                      <CommandGroup>
                        {properties.map((property) => (
                          <CommandItem
                            key={property.id}
                            value={`${property.address} ${property.city}`}
                            onSelect={() => handlePropertySelect(property)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                state.selectedProperty?.id === property.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{property.address}</p>
                              <p className="text-xs text-muted-foreground">
                                {property.city}, {property.state} • {property.beds}bd/{property.baths}ba
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground">at</span>

              {/* Schedule Time */}
              <Input
                type="text"
                placeholder="now"
                value={state.scheduleTime}
                onChange={(e) => setState(prev => ({ ...prev, scheduleTime: e.target.value }))}
                className="w-[150px] h-auto py-1.5 px-3 text-center"
              />
            </div>

            {/* Row 2: Intent + Tone */}
            <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
              <span className="text-muted-foreground">announcing</span>

              {/* Intent Selector */}
              <Select value={state.intent} onValueChange={(v) => handleIntentChange(v as PostIntent)}>
                <SelectTrigger className="w-[180px] h-auto py-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_INTENTS.map((intent) => (
                    <SelectItem key={intent.id} value={intent.id}>
                      <span className="flex items-center gap-2">
                        <span>{intent.icon}</span>
                        <span>{intent.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-muted-foreground">in a</span>

              {/* Tone Selector */}
              <Select value={state.tone} onValueChange={(v) => setState(prev => ({ ...prev, tone: v as CaptionTone }))}>
                <SelectTrigger className="w-[150px] h-auto py-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_PRESETS.map((tone) => (
                    <SelectItem key={tone.id} value={tone.id}>
                      <span className="flex items-center gap-2">
                        <span>{tone.icon}</span>
                        <span>{tone.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-muted-foreground">tone.</span>
            </div>

            {/* Row 3: Template Selection */}
            <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
              <span className="text-muted-foreground">Using the</span>

              {/* Template Selector */}
              <Select
                value={state.templateId || ''}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger className="w-[180px] h-auto py-1.5">
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <span className="flex items-center gap-2">
                        <span>{template.icon}</span>
                        <span>{template.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-muted-foreground">template.</span>
            </div>

            {/* Template-specific fields (inline expansion) */}
            {renderTemplateFields()}

            {/* Custom Image Upload */}
            {state.templateId === 'custom' && (
              <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="h-4 w-4" />
                  <span className="font-medium text-sm">Custom Image</span>
                </div>
                {state.customImagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={state.customImagePreview}
                      alt="Custom upload"
                      className="h-32 object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleRemoveCustomImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer hover:border-purple-400 transition-colors">
                    <div className="text-center">
                      <ImageIcon className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCustomImageUpload}
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Context Box */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <label className="font-medium text-sm">
              Property Highlights & Details
              <span className="text-red-500 ml-1">*</span>
            </label>
          </div>
          <Textarea
            placeholder="Describe what makes this property special... (This feeds the AI caption and template fields)"
            value={state.context}
            onChange={(e) => setState(prev => ({ ...prev, context: e.target.value }))}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            This information is used to generate your caption and auto-fill template fields.
          </p>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={!isValid || isGenerating}
          onClick={handleGenerate}
          className="gap-2 bg-purple-600 hover:bg-purple-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate & Preview
            </>
          )}
        </Button>
      </div>

      {/* Summary Preview */}
      {state.selectedProperty && state.intent && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">Preview:</p>
            <p className="text-sm">
              <span className="font-medium">{POST_INTENTS.find(i => i.id === state.intent)?.icon}</span>{' '}
              <span className="font-medium">{POST_INTENTS.find(i => i.id === state.intent)?.label}</span>{' '}
              post for{' '}
              <span className="font-medium">{state.selectedProperty.address}, {state.selectedProperty.city}</span>
              {state.templateId && state.templateId !== 'none' && (
                <>
                  {' '}using{' '}
                  <span className="font-medium">
                    {TEMPLATE_OPTIONS.find(t => t.id === state.templateId)?.icon}{' '}
                    {TEMPLATE_OPTIONS.find(t => t.id === state.templateId)?.label}
                  </span>{' '}
                  template
                </>
              )}
              {state.scheduleTime !== 'now' && (
                <>
                  {' '}scheduled for{' '}
                  <span className="font-medium">{state.scheduleTime}</span>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
