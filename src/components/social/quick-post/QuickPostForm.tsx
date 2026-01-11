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
import { Loader2, ChevronDown, ChevronLeft, ChevronRight, Check, Sparkles, Building2, Image as ImageIcon, Upload, X, ArrowLeft, Eye, Rocket, RefreshCw, Edit2, User, TrendingUp, MessageSquare, MapPin, Calendar, Clock, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperties, useSocialAccounts, useCreateSocialPost } from '@/services/ghlApi';
import { getTemplateById } from '@/lib/templates/profiles';
import { buildImejisPayload, resolveAllFields, preparePropertyForTemplate } from '@/lib/templates/fieldMapper';
import { renderImejisTemplate } from '@/services/imejis/api';
import { useCaptionGenerate } from '../create-wizard/hooks/useCaptionGenerate';
import { TONE_PRESETS, type CaptionTone, type PostIntent } from '../create-wizard/types';
import { getDateSuggestions, getTimeSuggestions, combineDateAndTime, formatScheduleDateTime, type DateSuggestion, type TimeSuggestion } from '@/lib/utils/dateTimeSuggestions';
import { getQRCodeLinks, type QRCodeLink } from '@/lib/utils/qrCodeLinks';
import type { Property } from '@/types';
import { toast } from 'sonner';

// ============ POST TYPES ============
type PostType = 'property' | 'personal' | 'market' | 'testimonial' | 'community';

const POST_TYPES = [
  { id: 'property' as PostType, label: 'Property', icon: Building2, description: 'Listings, sales, open houses' },
  { id: 'personal' as PostType, label: 'Personal', icon: User, description: 'Life updates, milestones, behind the scenes' },
  { id: 'market' as PostType, label: 'Market Update', icon: TrendingUp, description: 'Market insights, trends, tips' },
  { id: 'testimonial' as PostType, label: 'Client Story', icon: MessageSquare, description: 'Reviews, success stories' },
  { id: 'community' as PostType, label: 'Community', icon: MapPin, description: 'Local events, business spotlights' },
];

// ============ INTENTS PER POST TYPE ============
const PROPERTY_INTENTS = [
  { id: 'just-listed', label: 'Just Listed', icon: '🏷️' },
  { id: 'sold', label: 'Just Sold', icon: '🎉' },
  { id: 'open-house', label: 'Open House', icon: '🚪' },
  { id: 'price-reduced', label: 'Price Reduced', icon: '📉' },
  { id: 'coming-soon', label: 'Coming Soon', icon: '🔜' },
];

const PERSONAL_INTENTS = [
  { id: 'milestone', label: 'Milestone', icon: '🏆' },
  { id: 'behind-scenes', label: 'Behind the Scenes', icon: '🎬' },
  { id: 'lifestyle', label: 'Lifestyle', icon: '☕' },
  { id: 'motivation', label: 'Motivation', icon: '💪' },
  { id: 'gratitude', label: 'Gratitude', icon: '🙏' },
];

const MARKET_INTENTS = [
  { id: 'market-update', label: 'Market Update', icon: '📊' },
  { id: 'buyer-tips', label: 'Buyer Tips', icon: '🏠' },
  { id: 'seller-tips', label: 'Seller Tips', icon: '💰' },
  { id: 'investment', label: 'Investment Insight', icon: '📈' },
  { id: 'rate-update', label: 'Rate Update', icon: '💵' },
];

const TESTIMONIAL_INTENTS = [
  { id: 'client-review', label: 'Client Review', icon: '⭐' },
  { id: 'success-story', label: 'Success Story', icon: '🎊' },
  { id: 'closing-day', label: 'Closing Day', icon: '🔑' },
  { id: 'anniversary', label: 'Home Anniversary', icon: '🎂' },
];

const COMMUNITY_INTENTS = [
  { id: 'local-event', label: 'Local Event', icon: '🎪' },
  { id: 'business-spotlight', label: 'Business Spotlight', icon: '🏪' },
  { id: 'neighborhood', label: 'Neighborhood Feature', icon: '🏘️' },
  { id: 'community-give', label: 'Giving Back', icon: '❤️' },
];

