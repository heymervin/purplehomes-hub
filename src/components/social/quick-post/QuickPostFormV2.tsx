/**
 * QuickPostForm V2 - Intent-Driven Social Hub
 *
 * Refactored to use 3 tabs (Property, Personal, Professional) with intent as the
 * source of truth for caption schema, allowed templates, and default tone.
 */

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
import {
  Loader2,
  ChevronDown,
  Check,
  Sparkles,
  Building2,
  Image as ImageIcon,
  Upload,
  X,
  ArrowLeft,
  Eye,
  Rocket,
  RefreshCw,
  Edit2,
  User,
  Briefcase,
  Calendar,
  Clock,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperties, useSocialAccounts, useCreateSocialPost } from '@/services/ghlApi';
import { getTemplateById } from '@/lib/templates/profiles';
import { buildImejisPayload, resolveAllFields, preparePropertyForTemplate } from '@/lib/templates/fieldMapper';
import { renderImejisTemplate } from '@/services/imejis/api';
import { useCaptionGenerate } from '../create-wizard/hooks/useCaptionGenerate';
import {
  getDateSuggestions,
  getTimeSuggestions,
  combineDateAndTime,
  formatScheduleDateTime,
  type DateSuggestion,
  type TimeSuggestion,
} from '@/lib/utils/dateTimeSuggestions';
import { getQRCodeLinks, type QRCodeLink } from '@/lib/utils/qrCodeLinks';
import type { Property } from '@/types';
import { toast } from 'sonner';

// Import new Social Hub catalog and rules
import {
  type SocialTabId,
  type IntentId,
  type ImageTemplateId,
  type ToneId,
  type IntentDefinition,
  TABS,
  TONES,
  getIntentsByTab,
  getIntent,
  getDefaultIntent,
  getAllowedTemplates,
  coerceTemplate,
  getDefaultTone,
  intentRequiresProperty,
  validateIntentFields,
} from '@/lib/socialHub';

// ============ FORM STATE ============
type FormStep = 'form' | 'preview';

interface QuickPostFormState {
  // Core selections
  tab: SocialTabId;
  intentId: IntentId;
  templateId: ImageTemplateId;
  toneId: ToneId;

  // Property (for property tab)
  selectedProperty: Property | null;

  // Intent context fields (dynamic based on intent)
  context: Record<string, string>;

  // Scheduling
  scheduleDate: string;
  scheduleTime: string;
  dateInput: string;
  timeInput: string;

  // Open House specific
  openHouseDate: string;
  openHouseStartTime: string;
  openHouseEndTime: string;
  openHouseDateInput: string;
  openHouseStartTimeInput: string;
  openHouseEndTimeInput: string;

  // Template user inputs (for Imejis templates)
  templateUserInputs: Record<string, string>;

  // Custom image
  customImage: File | null;
  customImagePreview: string | null;

  // Supporting images selection
  selectedSupportingImages: string[];

  // QR code URL
  qrCodeUrl: string;

  // Generated content
  generatedCaption: string;
  generatedImageUrl: string | null;
  generatedImageBlob: Blob | null;

  // Selected accounts for publishing
  selectedAccounts: string[];

  // Track if user manually changed tone
  toneManuallySet: boolean;
}

const getInitialState = (): QuickPostFormState => {
  const defaultTab: SocialTabId = 'property';
  const defaultIntent = getDefaultIntent(defaultTab);

  return {
    tab: defaultTab,
    intentId: defaultIntent.id,
    templateId: coerceTemplate(defaultIntent.id),
    toneId: getDefaultTone(defaultIntent.id),

    selectedProperty: null,
    context: {},

    scheduleDate: '',
    scheduleTime: '',
    dateInput: '',
    timeInput: '',

    openHouseDate: '',
    openHouseStartTime: '',
    openHouseEndTime: '',
    openHouseDateInput: '',
    openHouseStartTimeInput: '',
    openHouseEndTimeInput: '',

    templateUserInputs: {},
    customImage: null,
    customImagePreview: null,
    selectedSupportingImages: [],
    qrCodeUrl: '',

    generatedCaption: '',
    generatedImageUrl: null,
    generatedImageBlob: null,

    selectedAccounts: [],
    toneManuallySet: false,
  };
};

