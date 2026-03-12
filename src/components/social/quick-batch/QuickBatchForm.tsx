import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  ChevronDown,
  Check,
  Sparkles,
  Building2,
  Rocket,
  ArrowLeft,
  Eye,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  User,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Expand,
  Copy,
  Image as ImageIcon,
  MessageSquare,
  Hash,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperties, useSocialAccounts, useCreateSocialPost } from '@/services/ghlApi';
import { getTemplateById } from '@/lib/templates/profiles';
import {
  buildImejisPayload,
  resolveAllFields,
  preparePropertyForTemplate,
} from '@/lib/templates/fieldMapper';
import { renderImejisTemplate } from '@/services/imejis/api';
import { useCaptionGenerate } from '../create-wizard/hooks/useCaptionGenerate';
import { getDatePreview, parseDateTimeString } from '@/lib/utils/dateParser';
import { addHours, format } from 'date-fns';
import type { Property } from '@/types';
import { toast } from 'sonner';

// Import from socialHub module
import {
  type SocialTabId,
  type IntentId,
  type ToneId,
  type ImageTemplateId,
  type BatchItem,
  type BatchDefaults,
  TABS,
  INTENTS,
  TONES,
  getIntent,
  getDefaultTone,
  getPrimaryTemplate,
  getDefaultIntent,
  getIntentsByTab,
  BASE_HASHTAGS,
  PREFERRED_HASHTAGS,
  INTENT_HASHTAGS,
  generateLocationHashtags,
  PLATFORM_HASHTAG_RULES,
} from '@/lib/socialHub';

// Import pill-based editor component
import { BatchPostEditor } from './BatchPostEditor';

// Import activity logging
import { logBatchCreated, logBatchPublished, logCaptionGenerated, logImageGenerated } from '@/store/useActivityStore';

// Import agent utilities
import { getAgentById } from '@/lib/socialHub/agents';

// Interval options
const INTERVAL_OPTIONS = [
  { value: '0', label: 'No interval' },
  { value: '1', label: '1 hour' },
  { value: '2', label: '2 hours' },
  { value: '4', label: '4 hours' },
  { value: '6', label: '6 hours' },
  { value: '12', label: '12 hours' },
  { value: '24', label: '1 day' },
  { value: '48', label: '2 days' },
];

type FormStep = 'form' | 'generating' | 'preview';

// Initial defaults
const INITIAL_DEFAULTS: BatchDefaults = {
  tab: 'property',
  intentId: 'just-listed',
  toneId: 'urgent',
  templateId: 'just-listed',
  startTime: 'now',
  intervalHours: 2,
};

interface QuickBatchFormState {
  items: BatchItem[];
  defaults: BatchDefaults;
  selectedAccounts: string[];
  // Phase 3: No shared context - each item is independent
}

const INITIAL_STATE: QuickBatchFormState = {
  items: [],
  defaults: INITIAL_DEFAULTS,
  selectedAccounts: [],
};

// Generate unique ID
let batchItemCounter = 0;
function generateItemId(): string {
  return `batch-item-${Date.now()}-${++batchItemCounter}`;
}

// Generate default hashtags for an intent and optional property
function generateDefaultHashtags(intentId: IntentId, property?: Property): string[] {
  const hashtags: string[] = [];
  hashtags.push(...BASE_HASHTAGS);
  hashtags.push(...PREFERRED_HASHTAGS);
  const intentHashtags = INTENT_HASHTAGS[intentId] || [];
  hashtags.push(...intentHashtags);
  if (property) {
    const locationHashtags = generateLocationHashtags(property.city, property.state);
    hashtags.push(...locationHashtags);
  }
  // Return first 7 unique hashtags as default selection
  return [...new Set(hashtags)].slice(0, 7);
}

// Create a new batch item from a property (property tab)
function createPropertyBatchItem(
  property: Property,
  defaults: BatchDefaults,
  scheduledDate: string,
  scheduledTime: string
): BatchItem {
  return {
    id: generateItemId(),
    tab: 'property',
    propertyId: property.id,
    intentId: defaults.intentId,
    toneId: defaults.toneId,
    templateId: defaults.templateId,
    context: {},
    selectedHashtags: generateDefaultHashtags(defaults.intentId, property),
    scheduledDate,
    scheduledTime,
    hasCustomSchedule: false,
    status: 'draft', // Phase 3: Items start as draft until validated
  };
}

// Create a new batch item for non-property posts (personal/professional)
function createNonPropertyBatchItem(
  tab: SocialTabId,
  scheduledDate: string,
  scheduledTime: string
): BatchItem {
  const defaultIntent = getDefaultIntent(tab);
  return {
    id: generateItemId(),
    tab,
    intentId: defaultIntent.id,
    toneId: getDefaultTone(defaultIntent.id),
    templateId: getPrimaryTemplate(defaultIntent.id),
    context: {},
    selectedHashtags: generateDefaultHashtags(defaultIntent.id),
    scheduledDate,
    scheduledTime,
    hasCustomSchedule: false,
    status: 'draft', // Phase 3: Items start as draft until validated
  };
}