const INTENTS_BY_TYPE: Record<PostType, typeof PROPERTY_INTENTS> = {
  property: PROPERTY_INTENTS,
  personal: PERSONAL_INTENTS,
  market: MARKET_INTENTS,
  testimonial: TESTIMONIAL_INTENTS,
  community: COMMUNITY_INTENTS,
};

// ============ TEMPLATES ============
// Property templates (existing)
const PROPERTY_TEMPLATES = [
  { id: 'just-listed', label: 'Just Listed', icon: '🏷️' },
  { id: 'just-sold', label: 'Just Sold', icon: '🎉' },
  { id: 'open-house', label: 'Open House', icon: '🚪' },
  { id: 'custom', label: 'Custom Image', icon: '📷' },
  { id: 'none', label: 'No Image', icon: '📝' },
];

// Generic templates for non-property posts
const GENERIC_TEMPLATES = [
  { id: 'custom', label: 'Upload Image', icon: '📷' },
  { id: 'none', label: 'Text Only', icon: '📝' },
];

// Map intents to templates (property only)
const INTENT_TO_TEMPLATE: Record<string, string> = {
  'just-listed': 'just-listed',
  'sold': 'just-sold',
  'open-house': 'open-house',
};

type FormStep = 'form' | 'preview';

interface QuickPostFormState {
  postType: PostType;
  selectedProperty: Property | null;
  scheduleDate: string; // ISO date string or empty
  scheduleTime: string; // "HH:mm" format or empty
  dateInput: string; // User's date input text
  timeInput: string; // User's time input text
  // Open House date/time (for open-house intent)
  openHouseDate: string; // ISO date string or empty
  openHouseStartTime: string; // "HH:mm" format or empty
  openHouseEndTime: string; // "HH:mm" format or empty
  openHouseDateInput: string; // User's date input text
  openHouseStartTimeInput: string; // User's time input text
  openHouseEndTimeInput: string; // User's time input text
  intent: string; // Dynamic based on postType
  tone: CaptionTone;
  templateId: string | null;
  templateUserInputs: Record<string, string>;
  context: string;
  customImage: File | null;
  customImagePreview: string | null;
  // Supporting images selection (for image_comp templates)
  selectedSupportingImages: string[]; // Up to 2 image URLs
  // QR code URL (for qrcode_comp templates)
  qrCodeUrl: string;
  // Generated content
  generatedCaption: string;
  generatedImageUrl: string | null;
  generatedImageBlob: Blob | null;
  // Selected accounts for publishing
  selectedAccounts: string[];
}