// ============ TAB ICONS ============
const TAB_ICONS: Record<SocialTabId, React.ReactNode> = {
  property: <Building2 className="h-4 w-4" />,
  personal: <User className="h-4 w-4" />,
  professional: <Briefcase className="h-4 w-4" />,
};

// ============ COMPONENT ============
export function QuickPostFormV2() {
  const [state, setState] = useState<QuickPostFormState>(getInitialState);
  const [step, setStep] = useState<FormStep>('form');
  const [propertySearchOpen, setPropertySearchOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Date/Time autocomplete state
  const [dateSuggestions, setDateSuggestions] = useState<DateSuggestion[]>([]);
  const [timeSuggestions, setTimeSuggestions] = useState<TimeSuggestion[]>([]);
  const [showDateSuggestions, setShowDateSuggestions] = useState(false);
  const [showTimeSuggestions, setShowTimeSuggestions] = useState(false);
  const dateDropdownRef = React.useRef<HTMLDivElement>(null);
  const timeDropdownRef = React.useRef<HTMLDivElement>(null);

  // Open House date/time autocomplete state
  const [openHouseDateSuggestions, setOpenHouseDateSuggestions] = useState<DateSuggestion[]>([]);
  const [openHouseStartTimeSuggestions, setOpenHouseStartTimeSuggestions] = useState<TimeSuggestion[]>([]);
  const [openHouseEndTimeSuggestions, setOpenHouseEndTimeSuggestions] = useState<TimeSuggestion[]>([]);
  const [showOpenHouseDateSuggestions, setShowOpenHouseDateSuggestions] = useState(false);
  const [showOpenHouseStartTimeSuggestions, setShowOpenHouseStartTimeSuggestions] = useState(false);
  const [showOpenHouseEndTimeSuggestions, setShowOpenHouseEndTimeSuggestions] = useState(false);
  const openHouseDateDropdownRef = React.useRef<HTMLDivElement>(null);
  const openHouseStartTimeDropdownRef = React.useRef<HTMLDivElement>(null);
  const openHouseEndTimeDropdownRef = React.useRef<HTMLDivElement>(null);

  // QR Code links from localStorage
  const [savedQRLinks, setSavedQRLinks] = useState<QRCodeLink[]>([]);

  // Load QR links on mount
  useEffect(() => {
    setSavedQRLinks(getQRCodeLinks());
  }, []);

  // Data hooks
  const { data: propertiesData } = useProperties('U4FANAMaB1gGddRaaD9x');
  const properties = propertiesData?.properties || [];

  const { data: accountsData } = useSocialAccounts();
  const connectedAccounts = accountsData?.accounts || [];

  const { generateCaption } = useCaptionGenerate();
  const createPost = useCreateSocialPost();

  // Get current intent definition
  const currentIntent = useMemo(() => getIntent(state.intentId), [state.intentId]);

  // Get intents for current tab
  const tabIntents = useMemo(() => getIntentsByTab(state.tab), [state.tab]);

  // Get allowed templates for current intent
  const allowedTemplates = useMemo(() => getAllowedTemplates(state.intentId), [state.intentId]);

  // Get selected template profile (for Imejis)
  const selectedTemplate = useMemo(() => {
    if (state.templateId === 'custom' || state.templateId === 'none') return null;
    // Map template IDs to profile IDs
    const templateToProfile: Record<string, string> = {
      'just-listed': 'just-listed',
      'just-sold': 'just-sold',
      'open-house': 'open-house',
      'value-tips': 'personal-value',
      'success-story': 'success-story',
    };
    const profileId = templateToProfile[state.templateId];
    return profileId ? getTemplateById(profileId) : null;
  }, [state.templateId]);

  // Get user input fields for selected template
  const userInputFields = useMemo(() => {
    if (!selectedTemplate) return [];
    return Object.entries(selectedTemplate.fields)
      .filter(([, config]) => config.source === 'user-input')
      .map(([key, config]) => ({ key, config }));
  }, [selectedTemplate]);

  // ============ EFFECTS ============

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setShowDateSuggestions(false);
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setShowTimeSuggestions(false);
      }
      if (openHouseDateDropdownRef.current && !openHouseDateDropdownRef.current.contains(event.target as Node)) {
        setShowOpenHouseDateSuggestions(false);
      }
      if (openHouseStartTimeDropdownRef.current && !openHouseStartTimeDropdownRef.current.contains(event.target as Node)) {
        setShowOpenHouseStartTimeSuggestions(false);
      }
      if (openHouseEndTimeDropdownRef.current && !openHouseEndTimeDropdownRef.current.contains(event.target as Node)) {
        setShowOpenHouseEndTimeSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-fill context when property is selected
  useEffect(() => {
    if (state.selectedProperty && Object.keys(state.context).length === 0) {
      const prop = state.selectedProperty;
      const parts = [];
      if (prop.beds) parts.push(`${prop.beds} bed`);
      if (prop.baths) parts.push(`${prop.baths} bath`);
      if (prop.sqft) parts.push(`${prop.sqft.toLocaleString()} sqft`);
      if (prop.price) parts.push(`$${prop.price.toLocaleString()}`);

      const autoContext = parts.join(' | ');
      if (autoContext) {
        setState(prev => ({
          ...prev,
          context: { ...prev.context, propertyDetails: autoContext },
        }));
      }
    }
  }, [state.selectedProperty]);

  // ============ HANDLERS ============

  const handleTabChange = (newTab: SocialTabId) => {
    const newDefaultIntent = getDefaultIntent(newTab);
    const newDefaultTone = getDefaultTone(newDefaultIntent.id);
    const newDefaultTemplate = coerceTemplate(newDefaultIntent.id);

    setState(prev => ({
      ...prev,
      tab: newTab,
      intentId: newDefaultIntent.id,
      templateId: newDefaultTemplate,
      toneId: prev.toneManuallySet ? prev.toneId : newDefaultTone,
      context: {},
      templateUserInputs: {},
      selectedProperty: newTab === 'property' ? prev.selectedProperty : null,
    }));
  };

  const handleIntentChange = (newIntentId: IntentId) => {
    const newDefaultTone = getDefaultTone(newIntentId);
    const newTemplate = coerceTemplate(newIntentId, state.templateId);

    setState(prev => ({
      ...prev,
      intentId: newIntentId,
      templateId: newTemplate,
      toneId: prev.toneManuallySet ? prev.toneId : newDefaultTone,
      context: {}, // Reset context for new intent
      templateUserInputs: {},
    }));
  };

  const handleTemplateChange = (newTemplateId: ImageTemplateId) => {
    setState(prev => ({
      ...prev,
      templateId: newTemplateId,
      templateUserInputs: {},
    }));
  };

  const handleToneChange = (newToneId: ToneId) => {
    setState(prev => ({
      ...prev,
      toneId: newToneId,
      toneManuallySet: true,
    }));
  };

  const handlePropertySelect = (property: Property) => {
    setState(prev => ({ ...prev, selectedProperty: property }));
    setPropertySearchOpen(false);
  };

  const handleContextFieldChange = (fieldKey: string, value: string) => {
    setState(prev => ({
      ...prev,
      context: { ...prev.context, [fieldKey]: value },
    }));
  };

  const handleTemplateInputChange = (fieldKey: string, value: string) => {
    setState(prev => ({
      ...prev,
      templateUserInputs: { ...prev.templateUserInputs, [fieldKey]: value },
    }));
  };

  // Date/Time handlers
  const handleDateInputChange = (value: string) => {
    setState(prev => ({ ...prev, dateInput: value }));
    const suggestions = getDateSuggestions(value);
    setDateSuggestions(suggestions);
    setShowDateSuggestions(suggestions.length > 0);
  };

  const handleTimeInputChange = (value: string) => {
    setState(prev => ({ ...prev, timeInput: value }));
    const suggestions = getTimeSuggestions(value);
    setTimeSuggestions(suggestions);
    setShowTimeSuggestions(suggestions.length > 0);
  };

  const handleDateSelect = (suggestion: DateSuggestion) => {
    setState(prev => ({
      ...prev,
      scheduleDate: suggestion.value,
      dateInput: suggestion.label,
    }));
    setShowDateSuggestions(false);
  };

  const handleTimeSelect = (suggestion: TimeSuggestion) => {
    setState(prev => ({
      ...prev,
      scheduleTime: suggestion.value,
      timeInput: suggestion.label,
    }));
    setShowTimeSuggestions(false);
  };

  // Custom image handlers
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
      templateId: coerceTemplate(prev.intentId),
    }));
  };

  // ============ GENERATION & PUBLISHING ============

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      // Build context string from all context fields
      let contextString = Object.entries(state.context)
        .filter(([, value]) => value.trim())
        .map(([key, value]) => {
          const field = currentIntent.fields.find(f => f.key === key);
          return field ? `${field.label}: ${value}` : value;
        })
        .join('\n');

      // Add open house info if applicable
      if (state.intentId === 'open-house' && state.openHouseDate && state.openHouseStartTime && state.openHouseEndTime) {
        const openHouseInfo = `\n\nOpen House: ${state.openHouseDateInput} from ${state.openHouseStartTimeInput} to ${state.openHouseEndTimeInput}`;
        contextString += openHouseInfo;
      }

      // Add property's social media description if available (from GHL custom field)
      // This is the "Tell us more" field that provides additional context for captions
      if (state.selectedProperty?.socialMediaPropertyDescription) {
        contextString += `\n\nProperty Description: ${state.selectedProperty.socialMediaPropertyDescription}`;
      }

      // Generate caption
      const captionResult = await generateCaption({
        property: state.selectedProperty,
        context: contextString,
        tone: state.toneId as any,
        platform: 'all',
        postIntent: state.intentId as any,
      });

      if (captionResult.success) {
        setState(prev => ({ ...prev, generatedCaption: captionResult.caption }));
      }

      // Generate image if template selected
      if (selectedTemplate && state.templateId !== 'custom' && state.templateId !== 'none') {
        const preparedProperty = state.selectedProperty
          ? preparePropertyForTemplate(state.selectedProperty)
          : null;

        const enhancedUserInputs = {
          ...state.templateUserInputs,
          ...(state.selectedSupportingImages.length > 0 && {
            image_comp_1: state.selectedSupportingImages[0] || '',
            image_comp_2: state.selectedSupportingImages[1] || '',
          }),
          ...(state.qrCodeUrl && {
            qrcode_comp: state.qrCodeUrl,
          }),
        };

        const resolvedFields = resolveAllFields(selectedTemplate, preparedProperty, enhancedUserInputs);
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
      const isNow = !state.scheduleDate && !state.scheduleTime;
      let scheduleDate: string | undefined;

      if (!isNow && state.scheduleDate && state.scheduleTime) {
        const combined = combineDateAndTime(state.scheduleDate, state.scheduleTime);
        scheduleDate = combined.toISOString();
      }

      await createPost.mutateAsync({
        accountIds: state.selectedAccounts,
        summary: state.generatedCaption,
        media: imageUrl ? [{ url: imageUrl, type: 'image/png' }] : undefined,
        scheduleDate,
        status: isNow ? 'published' : 'scheduled',
      });

      toast.success('Post published successfully!');
      setState(getInitialState());
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

  // ============ VALIDATION ============

  const isValid = useMemo(() => {
    // Must have intent and tone
    if (!state.intentId || !state.toneId) return false;

    // Property tab requires property selection
    if (state.tab === 'property' && !state.selectedProperty) return false;

    // If intent requires property, must have property
    if (intentRequiresProperty(state.intentId) && !state.selectedProperty) return false;

    // Validate required intent fields
    const validation = validateIntentFields(state.intentId, state.context as any);
    if (!validation.valid) return false;

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

  // ============ RENDER HELPERS ============

  const renderIntentFields = () => {
    if (currentIntent.fields.length === 0) return null;

    return (
      <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Edit2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <span className="font-medium text-sm">Tell us more</span>
          <span className="text-xs text-muted-foreground">
            These details generate your hook + talking points
          </span>
        </div>
        <div className="space-y-4">
          {currentIntent.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
                {field.helpText && (
                  <span className="text-xs text-muted-foreground font-normal">
                    ({field.helpText})
                  </span>
                )}
              </label>
              {field.type === 'textarea' ? (
                <Textarea
                  placeholder={field.placeholder}
                  value={state.context[field.key] || ''}
                  onChange={(e) => handleContextFieldChange(field.key, e.target.value)}
                  maxLength={field.maxChars}
                  rows={3}
                  className="resize-none"
                />
              ) : (
                <Input
                  type={field.type === 'number' ? 'number' : 'text'}
                  placeholder={field.placeholder}
                  value={state.context[field.key] || ''}
                  onChange={(e) => handleContextFieldChange(field.key, e.target.value)}
                  maxLength={field.maxChars}
                />
              )}
              {field.maxChars && (
                <div className="text-xs text-muted-foreground text-right">
                  {(state.context[field.key] || '').length}/{field.maxChars}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTemplateFields = () => {
    if (!selectedTemplate || userInputFields.length === 0) return null;

    return (
      <div className="mt-4 p-4 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
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
                  className="resize-none"
                />
              ) : config.dataType === 'image' ? (
                <Input
                  type="url"
                  placeholder={config.inputConfig?.placeholder || 'Paste image URL...'}
                  value={state.templateUserInputs[key] || ''}
                  onChange={(e) => handleTemplateInputChange(key, e.target.value)}
                />
              ) : (
                <Input
                  type="text"
                  placeholder={config.inputConfig?.placeholder}
                  value={state.templateUserInputs[key] || ''}
                  onChange={(e) => handleTemplateInputChange(key, e.target.value)}
                  maxLength={config.inputConfig?.maxLength}
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

  // ============ RENDER ============

  // Preview Step
  if (step === 'preview') {
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={handleBackToForm} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Edit
        </Button>

        {/* Preview Card */}
        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6 space-y-6">
            {/* Generated Image */}
            {(state.generatedImageUrl || state.customImagePreview) && (
              <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border">
                <img
                  src={state.generatedImageUrl || state.customImagePreview || ''}
                  alt="Generated post"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Generated Caption */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Caption</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('form')}
                  className="gap-1 text-xs"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </Button>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                <p className="whitespace-pre-wrap text-sm">{state.generatedCaption}</p>
              </div>
            </div>

            {/* Account Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Post to</label>
              <div className="flex flex-wrap gap-2">
                {connectedAccounts.map((account) => (
                  <Button
                    key={account.id}
                    variant={state.selectedAccounts.includes(account.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleAccount(account.id)}
                    className={cn(
                      'gap-2',
                      state.selectedAccounts.includes(account.id) && 'bg-purple-600 hover:bg-purple-700'
                    )}
                  >
                    {state.selectedAccounts.includes(account.id) && <Check className="h-3 w-3" />}
                    {account.name || account.platform}
                  </Button>
                ))}
              </div>
            </div>

            {/* Publish Button */}
            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                variant="outline"
                className="gap-2"
                disabled={isGenerating}
              >
                <RefreshCw className={cn('h-4 w-4', isGenerating && 'animate-spin')} />
                Regenerate
              </Button>
              <Button
                onClick={handlePublish}
                className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700"
                disabled={isPublishing || state.selectedAccounts.length === 0}
              >
                {isPublishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4" />
                )}
                {state.scheduleDate && state.scheduleTime ? 'Schedule Post' : 'Publish Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form Step
  return (
    <div className="space-y-6">
      {/* No accounts warning */}
      {connectedAccounts.length === 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  No Social Accounts Connected
                </h3>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  Connect at least one social media account in Settings to create posts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Selector - 3 Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isSelected = state.tab === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'gap-2 transition-all',
                isSelected && 'bg-purple-600 hover:bg-purple-700'
              )}
            >
              {TAB_ICONS[tab.id]}
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Tab Description */}
      <p className="text-sm text-muted-foreground -mt-2">
        {TABS.find(t => t.id === state.tab)?.description}
      </p>

      {/* Main Form Card */}
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Row 1: What are you sharing? */}
            <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
              <span className="text-muted-foreground">I want to share</span>

              {/* Intent Selector */}
              <Select value={state.intentId} onValueChange={(v) => handleIntentChange(v as IntentId)}>
                <SelectTrigger className="w-[200px] h-auto py-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tabIntents.map((intent) => (
                    <SelectItem key={intent.id} value={intent.id}>
                      <span className="flex items-center gap-2">
                        <span>{intent.icon}</span>
                        <span>{intent.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Property Selector (only for property tab) */}
              {state.tab === 'property' && (
                <>
                  <span className="text-muted-foreground">for</span>
                  <Popover open={propertySearchOpen} onOpenChange={setPropertySearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          'justify-between min-w-[200px] h-auto py-1.5 px-3',
                          state.selectedProperty
                            ? 'border-purple-400 bg-purple-50 dark:bg-purple-950/30'
                            : 'border-dashed'
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
                                    'mr-2 h-4 w-4',
                                    state.selectedProperty?.id === property.id ? 'opacity-100' : 'opacity-0'
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
                </>
              )}
            </div>

            {/* Row 2: Scheduling */}
            <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
              <span className="text-muted-foreground">on</span>

              {/* Date Input */}
              <div className="relative" ref={dateDropdownRef}>
                <Input
                  type="text"
                  placeholder="today"
                  value={state.dateInput}
                  onChange={(e) => handleDateInputChange(e.target.value)}
                  onFocus={() => {
                    const suggestions = getDateSuggestions(state.dateInput);
                    setDateSuggestions(suggestions);
                    setShowDateSuggestions(suggestions.length > 0);
                  }}
                  className="w-[140px] h-auto py-1.5 px-3"
                />
                {showDateSuggestions && dateSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-[240px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                    {dateSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleDateSelect(suggestion);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors border-b last:border-b-0 border-gray-100 dark:border-gray-800"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-muted-foreground">at</span>

              {/* Time Input */}
              <div className="relative" ref={timeDropdownRef}>
                <Input
                  type="text"
                  placeholder="9:00 AM"
                  value={state.timeInput}
                  onChange={(e) => handleTimeInputChange(e.target.value)}
                  onFocus={() => {
                    const suggestions = getTimeSuggestions(state.timeInput);
                    setTimeSuggestions(suggestions);
                    setShowTimeSuggestions(suggestions.length > 0);
                  }}
                  className="w-[120px] h-auto py-1.5 px-3"
                />
                {showTimeSuggestions && timeSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-[160px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                    {timeSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleTimeSelect(suggestion);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors border-b last:border-b-0 border-gray-100 dark:border-gray-800"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Preview Badge */}
            {state.scheduleDate && state.scheduleTime && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  Scheduled for:
                </span>
                <Badge
                  variant="secondary"
                  className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold"
                >
                  {formatScheduleDateTime(combineDateAndTime(state.scheduleDate, state.scheduleTime))}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setState(prev => ({
                      ...prev,
                      scheduleDate: '',
                      scheduleTime: '',
                      dateInput: '',
                      timeInput: '',
                    }));
                  }}
                  className="h-6 w-6 p-0 hover:bg-purple-200 dark:hover:bg-purple-900"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Caption Settings Section */}
            <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                  Caption Settings
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
                <span className="text-muted-foreground">Write in a</span>

                {/* Tone Selector */}
                <Select value={state.toneId} onValueChange={(v) => handleToneChange(v as ToneId)}>
                  <SelectTrigger className="w-[150px] h-auto py-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((tone) => (
                      <SelectItem key={tone.id} value={tone.id}>
                        <span className="flex items-center gap-2">
                          <span>{tone.icon}</span>
                          <span>{tone.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-muted-foreground">tone</span>
              </div>
            </div>

            {/* Image Template Section */}
            <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                  Image Template
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
                <span className="text-muted-foreground">Generate image using</span>

                {/* Template Selector - constrained by intent */}
                <Select
                  value={state.templateId}
                  onValueChange={(v) => handleTemplateChange(v as ImageTemplateId)}
                >
                  <SelectTrigger className="w-[180px] h-auto py-1.5">
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <span className="flex items-center gap-2">
                          <span>{template.icon}</span>
                          <span>{template.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-muted-foreground">template</span>
              </div>
            </div>

            {/* Intent-specific Fields */}
            {renderIntentFields()}

            {/* Template-specific Fields */}
            {renderTemplateFields()}

            {/* Custom Image Upload */}
            {state.templateId === 'custom' && (
              <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="h-4 w-4" />
                  <span className="font-medium text-sm">Upload Image</span>
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
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Click to upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustomImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}

            {/* Hero Image Display (for property posts with images) */}
            {state.tab === 'property' && state.selectedProperty?.heroImage && (
              <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-sm">Hero Image</span>
                  <span className="text-xs text-muted-foreground">Main image for your template</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <img
                      src={state.selectedProperty.heroImage}
                      alt="Hero"
                      className="h-32 w-32 object-cover rounded-lg border-2 border-amber-300 dark:border-amber-700 shadow-sm"
                    />
                    <div className="absolute -top-2 -right-2 bg-amber-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                      ★
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      This is the primary image that will be displayed prominently in your template.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Supporting Images Selection */}
            {state.tab === 'property' &&
              state.selectedProperty?.images &&
              state.selectedProperty.images.length > 0 &&
              (() => {
                const supportingImagesOnly = state.selectedProperty.images.filter(
                  (img) => img !== state.selectedProperty?.heroImage
                );
                if (supportingImagesOnly.length === 0) return null;

                return (
                  <div className="mt-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="font-medium text-sm">Supporting Images</span>
                      <Badge variant="secondary" className="text-xs">
                        Select up to 2
                      </Badge>
                    </div>

                    {/* Selected preview */}
                    {state.selectedSupportingImages.length > 0 && (
                      <div className="mb-3 p-2 bg-white dark:bg-gray-900 rounded-lg border border-purple-300 dark:border-purple-700">
                        <div className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
                          Selected for template:
                        </div>
                        <div className="flex gap-2">
                          {state.selectedSupportingImages.map((imageUrl, idx) => (
                            <div key={idx} className="relative">
                              <img
                                src={imageUrl}
                                alt={`Selected ${idx + 1}`}
                                className="h-20 w-20 object-cover rounded-lg border-2 border-purple-500"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-purple-600 text-white text-xs text-center py-0.5 rounded-b-lg">
                                #{idx + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Carousel */}
                    <div className="overflow-x-auto">
                      <div className="flex gap-2 pb-2">
                        {supportingImagesOnly.map((imageUrl, idx) => {
                          const isSelected = state.selectedSupportingImages.includes(imageUrl);
                          const selectedIndex = state.selectedSupportingImages.indexOf(imageUrl);

                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                if (isSelected) {
                                  setState((prev) => ({
                                    ...prev,
                                    selectedSupportingImages: prev.selectedSupportingImages.filter(
                                      (img) => img !== imageUrl
                                    ),
                                  }));
                                } else if (state.selectedSupportingImages.length < 2) {
                                  setState((prev) => ({
                                    ...prev,
                                    selectedSupportingImages: [...prev.selectedSupportingImages, imageUrl],
                                  }));
                                } else {
                                  toast.error('Maximum 2 supporting images allowed');
                                }
                              }}
                              className={cn(
                                'relative flex-shrink-0 w-24 h-24 rounded-lg border-2 transition-all',
                                isSelected
                                  ? 'border-purple-500 ring-2 ring-purple-300 dark:ring-purple-700'
                                  : 'border-purple-200 dark:border-purple-700 hover:border-purple-400'
                              )}
                            >
                              <img
                                src={imageUrl}
                                alt={`Supporting ${idx + 1}`}
                                className="w-full h-full object-cover rounded-lg"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                  <div className="bg-purple-600 text-white text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center">
                                    #{selectedIndex + 1}
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-xs text-center text-muted-foreground mt-1">
                      Click images to select (hero image is already included)
                    </div>
                  </div>
                );
              })()}

            {/* Generate Button */}
            <div className="pt-4">
              <Button
                onClick={handleGenerate}
                disabled={!isValid || isGenerating}
                className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Post
                  </>
                )}
              </Button>

              {/* Validation hints */}
              {!isValid && (
                <div className="mt-2 text-xs text-muted-foreground text-center">
                  {state.tab === 'property' && !state.selectedProperty && (
                    <span>Select a property to continue</span>
                  )}
                  {currentIntent.fields.some((f) => f.required && !state.context[f.key]) && (
                    <span>Fill in all required fields</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Badge */}
      {state.intentId && (
        <div className="text-sm text-muted-foreground text-center">
          Creating a{' '}
          <span className="font-medium text-foreground">
            {currentIntent.icon} {currentIntent.label}
          </span>{' '}
          post
          {state.selectedProperty && (
            <>
              {' '}
              for{' '}
              <span className="font-medium text-foreground">
                {state.selectedProperty.address}
              </span>
            </>
          )}
          {state.scheduleDate && state.scheduleTime && (
            <>
              {' '}
              scheduled for{' '}
              <span className="font-medium text-foreground">
                {state.dateInput} at {state.timeInput}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
