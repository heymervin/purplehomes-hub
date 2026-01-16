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
  Rocket,
  RefreshCw,
  Edit2,
  User,
  Briefcase,
  Calendar,
  MessageSquare,
  Hash,
  Plus,
  QrCode,
  Link,
  Copy,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperties, useSocialAccounts, useCreateSocialPost, useUploadMedia } from '@/services/ghlApi';
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
  BASE_HASHTAGS,
  PREFERRED_HASHTAGS,
  INTENT_HASHTAGS,
  generateLocationHashtags,
  PLATFORM_HASHTAG_RULES,
} from '@/lib/socialHub';
import { TEAM_AGENTS, getAgentById } from '@/lib/socialHub/agents';
import VoiceInput from '../create-wizard/components/VoiceInput';

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

  // Agent selection (for property posts)
  selectedAgentId: string;

  // Hero image selection
  selectedHeroImage: string | null;

  // Intent context fields (dynamic based on intent)
  context: Record<string, string>;

  // Property-specific AI context (for property tab)
  propertyContext: string;

  // Personal-specific AI context (for personal tab - thinking out loud ideas)
  personalContext: string;

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

  // Hashtags
  selectedHashtags: string[];

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
    selectedAgentId: 'krista',
    selectedHeroImage: null,
    context: {},
    propertyContext: '',
    personalContext: '',

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
    selectedHashtags: [],
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

  // Content generation state (for Professional tab)
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState<string | Record<string, string> | null>(null);

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
  const uploadMedia = useUploadMedia();

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

  // Custom hashtag input state
  const [customHashtag, setCustomHashtag] = useState('');

  // Generate suggested hashtags based on intent and property
  const suggestedHashtags = useMemo(() => {
    const hashtags: string[] = [];
    hashtags.push(...BASE_HASHTAGS);
    hashtags.push(...PREFERRED_HASHTAGS);
    const intentHashtags = INTENT_HASHTAGS[state.intentId] || [];
    hashtags.push(...intentHashtags);
    if (state.selectedProperty) {
      const locationHashtags = generateLocationHashtags(state.selectedProperty.city, state.selectedProperty.state);
      hashtags.push(...locationHashtags);
    }
    return [...new Set(hashtags)];
  }, [state.intentId, state.selectedProperty]);

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

  // Auto-fill property context when property is selected
  useEffect(() => {
    if (state.selectedProperty) {
      const prop = state.selectedProperty;

      // Auto-fill propertyContext from socialMediaPropertyDescription or build from property details
      if (prop.socialMediaPropertyDescription) {
        setState(prev => ({
          ...prev,
          propertyContext: prop.socialMediaPropertyDescription || '',
        }));
      } else if (!state.propertyContext) {
        // Build default context from property details
        const parts = [];
        if (prop.beds) parts.push(`${prop.beds} bed`);
        if (prop.baths) parts.push(`${prop.baths} bath`);
        if (prop.sqft) parts.push(`${prop.sqft.toLocaleString()} sqft`);
        if (prop.price) parts.push(`$${prop.price.toLocaleString()}`);

        const autoContext = parts.join(' | ');
        if (autoContext) {
          setState(prev => ({
            ...prev,
            propertyContext: autoContext,
          }));
        }
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

  // Hashtag handlers
  const toggleHashtag = (hashtag: string) => {
    setState(prev => {
      const isSelected = prev.selectedHashtags.includes(hashtag);
      return {
        ...prev,
        selectedHashtags: isSelected
          ? prev.selectedHashtags.filter(h => h !== hashtag)
          : [...prev.selectedHashtags, hashtag],
      };
    });
  };

  const handleAddCustomHashtag = () => {
    if (!customHashtag.trim()) return;
    let formatted = customHashtag.trim();
    if (!formatted.startsWith('#')) formatted = `#${formatted}`;
    formatted = formatted.replace(/\s+/g, '');
    if (!state.selectedHashtags.includes(formatted)) {
      setState(prev => ({
        ...prev,
        selectedHashtags: [...prev.selectedHashtags, formatted],
      }));
    }
    setCustomHashtag('');
  };

  // ============ GENERATION & PUBLISHING ============

  // Generate content from AI (for Professional tab - auto-fills fields)
  const handleGenerateContent = async () => {
    setIsGeneratingContent(true);
    setGeneratedImagePrompt(null); // Clear previous prompt

    try {
      const response = await fetch('/api/ai?action=generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: state.intentId,
          templateId: state.templateId, // Pass template to generate appropriate fields
          location: 'New Orleans, LA', // Could be made configurable
          topic: state.context.topic || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();

      if (data.success && data.content?.fields) {
        const fields = data.content.fields;

        // Separate template-specific fields (for Value Tips) from context fields
        const templateFields: Record<string, string> = {};
        const contextFields: Record<string, string> = {};

        // Template field keys for Value Tips
        const templateFieldKeys = ['tipHeader', 'tip1Header', 'tip1Body', 'tip2Header', 'tip2Body', 'tip3Header', 'tip3Body'];

        for (const [key, value] of Object.entries(fields)) {
          if (templateFieldKeys.includes(key)) {
            templateFields[key] = value as string;
          } else {
            contextFields[key] = value as string;
          }
        }

        // Update state with both context and template fields
        setState(prev => ({
          ...prev,
          context: {
            ...prev.context,
            ...contextFields,
          },
          templateUserInputs: {
            ...prev.templateUserInputs,
            ...templateFields,
          },
        }));

        // Store image prompt if provided
        if (data.content.imagePrompt) {
          setGeneratedImagePrompt(data.content.imagePrompt);
        }

        toast.success('Content generated! Review and edit as needed.');
      } else {
        throw new Error(data.error || 'Failed to generate content');
      }
    } catch (error) {
      console.error('Generate content error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate content');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // Copy image prompt to clipboard
  const handleCopyImagePrompt = async (promptKey?: string) => {
    if (!generatedImagePrompt) return;

    let textToCopy: string;

    if (typeof generatedImagePrompt === 'string') {
      textToCopy = generatedImagePrompt;
    } else if (promptKey && generatedImagePrompt[promptKey]) {
      textToCopy = generatedImagePrompt[promptKey];
    } else {
      // Copy all prompts formatted
      textToCopy = Object.entries(generatedImagePrompt)
        .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
        .join('\n\n');
    }

    await navigator.clipboard.writeText(textToCopy);
    toast.success('Image prompt copied to clipboard!');
  };

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      // Build context string based on tab type
      let contextString = '';

      if (state.tab === 'property') {
        // For property tab, use the propertyContext field (which includes social media description)
        if (state.propertyContext.trim()) {
          contextString = state.propertyContext;
        }

        // Add open house info if applicable
        if (state.intentId === 'open-house' && state.openHouseDate && state.openHouseStartTime && state.openHouseEndTime) {
          const openHouseInfo = `\n\nOpen House: ${state.openHouseDateInput} from ${state.openHouseStartTimeInput} to ${state.openHouseEndTimeInput}`;
          contextString += openHouseInfo;
        }
      } else if (state.tab === 'personal') {
        // For Personal tab, use the personalContext field (voice/typed ideas)
        if (state.personalContext.trim()) {
          contextString = state.personalContext;
        }
        // Also include any intent context fields
        const intentContext = Object.entries(state.context)
          .filter(([, value]) => value.trim())
          .map(([key, value]) => {
            const field = currentIntent.fields.find(f => f.key === key);
            return field ? `${field.label}: ${value}` : value;
          })
          .join('\n');
        if (intentContext) {
          contextString = contextString ? `${contextString}\n\n${intentContext}` : intentContext;
        }
      } else {
        // For Professional tab, use intent context fields
        contextString = Object.entries(state.context)
          .filter(([, value]) => value.trim())
          .map(([key, value]) => {
            const field = currentIntent.fields.find(f => f.key === key);
            return field ? `${field.label}: ${value}` : value;
          })
          .join('\n');
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
      // DOMAIN ISOLATION: Only generate Imejis templates for Property tab
      // Personal/Professional tabs should ONLY use custom images or text-only (none)
      const isPropertyDomain = state.tab === 'property';
      const shouldGenerateImejisTemplate =
        selectedTemplate &&
        state.templateId !== 'custom' &&
        state.templateId !== 'none' &&
        isPropertyDomain; // <-- CRITICAL: Only for Property domain

      if (shouldGenerateImejisTemplate) {
        // Get selected agent for template fields
        const selectedAgent = getAgentById(state.selectedAgentId);

        // Prepare property with user-selected images
        const baseProperty = state.selectedProperty
          ? preparePropertyForTemplate(state.selectedProperty)
          : null;

        // Override hero image and supporting images if user selected them
        const preparedProperty = baseProperty ? {
          ...baseProperty,
          heroImage: state.selectedHeroImage || baseProperty.heroImage,
          images: state.selectedSupportingImages.length > 0
            ? state.selectedSupportingImages
            : baseProperty.images,
        } : null;

        const enhancedUserInputs = {
          ...state.templateUserInputs,
          ...(state.qrCodeUrl && {
            qrcode_comp: state.qrCodeUrl,
          }),
        };

        // Pass agent to resolveAllFields for agent name, phone, email, headshot
        const resolvedFields = resolveAllFields(selectedTemplate, preparedProperty, enhancedUserInputs, selectedAgent);
        const payload = buildImejisPayload(selectedTemplate, resolvedFields);

        const imageResult = await renderImejisTemplate(payload);

        if (imageResult.success && imageResult.imageUrl) {
          setState(prev => ({
            ...prev,
            generatedImageUrl: imageResult.imageUrl!,
            generatedImageBlob: imageResult.imageBlob || null,
          }));
        }
      } else if (state.templateId === 'none') {
        // Text Only - clear any existing generated image
        setState(prev => ({
          ...prev,
          generatedImageUrl: null,
          generatedImageBlob: null,
        }));
      }
      // For 'custom' template, the customImagePreview is already set from file upload

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
      const isNow = !state.scheduleDate && !state.scheduleTime;
      let scheduleDate: string | undefined;

      if (!isNow && state.scheduleDate && state.scheduleTime) {
        const combined = combineDateAndTime(state.scheduleDate, state.scheduleTime);
        scheduleDate = combined.toISOString();
      }

      // Handle image upload - blob URLs need to be uploaded to GHL first
      let mediaUrl: string | undefined;

      if (state.generatedImageBlob) {
        // Upload Imejis-generated blob to GHL media
        const file = new File([state.generatedImageBlob], `social-post-${Date.now()}.png`, {
          type: 'image/png',
        });
        const uploadResult = await uploadMedia.mutateAsync({
          file,
          name: `social-post-${Date.now()}.png`,
        });
        mediaUrl = uploadResult.url;
      } else if (state.customImagePreview?.startsWith('http')) {
        // Already a valid HTTP URL (not a blob)
        mediaUrl = state.customImagePreview;
      } else if (state.generatedImageUrl?.startsWith('http')) {
        // Already a valid HTTP URL (not a blob)
        mediaUrl = state.generatedImageUrl;
      }

      // Append hashtags to caption (use Facebook limit as default)
      const maxHashtags = PLATFORM_HASHTAG_RULES.facebook?.maxHashtags || 5;
      const hashtagString = state.selectedHashtags.slice(0, maxHashtags).join(' ');
      const fullCaption = hashtagString
        ? `${state.generatedCaption}\n\n${hashtagString}`
        : state.generatedCaption;

      await createPost.mutateAsync({
        accountIds: state.selectedAccounts,
        summary: fullCaption,
        media: mediaUrl ? [{ url: mediaUrl, type: 'image/png' }] : undefined,
        scheduleDate,
        status: isNow ? 'published' : 'scheduled',
      });

      toast.success('Post published successfully!');
      setState(getInitialState());
      setStep('form');
    } catch (error) {
      console.error('Publish error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to publish post: ${errorMessage}`);
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
    // Property tab uses "Context for AI" instead of intent fields
    if (state.tab === 'property') return null;
    if (currentIntent.fields.length === 0) return null;

    // Check if this intent supports content generation (Professional tab intents only)
    const supportsContentGen = ['market-update', 'buyer-tips', 'seller-tips', 'investment-insight'].includes(state.intentId);

    return (
      <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="font-medium text-sm">Tell us more</span>
            <span className="text-xs text-muted-foreground">
              These details generate your hook + talking points
            </span>
          </div>
          {supportsContentGen && state.tab === 'professional' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateContent}
              disabled={isGeneratingContent}
              className="gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
            >
              {isGeneratingContent ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Content
                </>
              )}
            </Button>
          )}
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

        {/* Image Prompt Section - shown after content generation */}
        {generatedImagePrompt && state.tab === 'professional' && (
          <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-sm text-purple-700 dark:text-purple-300">
                  {typeof generatedImagePrompt === 'string' ? 'Image Prompt for AI' : 'Image Prompts for AI'}
                </span>
              </div>
              {typeof generatedImagePrompt === 'string' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyImagePrompt()}
                  className="h-7 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy
                </Button>
              )}
            </div>

            {typeof generatedImagePrompt === 'string' ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {generatedImagePrompt}
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(generatedImagePrompt).map(([key, prompt]) => (
                  <div key={key} className="p-2 rounded bg-white/50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase">
                        {key === 'tip1' ? 'Tip 1 Image' : key === 'tip2' ? 'Tip 2 Image' : 'Tip 3 Image'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyImagePrompt(key)}
                        className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {prompt}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2 italic">
              Use these prompts in ChatGPT, Gemini, Midjourney, or DALL-E to generate matching images
            </p>
          </div>
        )}
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
              <div className="relative mx-auto">
                <img
                  src={state.generatedImageUrl || state.customImagePreview || ''}
                  alt="Generated post"
                  className="w-full max-w-lg h-auto border rounded-lg shadow-sm mx-auto"
                />
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Preview – final layout may vary slightly
                </p>
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

                  {/* Agent Selector */}
                  <span className="text-muted-foreground">as</span>
                  <Select
                    value={state.selectedAgentId}
                    onValueChange={(value) => setState(prev => ({ ...prev, selectedAgentId: value }))}
                  >
                    <SelectTrigger className="w-auto h-auto py-1.5 px-3 border-purple-300 bg-purple-50 dark:bg-purple-950/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_AGENTS.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <span className="font-medium">{agent.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            {/* Agent Contact Info (Read-only, shown when property tab selected) */}
            {state.tab === 'property' && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground pl-1">
                {(() => {
                  const agent = getAgentById(state.selectedAgentId) || TEAM_AGENTS[0];
                  return (
                    <>
                      <span>{agent.phone}</span>
                      <span>•</span>
                      <span>{agent.email}</span>
                    </>
                  );
                })()}
              </div>
            )}

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

            {/* Context for AI - Property Tab Only */}
            {state.tab === 'property' && (
              <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                    Context for AI
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Type, paste, or use voice to describe the property. AI will use this to generate your caption.
                </p>
                <div className="flex gap-2">
                  <VoiceInput
                    onTranscript={(text) => {
                      setState(prev => ({
                        ...prev,
                        propertyContext: prev.propertyContext ? `${prev.propertyContext} ${text}` : text,
                      }));
                    }}
                  />
                  <Textarea
                    placeholder="E.g., '3bed/2bath, new kitchen, granite counters, near top schools, owner financing available, ~$1,500/mo'"
                    value={state.propertyContext}
                    onChange={(e) => setState(prev => ({ ...prev, propertyContext: e.target.value }))}
                    rows={2}
                    className="flex-1 resize-none text-sm"
                  />
                </div>
                {state.selectedProperty?.socialMediaPropertyDescription && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Auto-filled from property details. Edit if needed.
                  </p>
                )}
              </div>
            )}

            {/* Context for AI - Personal Tab Only */}
            {state.tab === 'personal' && (
              <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/20 dark:to-teal-950/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="font-semibold text-sm text-green-900 dark:text-green-100">
                    Your Idea
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Think out loud! Type or use voice to describe your idea. AI will help shape it into a great post.
                </p>
                <div className="flex gap-2">
                  <VoiceInput
                    onTranscript={(text) => {
                      setState(prev => ({
                        ...prev,
                        personalContext: prev.personalContext ? `${prev.personalContext} ${text}` : text,
                      }));
                    }}
                  />
                  <Textarea
                    placeholder="E.g., 'Just helped a first-time buyer close on their dream home, feeling grateful, want to share the excitement and maybe some tips for others...'"
                    value={state.personalContext}
                    onChange={(e) => setState(prev => ({ ...prev, personalContext: e.target.value }))}
                    rows={2}
                    className="flex-1 resize-none text-sm"
                  />
                </div>
              </div>
            )}

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

            {/* Hero Image Selection (for property posts with images) */}
            {state.tab === 'property' && state.selectedProperty && (state.selectedProperty.heroImage || (state.selectedProperty.images && state.selectedProperty.images.length > 0)) && (
              <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-sm">Hero Image</span>
                  <span className="text-xs text-muted-foreground">Select main image for template</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    ...(state.selectedProperty.heroImage ? [state.selectedProperty.heroImage] : []),
                    ...(state.selectedProperty.images || []),
                  ]
                    .filter((img, idx, arr) => arr.indexOf(img) === idx)
                    .slice(0, 8)
                    .map((img, idx) => {
                      const isSelected = (state.selectedHeroImage || state.selectedProperty?.heroImage) === img;
                      return (
                        <button
                          key={`hero-${img}-${idx}`}
                          type="button"
                          onClick={() => setState(prev => ({ ...prev, selectedHeroImage: img }))}
                          className={cn(
                            "relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all",
                            isSelected
                              ? "border-amber-500 ring-2 ring-amber-500/20"
                              : "border-transparent hover:border-muted-foreground/50"
                          )}
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-amber-600 text-white rounded-full p-0.5">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Supporting Images Selection - Show for templates that support them */}
            {state.tab === 'property' &&
              selectedTemplate?.supportingImageCount &&
              selectedTemplate.supportingImageCount > 0 &&
              state.selectedProperty?.images &&
              state.selectedProperty.images.length > 0 &&
              (() => {
                const maxImages = selectedTemplate.supportingImageCount;
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
                        Select up to {maxImages}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {selectedTemplate.name} template displays {maxImages} additional property image{maxImages > 1 ? 's' : ''}
                    </p>

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

                    {/* Grid layout matching Hero Images */}
                    <div className="grid grid-cols-4 gap-3">
                      {supportingImagesOnly.slice(0, 8).map((imageUrl, idx) => {
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
                              } else if (state.selectedSupportingImages.length < maxImages) {
                                setState((prev) => ({
                                  ...prev,
                                  selectedSupportingImages: [...prev.selectedSupportingImages, imageUrl],
                                }));
                              } else {
                                toast.error(`Maximum ${maxImages} supporting images allowed for ${selectedTemplate.name}`);
                              }
                            }}
                            className={cn(
                              'relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all',
                              isSelected
                                ? 'border-purple-500 ring-2 ring-purple-300 dark:ring-purple-700'
                                : 'border-purple-200 dark:border-purple-700 hover:border-purple-400'
                            )}
                          >
                            <img
                              src={imageUrl}
                              alt={`Supporting ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                <div className="bg-purple-600 text-white text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center">
                                  #{selectedIndex + 1}
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-xs text-center text-muted-foreground mt-2">
                      Click images to select (hero image is already included)
                    </div>
                  </div>
                );
              })()}

            {/* QR Code URL Section - for templates that support qrcode_comp */}
            {state.tab === 'property' && selectedTemplate && state.templateId !== 'custom' && state.templateId !== 'none' && (
              <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/20 dark:to-indigo-950/20 border border-sky-200 dark:border-sky-800">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <span className="font-semibold text-sm text-sky-900 dark:text-sky-100">
                    QR Code Link
                  </span>
                  <Badge variant="secondary" className="text-xs">Optional</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Add a URL to generate a QR code on the template image. Great for property links or landing pages.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="url"
                      placeholder="https://purplehomessolutions.com/property/..."
                      value={state.qrCodeUrl}
                      onChange={(e) => setState(prev => ({ ...prev, qrCodeUrl: e.target.value }))}
                      className="pl-10 h-9 text-sm"
                    />
                  </div>
                  {state.qrCodeUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setState(prev => ({ ...prev, qrCodeUrl: '' }))}
                      className="h-9 px-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {state.qrCodeUrl && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-sky-700 dark:text-sky-300">
                    <Check className="h-3 w-3" />
                    <span>QR code will be added to template</span>
                  </div>
                )}
              </div>
            )}

            {/* Hashtags Section */}
            <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="font-semibold text-sm text-green-900 dark:text-green-100">
                    Hashtags
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {state.selectedHashtags.length} selected
                </Badge>
              </div>

              {/* Suggested Hashtags */}
              <div className="flex flex-wrap gap-2 mb-3">
                {suggestedHashtags.map((hashtag) => {
                  const isSelected = state.selectedHashtags.includes(hashtag);
                  return (
                    <Badge
                      key={hashtag}
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-all text-xs py-1 px-2',
                        isSelected && 'bg-green-600 hover:bg-green-700'
                      )}
                      onClick={() => toggleHashtag(hashtag)}
                    >
                      {hashtag}
                    </Badge>
                  );
                })}
              </div>

              {/* Custom hashtag input */}
              <div className="flex gap-2">
                <Input
                  value={customHashtag}
                  onChange={(e) => setCustomHashtag(e.target.value)}
                  placeholder="#CustomHashtag"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomHashtag()}
                  className="flex-1 h-8 text-sm"
                />
                <Button onClick={handleAddCustomHashtag} variant="outline" size="sm" className="h-8">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {/* Selected custom hashtags (not in suggestions) */}
              {state.selectedHashtags.filter(h => !suggestedHashtags.includes(h)).length > 0 && (
                <div className="mt-3">
                  <label className="text-xs text-muted-foreground mb-1.5 block">Custom</label>
                  <div className="flex flex-wrap gap-2">
                    {state.selectedHashtags
                      .filter(h => !suggestedHashtags.includes(h))
                      .map((hashtag) => (
                        <Badge
                          key={hashtag}
                          variant="default"
                          className="bg-green-600 hover:bg-green-700 cursor-pointer text-xs py-1 px-2"
                          onClick={() => toggleHashtag(hashtag)}
                        >
                          {hashtag}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>

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