// Calculate scheduled date/time based on start time and interval
function calculateSchedule(
  startTime: string,
  intervalHours: number,
  index: number
): { date: string; time: string } {
  const parsed = parseDateTimeString(startTime);
  const startDate = parsed?.date || new Date();
  const scheduledDate = addHours(startDate, index * intervalHours);

  return {
    date: format(scheduledDate, 'yyyy-MM-dd'),
    time: format(scheduledDate, 'HH:mm'),
  };
}

export function QuickBatchForm() {
  const [state, setState] = useState<QuickBatchFormState>(INITIAL_STATE);
  const [step, setStep] = useState<FormStep>('form');
  const [propertySelectOpen, setPropertySelectOpen] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);

  // State for expanded post preview dialog
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  // Pill-based navigation: track active post being edited
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Use same location ID as Create tab to pull the same properties
  const { data: propertiesData } = useProperties('U4FANAMaB1gGddRaaD9x');
  const properties = propertiesData?.properties || [];

  const { data: accountsData } = useSocialAccounts();
  const connectedAccounts = accountsData?.accounts || [];

  const { generateCaption } = useCaptionGenerate();
  const createPost = useCreateSocialPost();

  // Map property IDs to property objects
  const propertyMap = useMemo(() => {
    const map: Record<string, Property> = {};
    properties.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [properties]);

  // Recalculate schedules for items without custom schedules
  const recalculateSchedules = useCallback(
    (items: BatchItem[], defaults: BatchDefaults): BatchItem[] => {
      let autoIndex = 0;
      return items.map((item) => {
        if (item.hasCustomSchedule) {
          return item;
        }
        const schedule = calculateSchedule(defaults.startTime, defaults.intervalHours, autoIndex);
        autoIndex++;
        return {
          ...item,
          scheduledDate: schedule.date,
          scheduledTime: schedule.time,
        };
      });
    },
    []
  );

  // Toggle property selection (adds/removes from batch items)
  const toggleProperty = useCallback(
    (property: Property) => {
      setState((prev) => {
        const existingIndex = prev.items.findIndex(
          (item) => item.tab === 'property' && item.propertyId === property.id
        );
        if (existingIndex >= 0) {
          // Remove
          const newItems = prev.items.filter(
            (item) => !(item.tab === 'property' && item.propertyId === property.id)
          );
          // If we removed the active item, select the first remaining or null
          const removedItem = prev.items[existingIndex];
          if (removedItem.id === activeItemId) {
            setActiveItemId(newItems.length > 0 ? newItems[0].id : null);
          }
          return {
            ...prev,
            items: recalculateSchedules(newItems, prev.defaults),
          };
        } else {
          // Add new item with defaults
          const schedule = calculateSchedule(
            prev.defaults.startTime,
            prev.defaults.intervalHours,
            prev.items.length
          );
          const newItem = createPropertyBatchItem(
            property,
            prev.defaults,
            schedule.date,
            schedule.time
          );
          // Auto-select the newly added item
          setActiveItemId(newItem.id);
          return {
            ...prev,
            items: [...prev.items, newItem],
          };
        }
      });
    },
    [recalculateSchedules, activeItemId]
  );

  // Add a non-property post (personal or professional)
  const addNonPropertyPost = useCallback(
    (tab: SocialTabId) => {
      setState((prev) => {
        const schedule = calculateSchedule(
          prev.defaults.startTime,
          prev.defaults.intervalHours,
          prev.items.length
        );
        const newItem = createNonPropertyBatchItem(tab, schedule.date, schedule.time);
        // Auto-select the newly added item
        setActiveItemId(newItem.id);
        return {
          ...prev,
          items: [...prev.items, newItem],
        };
      });
    },
    []
  );

  // Select all properties
  const handleSelectAll = useCallback(() => {
    setState((prev) => {
      const newItems = properties.map((p, index) => {
        const schedule = calculateSchedule(
          prev.defaults.startTime,
          prev.defaults.intervalHours,
          index
        );
        return createPropertyBatchItem(p, prev.defaults, schedule.date, schedule.time);
      });
      // Select first item
      if (newItems.length > 0) {
        setActiveItemId(newItems[0].id);
      }
      return {
        ...prev,
        items: newItems,
      };
    });
  }, [properties]);

  // Deselect all
  const handleDeselectAll = useCallback(() => {
    setActiveItemId(null);
    setState((prev) => ({
      ...prev,
      items: [],
    }));
  }, []);

  // Update a single batch item
  const updateItem = useCallback((itemId: string, updates: Partial<BatchItem>) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
    }));
  }, []);

  // Remove a single item
  const removeItem = useCallback(
    (itemId: string) => {
      setState((prev) => {
        const newItems = prev.items.filter((item) => item.id !== itemId);
        // If we removed the active item, select the first remaining or null
        if (itemId === activeItemId) {
          setActiveItemId(newItems.length > 0 ? newItems[0].id : null);
        }
        return {
          ...prev,
          items: recalculateSchedules(newItems, prev.defaults),
        };
      });
    },
    [recalculateSchedules, activeItemId]
  );

  // Update defaults and recalculate schedules
  const updateDefaults = useCallback(
    (updates: Partial<BatchDefaults>) => {
      setState((prev) => {
        const newDefaults = { ...prev.defaults, ...updates };
        return {
          ...prev,
          defaults: newDefaults,
          items: recalculateSchedules(prev.items, newDefaults),
        };
      });
    },
    [recalculateSchedules]
  );

  // Build context string for caption generation (per-item only, no shared context)
  const buildContextString = (item: BatchItem, property?: Property): string => {
    const parts: string[] = [];

    // Add intent-specific context fields (Phase 3: per-item only)
    const intent = getIntent(item.intentId);
    for (const field of intent.fields) {
      const value = item.context[field.key];
      if (value) {
        parts.push(`${field.label}: ${value}`);
      }
    }

    // Add property's social media description if available (from GHL custom field)
    // This is the "Tell us more" field that provides additional context for captions
    if (property?.socialMediaPropertyDescription) {
      parts.push(`Property Description: ${property.socialMediaPropertyDescription}`);
    }

    // Fallback property description (only for property posts)
    if (parts.length === 0 && property) {
      parts.push(`${property.beds} bed, ${property.baths} bath property in ${property.city}`);
    }

    return parts.join('\n');
  };

  // Check if an item has all required fields filled (for draft/pending detection)
  const isItemComplete = useCallback(
    (item: BatchItem): boolean => {
      const intent = getIntent(item.intentId);

      // Property tab requires a property
      if (intent.requiresProperty && !item.propertyId) {
        return false;
      }

      // Check required context fields
      for (const field of intent.fields) {
        if (field.required && !item.context[field.key]) {
          return false;
        }
      }

      return true;
    },
    []
  );

  // Get computed status for display (draft if incomplete, otherwise use item.status)
  const getDisplayStatus = useCallback(
    (item: BatchItem): 'draft' | 'pending' | 'generating' | 'ready' | 'failed' => {
      if (item.status === 'ready' || item.status === 'failed' || item.status === 'generating') {
        return item.status;
      }
      // For draft/pending, check if item is complete
      return isItemComplete(item) ? 'pending' : 'draft';
    },
    [isItemComplete]
  );

  // Get scheduled Date object from item
  const getScheduledAt = (item: BatchItem): Date | undefined => {
    if (!item.scheduledDate && !item.scheduledTime) return undefined;
    const dateStr = item.scheduledDate || format(new Date(), 'yyyy-MM-dd');
    const timeStr = item.scheduledTime || '09:00';
    return new Date(`${dateStr}T${timeStr}`);
  };

  // Generate content for all items
  const handleGenerate = async () => {
    if (state.items.length === 0) {
      toast.error('Please add at least one post');
      return;
    }

    setStep('generating');
    setGenerationProgress(0);

    const total = state.items.length;
    const updatedItems: BatchItem[] = [];

    for (let i = 0; i < total; i++) {
      const item = state.items[i];
      const property = item.propertyId ? propertyMap[item.propertyId] : undefined;

      // Check if property is required but missing
      const intent = getIntent(item.intentId);
      if (intent.requiresProperty && !property) {
        updatedItems.push({
          ...item,
          status: 'failed',
          error: 'Property required for this intent',
        });
        continue;
      }

      // Check for required context fields
      const missingFields: string[] = [];
      for (const field of intent.fields) {
        if (field.required && !item.context[field.key]?.trim()) {
          missingFields.push(field.label);
        }
      }
      if (missingFields.length > 0) {
        updatedItems.push({
          ...item,
          status: 'failed',
          error: `Missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}`,
        });
        continue;
      }

      setGenerationProgress(Math.round(((i + 0.5) / total) * 100));

      try {
        // Build context for this specific item
        const contextString = buildContextString(item, property);

        // Generate caption using the item's intent and tone
        const captionResult = await generateCaption({
          property: property || null,
          context: contextString,
          tone: item.toneId as any,
          platform: 'all',
          postIntent: item.intentId as any,
        });

        let imageUrl: string | null = null;
        let imagePrompt: string | Record<string, string> | undefined = undefined;

        // For Custom Image template with Professional intents, generate an AI image prompt
        const professionalIntentsWithImagePrompt = ['market-update', 'buyer-tips', 'seller-tips', 'investment-insight'];
        if (item.templateId === 'custom' && professionalIntentsWithImagePrompt.includes(item.intentId)) {
          try {
            const contentResponse = await fetch('/api/ai?action=generate-content', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                intent: item.intentId,
                templateId: 'custom',
                location: 'New Orleans, LA',
                topic: item.context.topic || item.context.headline || item.context.tipTitle,
              }),
            });
            if (contentResponse.ok) {
              const contentData = await contentResponse.json();
              if (contentData.success && contentData.content?.imagePrompt) {
                imagePrompt = contentData.content.imagePrompt;
              }
            }
          } catch (promptError) {
            console.warn('Failed to generate image prompt:', promptError);
            // Non-fatal - continue without image prompt
          }
        }

        // Generate image if template is not 'none' or 'custom'
        if (item.templateId !== 'none' && item.templateId !== 'custom') {
          // Map UI template IDs to profile IDs
          const templateToProfile: Record<string, string> = {
            'just-listed': 'just-listed',
            'just-sold': 'just-sold',
            'open-house': 'open-house',
            'price-drop': 'price-drop',
            'coming-soon': 'coming-soon',
            'value-tips': 'personal-value',
            'success-story': 'success-story',
          };
          const profileId = templateToProfile[item.templateId] || item.templateId;
          const template = getTemplateById(profileId);
          if (template) {
            // Get selected agent for template fields
            const selectedAgent = item.selectedAgentId ? getAgentById(item.selectedAgentId) : undefined;

            // Prepare property with user-selected images (if any)
            // For non-property posts (personal/professional), property may be null
            let propertyWithSelectedImages = null;
            if (property) {
              const preparedProperty = preparePropertyForTemplate(property);
              propertyWithSelectedImages = {
                ...preparedProperty,
                // Override hero image if user selected one
                heroImage: item.selectedHeroImage || preparedProperty.heroImage,
                // Override supporting images if user selected any
                images: item.selectedSupportingImages?.length
                  ? item.selectedSupportingImages
                  : preparedProperty.images,
              };
            }

            // Resolve fields with agent and selected images
            // Merge context fields with template-specific user inputs (e.g., Value Tips fields)
            const allUserInputs = {
              ...item.context,
              ...(item.templateUserInputs || {}),
            };
            const resolvedFields = resolveAllFields(template, propertyWithSelectedImages, allUserInputs, selectedAgent);
            const payload = buildImejisPayload(template, resolvedFields);
            const imageResult = await renderImejisTemplate(payload);

            if (imageResult.success && imageResult.imageUrl) {
              imageUrl = imageResult.imageUrl;
              // Log successful image generation
              logImageGenerated(
                template?.name || item.template || 'unknown',
                item.property?.propertyCode,
                item.property?.id
              );
            } else {
              // Log failed image generation
              logImageGenerated(
                template?.name || item.template || 'unknown',
                item.property?.propertyCode,
                item.property?.id,
                false,
                'Image render failed'
              );
            }
          }
        }

        // Log caption generation
        logCaptionGenerated(item.property?.propertyCode, item.property?.id, item.tone);

        updatedItems.push({
          ...item,
          caption: captionResult.caption,
          imageUrl,
          imagePrompt,
          status: 'ready',
        });
      } catch (error) {
        console.error(`Error generating post:`, error);
        updatedItems.push({
          ...item,
          status: 'failed',
          error: 'Generation failed',
        });
        // Log error
        logCaptionGenerated(item.property?.propertyCode, item.property?.id, item.tone, false);
      }

      setGenerationProgress(Math.round(((i + 1) / total) * 100));
    }

    // Auto-select first account if none selected
    if (state.selectedAccounts.length === 0 && connectedAccounts.length > 0) {
      setState((prev) => ({
        ...prev,
        items: updatedItems,
        selectedAccounts: [connectedAccounts[0].id],
      }));
    } else {
      setState((prev) => ({ ...prev, items: updatedItems }));
    }

    setStep('preview');
  };

  // Publish all posts
  const handlePublish = async () => {
    if (state.selectedAccounts.length === 0) {
      toast.error('Please select at least one account');
      return;
    }

    const readyItems = state.items.filter((item) => item.status === 'ready');
    if (readyItems.length === 0) {
      toast.error('No posts ready to publish');
      return;
    }

    setIsPublishing(true);
    setPublishProgress(0);

    let successCount = 0;

    for (let i = 0; i < readyItems.length; i++) {
      const item = readyItems[i];
      const scheduledAt = getScheduledAt(item);
      const isNow = !scheduledAt || scheduledAt <= new Date();

      setPublishProgress(Math.round(((i + 0.5) / readyItems.length) * 100));

      try {
        // Append hashtags to caption (use Facebook limit as default for batch)
        const maxHashtags = PLATFORM_HASHTAG_RULES.facebook?.maxHashtags || 5;
        const hashtagString = item.selectedHashtags.slice(0, maxHashtags).join(' ');
        const fullCaption = hashtagString
          ? `${item.caption || ''}\n\n${hashtagString}`
          : item.caption || '';

        await createPost.mutateAsync({
          accountIds: state.selectedAccounts,
          summary: fullCaption,
          media: item.imageUrl ? [{ url: item.imageUrl, type: 'image/png' }] : undefined,
          scheduleDate: isNow ? undefined : scheduledAt?.toISOString(),
          status: isNow ? 'published' : 'scheduled',
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to publish post:`, error);
      }

      setPublishProgress(Math.round(((i + 1) / readyItems.length) * 100));
    }

    setIsPublishing(false);
    toast.success(`${successCount} of ${readyItems.length} posts published!`);

    // Log batch published activity
    logBatchPublished(readyItems.length, successCount, readyItems.length - successCount);

    // Reset
    setState(INITIAL_STATE);
    setStep('form');
  };

  const toggleAccount = (accountId: string) => {
    setState((prev) => ({
      ...prev,
      selectedAccounts: prev.selectedAccounts.includes(accountId)
        ? prev.selectedAccounts.filter((id) => id !== accountId)
        : [...prev.selectedAccounts, accountId],
    }));
  };

  const isValid = useMemo(() => {
    if (state.items.length === 0) return false;
    // All items must be complete (no draft status)
    return state.items.every((item) => isItemComplete(item));
  }, [state.items, isItemComplete]);

  // Count items by status (using computed display status)
  const statusCounts = useMemo(() => {
    let draft = 0;
    let pending = 0;
    let ready = 0;
    let failed = 0;

    for (const item of state.items) {
      const status = getDisplayStatus(item);
      if (status === 'draft') draft++;
      else if (status === 'pending') pending++;
      else if (status === 'ready') ready++;
      else if (status === 'failed') failed++;
    }

    return { draft, pending, ready, failed, total: state.items.length };
  }, [state.items, getDisplayStatus]);

  // Legacy aliases for readyCount/failedCount
  const readyCount = statusCounts.ready;
  const failedCount = statusCounts.failed;
  const draftCount = statusCounts.draft;
  const propertyPostCount = state.items.filter((item) => item.tab === 'property').length;

  // STRICT POLICY: Batch is only schedulable when ALL items are ready
  const allItemsReady = statusCounts.ready === statusCounts.total && statusCounts.total > 0;
  const hasFailedItems = statusCounts.failed > 0;
  const hasDraftItems = statusCounts.draft > 0;

  // Retry failed items handler
  const handleRetryFailed = useCallback(async () => {
    const failedItems = state.items.filter((item) => getDisplayStatus(item) === 'failed');
    if (failedItems.length === 0) return;

    setStep('generating');
    setGenerationProgress(0);

    const updatedItems = [...state.items];
    let processedCount = 0;

    for (const failedItem of failedItems) {
      const itemIndex = updatedItems.findIndex((i) => i.id === failedItem.id);
      if (itemIndex === -1) continue;

      const property = failedItem.propertyId ? propertyMap[failedItem.propertyId] : undefined;
      const intent = getIntent(failedItem.intentId);

      setGenerationProgress(Math.round(((processedCount + 0.5) / failedItems.length) * 100));

      try {
        // Skip if property required but missing
        if (intent.requiresProperty && !property) {
          updatedItems[itemIndex] = {
            ...failedItem,
            status: 'failed',
            error: 'Property required for this intent',
          };
          processedCount++;
          continue;
        }

        const contextString = buildContextString(failedItem, property);
        const captionResult = await generateCaption({
          property: property || null,
          context: contextString,
          tone: failedItem.toneId as any,
          platform: 'all',
          postIntent: failedItem.intentId as any,
        });

        let imageUrl: string | null = null;
        if (failedItem.templateId !== 'none' && failedItem.templateId !== 'custom') {
          const template = getTemplateById(failedItem.templateId);
          if (template && property) {
            // Get selected agent for template fields
            const selectedAgent = failedItem.selectedAgentId ? getAgentById(failedItem.selectedAgentId) : undefined;

            // Prepare property with user-selected images
            const preparedProperty = preparePropertyForTemplate(property);
            const propertyWithSelectedImages = {
              ...preparedProperty,
              heroImage: failedItem.selectedHeroImage || preparedProperty.heroImage,
              images: failedItem.selectedSupportingImages?.length
                ? failedItem.selectedSupportingImages
                : preparedProperty.images,
            };

            const resolvedFields = resolveAllFields(template, propertyWithSelectedImages, failedItem.context, selectedAgent);
            const payload = buildImejisPayload(template, resolvedFields);
            const imageResult = await renderImejisTemplate(payload);
            if (imageResult.success && imageResult.imageUrl) {
              imageUrl = imageResult.imageUrl;
            }
          }
        }

        updatedItems[itemIndex] = {
          ...failedItem,
          caption: captionResult.caption,
          imageUrl,
          status: 'ready',
          error: undefined,
        };
      } catch (error) {
        console.error('Retry failed:', error);
        updatedItems[itemIndex] = {
          ...failedItem,
          status: 'failed',
          error: 'Retry failed',
        };
      }

      processedCount++;
      setGenerationProgress(Math.round((processedCount / failedItems.length) * 100));
    }

    setState((prev) => ({ ...prev, items: updatedItems }));
    setStep('preview');
  }, [state.items, propertyMap, generateCaption, getDisplayStatus, buildContextString]);

  // Get the active item for editing
  const activeItem = useMemo(() => {
    if (!activeItemId) return null;
    return state.items.find((item) => item.id === activeItemId) || null;
  }, [activeItemId, state.items]);

  // Get property for active item
  const activeProperty = useMemo(() => {
    if (!activeItem?.propertyId) return undefined;
    return propertyMap[activeItem.propertyId];
  }, [activeItem, propertyMap]);

  // Get current active item index
  const activeItemIndex = useMemo(() => {
    if (!activeItemId) return -1;
    return state.items.findIndex((item) => item.id === activeItemId);
  }, [activeItemId, state.items]);

  // Navigate to previous/next item
  const navigateToPrevious = useCallback(() => {
    if (activeItemIndex > 0) {
      setActiveItemId(state.items[activeItemIndex - 1].id);
    }
  }, [activeItemIndex, state.items]);

  const navigateToNext = useCallback(() => {
    if (activeItemIndex < state.items.length - 1) {
      setActiveItemId(state.items[activeItemIndex + 1].id);
    }
  }, [activeItemIndex, state.items]);

  // Get display label for a batch item (for pill)
  const getItemLabel = useCallback(
    (item: BatchItem): string => {
      if (item.tab === 'property' && item.propertyId) {
        const property = propertyMap[item.propertyId];
        if (property) {
          // Show street number + street name only (truncate if needed)
          const parts = property.address.split(' ');
          if (parts.length >= 2) {
            return `${parts[0]} ${parts[1]}`;
          }
          return property.address.substring(0, 15);
        }
        return 'Property';
      }
      const intent = getIntent(item.intentId);
      return intent.label;
    },
    [propertyMap]
  );

  // ============ GENERATING STEP ============
  if (step === 'generating') {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-primary/30">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Generating Content</h2>
            <p className="text-muted-foreground mb-4">
              Creating captions and images for {state.items.length} posts...
            </p>
            <Progress value={generationProgress} className="w-full max-w-md mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">{generationProgress}%</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ PREVIEW STEP ============
  if (step === 'preview') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setStep('form')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Edit
          </Button>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Review Batch ({state.items.length} posts)
            </h2>
            <p className="text-sm text-muted-foreground">
              {readyCount} ready, {failedCount} failed
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Post List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="max-h-[500px] overflow-y-auto space-y-3">
              {state.items.map((item, index) => {
                const property = item.propertyId ? propertyMap[item.propertyId] : undefined;
                const intent = getIntent(item.intentId);
                const scheduledAt = getScheduledAt(item);
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      'cursor-pointer transition-all hover:border-primary/30 hover:shadow-sm',
                      item.status === 'failed' && 'border-red-300 bg-red-50/50 dark:bg-red-950/20'
                    )}
                    onClick={() => setExpandedPostId(item.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Image */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              No img
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {property?.address || `${intent.label} Post`}
                            </span>
                            {item.status === 'ready' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : item.status === 'failed' ? (
                              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {intent.icon} {intent.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Click to expand</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.caption?.substring(0, 100)}...
                          </p>
                          {scheduledAt && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                              <Clock className="h-3 w-3" />
                              {scheduledAt.toLocaleString()}
                            </div>
                          )}
                        </div>

                        {/* Index + Expand Icon */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <Badge variant="secondary">
                            #{index + 1}
                          </Badge>
                          <Expand className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Right: Account Selection + Publish */}
          <div className="space-y-4">
            {/* Account Selection */}
            <Card>
              <CardContent className="p-4">
                <label className="font-medium text-sm mb-3 block">Post to</label>
                {connectedAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No social accounts connected.</p>
                ) : (
                  <div className="space-y-2">
                    {connectedAccounts.map((account) => (
                      <div
                        key={account.id}
                        onClick={() => toggleAccount(account.id)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                          state.selectedAccounts.includes(account.id)
                            ? 'border-primary bg-primary/10'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <div
                          className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center',
                            state.selectedAccounts.includes(account.id)
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground/30'
                          )}
                        >
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

            {/* Summary with Strict Policy */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">Batch Summary</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    {state.items.length} total posts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={allItemsReady ? 'text-green-500' : 'text-amber-500'}>
                      {allItemsReady ? '✓' : '○'}
                    </span>
                    {readyCount} posts ready
                  </li>
                  {failedCount > 0 && (
                    <li className="flex items-center gap-2">
                      <span className="text-red-500">✗</span>
                      {failedCount} posts failed
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <span
                      className={
                        state.selectedAccounts.length > 0 ? 'text-green-500' : 'text-red-500'
                      }
                    >
                      {state.selectedAccounts.length > 0 ? '✓' : '✗'}
                    </span>
                    {state.selectedAccounts.length} account(s) selected
                  </li>
                </ul>

                {/* STRICT POLICY: Show blockers */}
                {!allItemsReady && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">
                      Scheduling Blocked
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {failedCount > 0 && `${failedCount} failed post${failedCount > 1 ? 's' : ''} must be fixed. `}
                      {!allItemsReady && failedCount === 0 && 'All posts must be ready before scheduling.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Retry Failed Button */}
            {failedCount > 0 && !isPublishing && (
              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                onClick={handleRetryFailed}
              >
                <Loader2 className="h-4 w-4" />
                Retry {failedCount} Failed Post{failedCount > 1 ? 's' : ''}
              </Button>
            )}

            {/* Publish Button - STRICT POLICY: Only enabled when ALL items ready */}
            {isPublishing ? (
              <div className="space-y-2">
                <Progress value={publishProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  Publishing... {publishProgress}%
                </p>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!allItemsReady || state.selectedAccounts.length === 0}
                onClick={handlePublish}
              >
                <Rocket className="h-4 w-4" />
                {allItemsReady ? `Publish ${readyCount} Posts` : 'Fix All Posts to Publish'}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded Post Dialog */}
        <Dialog open={!!expandedPostId} onOpenChange={(open) => !open && setExpandedPostId(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {expandedPostId && (() => {
              const item = state.items.find(i => i.id === expandedPostId);
              if (!item) return null;
              const property = item.propertyId ? propertyMap[item.propertyId] : undefined;
              const intent = getIntent(item.intentId);
              const scheduledAt = getScheduledAt(item);
              const postIndex = state.items.findIndex(i => i.id === expandedPostId);

              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Badge variant="secondary">#{postIndex + 1}</Badge>
                      {intent.icon} {property?.address || `${intent.label} Post`}
                      {item.status === 'ready' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : item.status === 'failed' ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : null}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 mt-4">
                    {/* Image Preview */}
                    {item.imageUrl && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                          Image
                        </div>
                        <div className="rounded-lg overflow-hidden border bg-muted">
                          <img
                            src={item.imageUrl}
                            alt="Post preview"
                            className="w-full max-h-[300px] object-contain"
                          />
                        </div>
                      </div>
                    )}

                    {/* Caption */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <MessageSquare className="h-4 w-4" />
                          Caption
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1"
                          onClick={() => {
                            if (item.caption) {
                              navigator.clipboard.writeText(item.caption);
                            }
                          }}
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </Button>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 border text-sm whitespace-pre-wrap">
                        {item.caption || <span className="text-muted-foreground italic">No caption</span>}
                      </div>
                    </div>

                    {/* Hashtags */}
                    {item.hashtags && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Hash className="h-4 w-4" />
                          Hashtags
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50 border text-sm text-primary">
                          {item.hashtags}
                        </div>
                      </div>
                    )}

                    {/* Schedule */}
                    {scheduledAt && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Scheduled For
                        </div>
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                          {scheduledAt.toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </div>
                    )}

                    {/* Post Type Info */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Badge variant="outline">{intent.icon} {intent.label}</Badge>
                      {property && (
                        <Badge variant="secondary" className="gap-1">
                          <Building2 className="h-3 w-3" />
                          {property.city}, {property.state}
                        </Badge>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ============ FORM STEP ============
  return (
    <div className="space-y-6">
      {/* Defaults Card - Compact */}
      <Card className="border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Start</span>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="now"
                  value={state.defaults.startTime}
                  onChange={(e) => updateDefaults({ startTime: e.target.value })}
                  className="w-[140px] h-8 text-sm text-center"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Interval</span>
              <Select
                value={String(state.defaults.intervalHours)}
                onValueChange={(v) => updateDefaults({ intervalHours: parseInt(v, 10) })}
              >
                <SelectTrigger className="w-[110px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {state.defaults.startTime && getDatePreview(state.defaults.startTime) && (
              <span className="text-xs text-primary">
                {getDatePreview(state.defaults.startTime)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pill Bar - Horizontal scrolling list of posts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">Posts</h3>
            <Badge variant="secondary">{state.items.length}</Badge>
          </div>
          <div className="flex gap-2">
            {/* Add Property Posts */}
            <Popover open={propertySelectOpen} onOpenChange={setPropertySelectOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8">
                  <Building2 className="h-3.5 w-3.5" />
                  <Plus className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="end">
                <Command>
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <CommandInput placeholder="Search properties..." className="border-0" />
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                        All
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                        None
                      </Button>
                    </div>
                  </div>
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>No properties found.</CommandEmpty>
                    <CommandGroup>
                      {properties.map((property) => {
                        const isSelected = state.items.some(
                          (item) => item.tab === 'property' && item.propertyId === property.id
                        );
                        return (
                          <CommandItem
                            key={property.id}
                            value={`${property.address} ${property.city}`}
                            onSelect={() => toggleProperty(property)}
                          >
                            <div
                              className={cn(
                                'w-4 h-4 mr-2 rounded border flex items-center justify-center',
                                isSelected
                                  ? 'bg-primary border-primary'
                                  : 'border-muted-foreground/30'
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{property.address}</p>
                              <p className="text-xs text-muted-foreground">
                                {property.city}, {property.state}
                              </p>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Add Personal Post */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8"
              onClick={() => addNonPropertyPost('personal')}
            >
              <User className="h-3.5 w-3.5" />
              <Plus className="h-3 w-3" />
            </Button>

            {/* Add Professional Post */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8"
              onClick={() => addNonPropertyPost('professional')}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Pill Navigation Bar */}
        {state.items.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={navigateToPrevious}
              disabled={activeItemIndex <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Pills with status indicators */}
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-2 pb-1">
                {state.items.map((item, index) => {
                  const isActive = item.id === activeItemId;
                  const displayStatus = getDisplayStatus(item);
                  const tabIcon =
                    item.tab === 'property' ? (
                      <Building2 className="h-3 w-3" />
                    ) : item.tab === 'personal' ? (
                      <User className="h-3 w-3" />
                    ) : (
                      <Briefcase className="h-3 w-3" />
                    );

                  // Status-based styling
                  const statusStyles = {
                    draft: 'border-amber-300 dark:border-amber-700',
                    pending: 'border-muted',
                    ready: 'border-green-300 dark:border-green-700',
                    failed: 'border-red-300 dark:border-red-700',
                    generating: 'border-blue-300 dark:border-blue-700',
                  };

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveItemId(item.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm whitespace-nowrap transition-all',
                        isActive
                          ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                          : cn('hover:bg-muted/50 text-muted-foreground hover:text-foreground', statusStyles[displayStatus])
                      )}
                    >
                      {tabIcon}
                      <span className="font-medium">{getItemLabel(item)}</span>
                      {/* Status indicator */}
                      {displayStatus === 'draft' && (
                        <span className="w-2 h-2 rounded-full bg-amber-400" title="Draft - incomplete fields" />
                      )}
                      {displayStatus === 'pending' && (
                        <span className="w-2 h-2 rounded-full bg-gray-400" title="Pending generation" />
                      )}
                      {displayStatus === 'ready' && (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      )}
                      {displayStatus === 'failed' && (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      )}
                      {displayStatus === 'generating' && (
                        <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.id);
                        }}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Next Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={navigateToNext}
              disabled={activeItemIndex >= state.items.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Empty State */}
        {state.items.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Add property posts or create personal/professional content
              </p>
            </CardContent>
          </Card>
        )}

        {/* Active Item Editor - Single Create Experience */}
        {activeItem && (
          <Card className="border-2 border-primary/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {activeItemIndex + 1} / {state.items.length}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Editing: <span className="font-medium text-foreground">{getItemLabel(activeItem)}</span>
                  </span>
                </div>
                {activeItem.hasCustomSchedule && (
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Custom Schedule
                  </Badge>
                )}
              </div>

              {/* BatchPostEditor - Same Create experience */}
              <BatchPostEditor
                item={activeItem}
                property={activeProperty}
                onChange={(updates) => updateItem(activeItem.id, updates)}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Phase 3: Shared context removed - each item has independent context */}

      {/* Status Summary */}
      {state.items.length > 0 && (draftCount > 0 || failedCount > 0) && (
        <div className="flex items-center gap-4 text-sm">
          {draftCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {draftCount} draft
            </span>
          )}
          {failedCount > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <AlertCircle className="h-3 w-3" />
              {failedCount} failed
            </span>
          )}
          {readyCount > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              {readyCount} ready
            </span>
          )}
        </div>
      )}

      {/* Generate Button */}
      <div className="flex flex-col gap-2">
        {/* Warning if there are draft posts */}
        {draftCount > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>{draftCount} post{draftCount > 1 ? 's' : ''}</strong> {draftCount > 1 ? 'have' : 'has'} missing required fields.
              Fill in the required fields marked with <span className="text-red-500">*</span> before generating.
            </p>
          </div>
        )}
        <div className="flex items-center justify-between">
          {state.items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
          <Button
            size="lg"
            disabled={!isValid}
            onClick={handleGenerate}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 ml-auto"
          >
            <Sparkles className="h-4 w-4" />
            {isValid ? `Generate ${state.items.length} Posts` : 'Fill Required Fields'}
          </Button>
        </div>
      </div>
    </div>
  );
}