const INITIAL_STATE: QuickPostFormState = {
  postType: 'property',
  selectedProperty: null,
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
  intent: 'just-listed',
  tone: 'professional',
  templateId: null,
  templateUserInputs: {},
  context: '',
  customImage: null,
  customImagePreview: null,
  selectedSupportingImages: [],
  qrCodeUrl: '',
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

  // Use the actual Property Pipeline (not Seller Acquisition which has contacts too)
  const { data: propertiesData } = useProperties('U4FANAMaB1gGddRaaD9x');
  const properties = propertiesData?.properties || [];

  const { data: accountsData } = useSocialAccounts();
  const connectedAccounts = accountsData?.accounts || [];

  const { generateCaption } = useCaptionGenerate();
  const createPost = useCreateSocialPost();

  // Get selected template profile
  const selectedTemplate = state.templateId && state.templateId !== 'custom' && state.templateId !== 'none'
    ? getTemplateById(state.templateId)
    : null;

  // Get available intents based on post type
  const availableIntents = INTENTS_BY_TYPE[state.postType];

  // Get available templates based on post type
  const availableTemplates = state.postType === 'property' ? PROPERTY_TEMPLATES : GENERIC_TEMPLATES;

  // Get user input fields for selected template
  const userInputFields = useMemo(() => {
    if (!selectedTemplate) return [];
    return Object.entries(selectedTemplate.fields)
      .filter(([, config]) => config.source === 'user-input')
      .map(([key, config]) => ({ key, config }));
  }, [selectedTemplate]);

  // Auto-select template based on intent (property posts only)
  useEffect(() => {
    if (state.postType === 'property') {
      const mappedTemplate = INTENT_TO_TEMPLATE[state.intent];
      if (mappedTemplate && !state.templateId) {
        setState(prev => ({ ...prev, templateId: mappedTemplate }));
      }
    }
  }, [state.intent, state.postType]);

  // Reset intent when post type changes
  const handlePostTypeChange = (newType: PostType) => {
    const defaultIntent = INTENTS_BY_TYPE[newType][0]?.id || '';
    setState(prev => ({
      ...prev,
      postType: newType,
      intent: defaultIntent,
      templateId: null,
      templateUserInputs: {},
      selectedProperty: newType === 'property' ? prev.selectedProperty : null,
      context: '',
    }));
  };

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

  // Handle clicks outside date/time dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setShowDateSuggestions(false);
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setShowTimeSuggestions(false);
      }
      // Open House dropdowns
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

  const handlePropertySelect = (property: Property) => {
    setState(prev => ({ ...prev, selectedProperty: property }));
    setPropertySearchOpen(false);
  };

  const handleIntentChange = (intent: string) => {
    const mappedTemplate = state.postType === 'property' ? INTENT_TO_TEMPLATE[intent] : null;
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

  // Handle date input change and update suggestions
  const handleDateInputChange = (value: string) => {
    setState(prev => ({ ...prev, dateInput: value }));
    const suggestions = getDateSuggestions(value);
    setDateSuggestions(suggestions);
    setShowDateSuggestions(suggestions.length > 0);
  };

  // Handle time input change and update suggestions
  const handleTimeInputChange = (value: string) => {
    setState(prev => ({ ...prev, timeInput: value }));
    const suggestions = getTimeSuggestions(value);
    setTimeSuggestions(suggestions);
    setShowTimeSuggestions(suggestions.length > 0);
  };

  // Handle date selection from dropdown
  const handleDateSelect = (suggestion: DateSuggestion) => {
    setState(prev => ({
      ...prev,
      scheduleDate: suggestion.value,
      dateInput: suggestion.label,
    }));
    setShowDateSuggestions(false);
  };

  // Handle time selection from dropdown
  const handleTimeSelect = (suggestion: TimeSuggestion) => {
    setState(prev => ({
      ...prev,
      scheduleTime: suggestion.value,
      timeInput: suggestion.label,
    }));
    setShowTimeSuggestions(false);
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
      // Add open house info to context if it's an open house post
      let contextWithOpenHouse = state.context;
      if (state.intent === 'open-house' && state.openHouseDate && state.openHouseStartTime && state.openHouseEndTime) {
        const openHouseInfo = `\n\nOpen House: ${state.openHouseDateInput} from ${state.openHouseStartTimeInput} to ${state.openHouseEndTimeInput}`;
        contextWithOpenHouse = state.context + openHouseInfo;
      }

      // Build params object - only include postIntent for property posts
      const baseParams = {
        property: state.selectedProperty,
        context: contextWithOpenHouse,
        tone: state.tone,
        platform: 'all' as const,
      };

      const captionResult = await generateCaption(
        state.postType === 'property'
          ? { ...baseParams, postIntent: state.intent as PostIntent }
          : baseParams
      );

      if (captionResult.success) {
        setState(prev => ({ ...prev, generatedCaption: captionResult.caption }));
      }

      // 2. Generate image if template selected
      if (selectedTemplate && state.templateId !== 'custom' && state.templateId !== 'none') {
        const preparedProperty = state.selectedProperty
          ? preparePropertyForTemplate(state.selectedProperty)
          : null;

        // Merge supporting images and QR code URL into user inputs
        const enhancedUserInputs = {
          ...state.templateUserInputs,
          // Add selected supporting images if available
          ...(state.selectedSupportingImages.length > 0 && {
            image_comp_1: state.selectedSupportingImages[0] || '',
            image_comp_2: state.selectedSupportingImages[1] || '',
          }),
          // Add QR code URL if provided
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

      // Determine if posting now or scheduled
      const isNow = !state.scheduleDate && !state.scheduleTime;
      let scheduleDate: string | undefined;

      if (!isNow && state.scheduleDate && state.scheduleTime) {
        // Combine date and time
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

    // Property posts require a property selection
    if (state.postType === 'property' && !state.selectedProperty) return false;

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
                    {availableIntents.find(i => i.id === state.intent)?.label} post
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
                  {!state.scheduleDate && !state.scheduleTime
                    ? 'Publish Now'
                    : state.scheduleDate && state.scheduleTime
                    ? `Schedule: ${formatScheduleDateTime(combineDateAndTime(state.scheduleDate, state.scheduleTime))}`
                    : 'Publish Now'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Get context label and placeholder based on post type
  const getContextConfig = () => {
    switch (state.postType) {
      case 'property':
        return {
          label: 'Property Highlights & Details',
          placeholder: 'Describe what makes this property special... (beds, baths, features, neighborhood)',
          helpText: 'This information feeds the AI caption and auto-fills template fields.',
        };
      case 'personal':
        return {
          label: 'What do you want to share?',
          placeholder: 'Share your story... (milestone achieved, behind-the-scenes moment, life update)',
          helpText: 'Be authentic! Personal posts build connection with your audience.',
        };
      case 'market':
        return {
          label: 'Market Insight Details',
          placeholder: 'What market trend or insight are you sharing? (stats, predictions, tips)',
          helpText: 'Include specific data or actionable advice to provide value.',
        };
      case 'testimonial':
        return {
          label: 'Client Story Details',
          placeholder: 'Share the client journey... (challenge they faced, how you helped, outcome)',
          helpText: 'Focus on the transformation and emotional impact.',
        };
      case 'community':
        return {
          label: 'Community Spotlight',
          placeholder: 'What local gem are you featuring? (event details, business info, neighborhood highlights)',
          helpText: 'Showcase your local expertise and community connection.',
        };
      default:
        return {
          label: 'Details',
          placeholder: 'Share the details...',
          helpText: 'This will be used to generate your caption.',
        };
    }
  };

  const contextConfig = getContextConfig();

  // Form Step UI
  return (
    <div className="space-y-6">
      {/* Account Connection Warning */}
      {connectedAccounts.length === 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-amber-600 dark:text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  No Social Accounts Connected
                </h3>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  You need to connect at least one social media account before you can create posts. Go to Settings to connect your accounts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post Type Selector */}
      <div className="flex flex-wrap gap-2">
        {POST_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = state.postType === type.id;
          return (
            <Button
              key={type.id}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePostTypeChange(type.id)}
              className={cn(
                "gap-2 transition-all",
                isSelected && "bg-purple-600 hover:bg-purple-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {type.label}
            </Button>
          );
        })}
      </div>

      {/* Description of selected type */}
      <p className="text-sm text-muted-foreground -mt-2">
        {POST_TYPES.find(t => t.id === state.postType)?.description}
      </p>

      {/* Main Sentence Form */}
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Dynamic Row 1 based on post type */}
            <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
              {state.postType === 'property' ? (
                <>
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
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">I want to share</span>

                  {/* Intent for non-property posts */}
                  <Select value={state.intent} onValueChange={handleIntentChange}>
                    <SelectTrigger className="w-[200px] h-auto py-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableIntents.map((intent) => (
                        <SelectItem key={intent.id} value={intent.id}>
                          <span className="flex items-center gap-2">
                            <span>{intent.icon}</span>
                            <span>{intent.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              <span className="text-muted-foreground">on</span>

              {/* Date Input with Autocomplete */}
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
                {/* Date suggestions dropdown */}
                {showDateSuggestions && dateSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-[240px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                    {dateSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent input blur
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

              {/* Time Input with Autocomplete */}
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
                {/* Time suggestions dropdown */}
                {showTimeSuggestions && timeSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-[160px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                    {timeSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent input blur
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
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    Scheduled for:
                  </span>
                </div>
                <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold">
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
                <span className="font-semibold text-sm text-blue-900 dark:text-blue-100">Caption Settings</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
                {state.postType === 'property' && (
                  <>
                    <span className="text-muted-foreground">Write caption for</span>

                    {/* Intent Selector (property) */}
                    <Select value={state.intent} onValueChange={handleIntentChange}>
                      <SelectTrigger className="w-[180px] h-auto py-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableIntents.map((intent) => (
                          <SelectItem key={intent.id} value={intent.id}>
                            <span className="flex items-center gap-2">
                              <span>{intent.icon}</span>
                              <span>{intent.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}

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

                <span className="text-muted-foreground">tone</span>
              </div>
            </div>

            {/* Image Template Section */}
            <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="font-semibold text-sm text-purple-900 dark:text-purple-100">Image Template</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
                <span className="text-muted-foreground">Generate image using</span>

                {/* Template Selector */}
                <Select
                  value={state.templateId || ''}
                  onValueChange={handleTemplateChange}
                >
                  <SelectTrigger className="w-[180px] h-auto py-1.5">
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTemplates.map((template) => (
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

            {/* Template-specific fields (inline expansion) - property only */}
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

            {/* Supporting Images Selection - Interactive Carousel */}
            {state.postType === 'property' && state.selectedProperty && state.selectedProperty.images && state.selectedProperty.images.length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-sm">Supporting Images</span>
                    <span className="text-xs text-muted-foreground">
                      {state.selectedSupportingImages.length}/2 selected from {state.selectedProperty.images.length} available
                    </span>
                  </div>
                  {state.selectedSupportingImages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, selectedSupportingImages: [] }))}
                      className="h-6 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {/* Selected Images Preview */}
                {state.selectedSupportingImages.length > 0 && (
                  <div className="mb-3 p-2 bg-white dark:bg-gray-900 rounded-lg border border-purple-300 dark:border-purple-700">
                    <div className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">Selected for template:</div>
                    <div className="flex gap-2">
                      {state.selectedSupportingImages.map((imageUrl, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={imageUrl}
                            alt={`Selected ${idx + 1}`}
                            className="h-20 w-20 object-cover rounded-lg border-2 border-purple-500"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-5 w-5"
                            onClick={() => {
                              setState(prev => ({
                                ...prev,
                                selectedSupportingImages: prev.selectedSupportingImages.filter((_, i) => i !== idx),
                              }));
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <div className="absolute bottom-0 left-0 right-0 bg-purple-600 text-white text-xs text-center py-0.5 rounded-b-lg">
                            #{idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image Gallery with Carousel */}
                <div className="relative">
                  <div className="overflow-x-auto">
                    <div className="flex gap-2 pb-2">
                      {state.selectedProperty.images.map((imageUrl, idx) => {
                        const isSelected = state.selectedSupportingImages.includes(imageUrl);
                        const selectedIndex = state.selectedSupportingImages.indexOf(imageUrl);

                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (isSelected) {
                                // Deselect
                                setState(prev => ({
                                  ...prev,
                                  selectedSupportingImages: prev.selectedSupportingImages.filter(img => img !== imageUrl),
                                }));
                              } else if (state.selectedSupportingImages.length < 2) {
                                // Select (max 2)
                                setState(prev => ({
                                  ...prev,
                                  selectedSupportingImages: [...prev.selectedSupportingImages, imageUrl],
                                }));
                              } else {
                                toast.error('Maximum 2 supporting images allowed');
                              }
                            }}
                            className={cn(
                              "relative flex-shrink-0 w-24 h-24 rounded-lg border-2 transition-all",
                              isSelected
                                ? "border-purple-500 ring-2 ring-purple-300 dark:ring-purple-700"
                                : "border-purple-200 dark:border-purple-700 hover:border-purple-400"
                            )}
                          >
                            <img
                              src={imageUrl}
                              alt={`Available ${idx + 1}`}
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
                    Click images to select up to 2 for your template
                  </div>
                </div>
              </div>
            )}

            {/* QR Code URL Input */}
            {state.postType === 'property' && state.selectedProperty && (
              <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <LinkIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-sm">QR Code URL (Optional)</span>
                  <span className="text-xs text-muted-foreground">For templates with QR code</span>
                </div>

                {/* Saved Links Dropdown */}
                {savedQRLinks.length > 0 && (
                  <Select
                    value=""
                    onValueChange={(url) => setState(prev => ({ ...prev, qrCodeUrl: url }))}
                  >
                    <SelectTrigger className="w-full mb-2 bg-white dark:bg-gray-900">
                      <SelectValue placeholder="Select a saved link..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedQRLinks.map((link) => (
                        <SelectItem key={link.id} value={link.url}>
                          <div className="flex flex-col">
                            <span className="font-medium">{link.label}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[300px]">{link.url}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Manual Input */}
                <Input
                  type="url"
                  placeholder="https://example.com/property-details"
                  value={state.qrCodeUrl}
                  onChange={(e) => setState(prev => ({ ...prev, qrCodeUrl: e.target.value }))}
                  className="bg-white dark:bg-gray-900"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {savedQRLinks.length > 0
                    ? 'Select from saved links above or type a custom URL'
                    : 'This URL will be encoded as a QR code in templates that support it'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Context Box - Dynamic based on post type */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <label className="font-medium text-sm">
              {contextConfig.label}
              <span className="text-red-500 ml-1">*</span>
            </label>
          </div>
          <Textarea
            placeholder={contextConfig.placeholder}
            value={state.context}
            onChange={(e) => setState(prev => ({ ...prev, context: e.target.value }))}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {contextConfig.helpText}
          </p>
        </CardContent>
      </Card>

      {/* Open House Date & Time Section */}
      {state.postType === 'property' && state.intent === 'open-house' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <label className="font-medium text-sm">
                Open House Date & Time
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
              <span className="text-muted-foreground text-sm">Open House on</span>

              {/* Open House Date Input */}
              <div className="relative" ref={openHouseDateDropdownRef}>
                <Input
                  type="text"
                  placeholder="Saturday, Jan 15"
                  value={state.openHouseDateInput}
                  onChange={(e) => {
                    setState(prev => ({ ...prev, openHouseDateInput: e.target.value }));
                    const suggestions = getDateSuggestions(e.target.value);
                    setOpenHouseDateSuggestions(suggestions);
                    setShowOpenHouseDateSuggestions(suggestions.length > 0);
                  }}
                  onFocus={() => {
                    const suggestions = getDateSuggestions(state.openHouseDateInput);
                    setOpenHouseDateSuggestions(suggestions);
                    setShowOpenHouseDateSuggestions(suggestions.length > 0);
                  }}
                  className="w-[180px] h-auto py-1.5 px-3"
                />
                {showOpenHouseDateSuggestions && openHouseDateSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-[240px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                    {openHouseDateSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setState(prev => ({
                            ...prev,
                            openHouseDate: suggestion.isoDate,
                            openHouseDateInput: suggestion.label,
                          }));
                          setShowOpenHouseDateSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors border-b last:border-b-0 border-gray-100 dark:border-gray-800"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-muted-foreground text-sm">from</span>

              {/* Start Time Input */}
              <div className="relative" ref={openHouseStartTimeDropdownRef}>
                <Input
                  type="text"
                  placeholder="2:00 PM"
                  value={state.openHouseStartTimeInput}
                  onChange={(e) => {
                    setState(prev => ({ ...prev, openHouseStartTimeInput: e.target.value }));
                    const suggestions = getTimeSuggestions(e.target.value);
                    setOpenHouseStartTimeSuggestions(suggestions);
                    setShowOpenHouseStartTimeSuggestions(suggestions.length > 0);
                  }}
                  onFocus={() => {
                    const suggestions = getTimeSuggestions(state.openHouseStartTimeInput);
                    setOpenHouseStartTimeSuggestions(suggestions);
                    setShowOpenHouseStartTimeSuggestions(suggestions.length > 0);
                  }}
                  className="w-[120px] h-auto py-1.5 px-3"
                />
                {showOpenHouseStartTimeSuggestions && openHouseStartTimeSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-[160px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                    {openHouseStartTimeSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setState(prev => ({
                            ...prev,
                            openHouseStartTime: suggestion.time24h,
                            openHouseStartTimeInput: suggestion.label,
                          }));
                          setShowOpenHouseStartTimeSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors border-b last:border-b-0 border-gray-100 dark:border-gray-800"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-muted-foreground text-sm">to</span>

              {/* End Time Input */}
              <div className="relative" ref={openHouseEndTimeDropdownRef}>
                <Input
                  type="text"
                  placeholder="4:00 PM"
                  value={state.openHouseEndTimeInput}
                  onChange={(e) => {
                    setState(prev => ({ ...prev, openHouseEndTimeInput: e.target.value }));
                    const suggestions = getTimeSuggestions(e.target.value);
                    setOpenHouseEndTimeSuggestions(suggestions);
                    setShowOpenHouseEndTimeSuggestions(suggestions.length > 0);
                  }}
                  onFocus={() => {
                    const suggestions = getTimeSuggestions(state.openHouseEndTimeInput);
                    setOpenHouseEndTimeSuggestions(suggestions);
                    setShowOpenHouseEndTimeSuggestions(suggestions.length > 0);
                  }}
                  className="w-[120px] h-auto py-1.5 px-3"
                />
                {showOpenHouseEndTimeSuggestions && openHouseEndTimeSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-[160px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                    {openHouseEndTimeSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setState(prev => ({
                            ...prev,
                            openHouseEndTime: suggestion.time24h,
                            openHouseEndTimeInput: suggestion.label,
                          }));
                          setShowOpenHouseEndTimeSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors border-b last:border-b-0 border-gray-100 dark:border-gray-800"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Preview Badge */}
            {state.openHouseDate && state.openHouseStartTime && state.openHouseEndTime && (
              <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Open House:
                </span>
                <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 font-semibold">
                  {state.openHouseDateInput} ● {state.openHouseStartTimeInput}-{state.openHouseEndTimeInput}
                </Badge>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              This will be included in your caption (e.g., "Saturday, Jan 15 ● 2-4 PM")
            </p>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      <div className="space-y-3">
        {/* Validation Feedback */}
        {!isValid && state.context.trim() === '' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">
              Please fill in the context/details field to continue
            </span>
          </div>
        )}
        {!isValid && state.postType === 'property' && !state.selectedProperty && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">
              Please select a property to continue
            </span>
          </div>
        )}
        {!isValid && selectedTemplate && userInputFields.some(({ key, config }) => config.inputConfig?.required && !state.templateUserInputs[key]?.trim()) && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">
              Please fill in all required template fields
            </span>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            size="lg"
            disabled={!isValid || isGenerating || connectedAccounts.length === 0}
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
      </div>

      {/* Summary Preview */}
      {state.intent && (state.postType !== 'property' || state.selectedProperty) && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">Preview:</p>
            <p className="text-sm">
              <span className="font-medium">{availableIntents.find(i => i.id === state.intent)?.icon}</span>{' '}
              <span className="font-medium">{availableIntents.find(i => i.id === state.intent)?.label}</span>{' '}
              post
              {state.selectedProperty && (
                <>
                  {' '}for{' '}
                  <span className="font-medium">{state.selectedProperty.address}, {state.selectedProperty.city}</span>
                </>
              )}
              {state.templateId && state.templateId !== 'none' && (
                <>
                  {' '}using{' '}
                  <span className="font-medium">
                    {availableTemplates.find(t => t.id === state.templateId)?.icon}{' '}
                    {availableTemplates.find(t => t.id === state.templateId)?.label}
                  </span>{' '}
                  template
                </>
              )}
              {state.scheduleDate && state.scheduleTime && (
                <>
                  {' '}scheduled for{' '}
                  <span className="font-medium">{state.dateInput} at {state.timeInput}</span>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
