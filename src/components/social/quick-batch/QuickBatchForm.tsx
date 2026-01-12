import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
  Loader2, ChevronDown, Check, Sparkles, Building2, Rocket,
  ArrowLeft, Eye, Clock, X, CheckCircle2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperties, useSocialAccounts, useCreateSocialPost } from '@/services/ghlApi';
import { getTemplateById } from '@/lib/templates/profiles';
import { buildImejisPayload, resolveAllFields, preparePropertyForTemplate } from '@/lib/templates/fieldMapper';
import { renderImejisTemplate } from '@/services/imejis/api';
import { useCaptionGenerate } from '../create-wizard/hooks/useCaptionGenerate';
import { getDatePreview, parseDateTimeString } from '@/lib/utils/dateParser';
import { addHours } from 'date-fns';
import type { Property } from '@/types';
import { toast } from 'sonner';

// Import from socialHub module
import {
  type IntentId,
  type ToneId,
  type ImageTemplateId,
  type BatchItem,
  INTENTS,
  TONES,
  TEMPLATES,
  getIntent,
  getDefaultTone,
  getPrimaryTemplate,
} from '@/lib/socialHub';

// Import BatchItemRow component
import { BatchItemRow } from './BatchItemRow';

// Interval options
const INTERVAL_OPTIONS = [
  { value: '1', label: '1 hour' },
  { value: '2', label: '2 hours' },
  { value: '4', label: '4 hours' },
  { value: '6', label: '6 hours' },
  { value: '12', label: '12 hours' },
  { value: '24', label: '1 day' },
  { value: '48', label: '2 days' },
];

type FormStep = 'form' | 'generating' | 'preview';

interface QuickBatchFormState {
  items: BatchItem[];
  sharedContext: string;
  startTime: string;
  intervalHours: string;
  selectedAccounts: string[];
}

const INITIAL_STATE: QuickBatchFormState = {
  items: [],
  sharedContext: '',
  startTime: 'now',
  intervalHours: '2',
  selectedAccounts: [],
};

// Create a new batch item with defaults
function createBatchItem(property: Property): BatchItem {
  const defaultIntent: IntentId = 'just-listed';
  return {
    id: `batch-${property.id}-${Date.now()}`,
    propertyId: property.id,
    intentId: defaultIntent,
    toneId: getDefaultTone(defaultIntent),
    templateId: getPrimaryTemplate(defaultIntent),
    context: {},
    status: 'pending',
  };
}

export function QuickBatchForm() {
  const [state, setState] = useState<QuickBatchFormState>(INITIAL_STATE);
  const [step, setStep] = useState<FormStep>('form');
  const [propertySelectOpen, setPropertySelectOpen] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);

  const { data: propertiesData } = useProperties();
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

  // Toggle property selection (adds/removes from batch items)
  const toggleProperty = useCallback((property: Property) => {
    setState((prev) => {
      const existingIndex = prev.items.findIndex((item) => item.propertyId === property.id);
      if (existingIndex >= 0) {
        // Remove
        return {
          ...prev,
          items: prev.items.filter((item) => item.propertyId !== property.id),
        };
      } else {
        // Add new item with defaults
        return {
          ...prev,
          items: [...prev.items, createBatchItem(property)],
        };
      }
    });
  }, []);

  // Select all properties
  const handleSelectAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      items: properties.map((p) => createBatchItem(p)),
    }));
  }, [properties]);

  // Deselect all
  const handleDeselectAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      items: [],
    }));
  }, []);

  // Update a single batch item
  const updateItem = useCallback((itemId: string, updates: Partial<BatchItem>) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    }));
  }, []);

  // Calculate scheduled times for each item
  const calculateScheduledTimes = (): Date[] => {
    const parsed = parseDateTimeString(state.startTime);
    const startDate = parsed?.date || new Date();
    const interval = parseInt(state.intervalHours, 10);
    return state.items.map((_, index) => addHours(startDate, index * interval));
  };

  // Build context string for caption generation
  const buildContextString = (item: BatchItem, property: Property): string => {
    const parts: string[] = [];

    // Add intent-specific context fields
    const intent = getIntent(item.intentId);
    for (const field of intent.fields) {
      const value = item.context[field.key];
      if (value) {
        parts.push(`${field.label}: ${value}`);
      }
    }

    // Add shared context
    if (state.sharedContext.trim()) {
      parts.push(`Additional context: ${state.sharedContext}`);
    }

    // Fallback property description
    if (parts.length === 0) {
      parts.push(`${property.beds} bed, ${property.baths} bath property in ${property.city}`);
    }

    return parts.join('\n');
  };

  // Generate content for all items
  const handleGenerate = async () => {
    if (state.items.length === 0) {
      toast.error('Please select at least one property');
      return;
    }

    setStep('generating');
    setGenerationProgress(0);

    const scheduledTimes = calculateScheduledTimes();
    const total = state.items.length;
    const updatedItems: BatchItem[] = [];

    for (let i = 0; i < total; i++) {
      const item = state.items[i];
      const property = propertyMap[item.propertyId];

      if (!property) {
        updatedItems.push({
          ...item,
          status: 'failed',
          error: 'Property not found',
          scheduledAt: scheduledTimes[i],
        });
        continue;
      }

      setGenerationProgress(Math.round(((i + 0.5) / total) * 100));

      try {
        // Build context for this specific item
        const contextString = buildContextString(item, property);

        // Generate caption using the item's intent and tone
        const captionResult = await generateCaption({
          property,
          context: contextString,
          tone: item.toneId as any,
          platform: 'all',
          postIntent: item.intentId as any,
        });

        let imageUrl: string | null = null;

        // Generate image if template is not 'none' or 'custom'
        if (item.templateId !== 'none' && item.templateId !== 'custom') {
          const template = getTemplateById(item.templateId);
          if (template) {
            const preparedProperty = preparePropertyForTemplate(property);
            const resolvedFields = resolveAllFields(template, preparedProperty, item.context);
            const payload = buildImejisPayload(template, resolvedFields);
            const imageResult = await renderImejisTemplate(payload);

            if (imageResult.success && imageResult.imageUrl) {
              imageUrl = imageResult.imageUrl;
            }
          }
        }

        updatedItems.push({
          ...item,
          caption: captionResult.caption,
          imageUrl,
          status: 'ready',
          scheduledAt: scheduledTimes[i],
        });
      } catch (error) {
        console.error(`Error generating for ${property.address}:`, error);
        updatedItems.push({
          ...item,
          status: 'failed',
          error: 'Generation failed',
          scheduledAt: scheduledTimes[i],
        });
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

    const isNow = state.startTime.toLowerCase().trim() === 'now';
    let successCount = 0;

    for (let i = 0; i < readyItems.length; i++) {
      const item = readyItems[i];
      setPublishProgress(Math.round(((i + 0.5) / readyItems.length) * 100));

      try {
        await createPost.mutateAsync({
          accountIds: state.selectedAccounts,
          summary: item.caption || '',
          media: item.imageUrl ? [{ url: item.imageUrl, type: 'image/png' }] : undefined,
          scheduleDate: isNow ? undefined : item.scheduledAt?.toISOString(),
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
    return state.items.length > 0;
  }, [state.items.length]);

  // Count ready and failed items
  const readyCount = state.items.filter((item) => item.status === 'ready').length;
  const failedCount = state.items.filter((item) => item.status === 'failed').length;

  // ============ GENERATING STEP ============
  if (step === 'generating') {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
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
              <Eye className="h-5 w-5 text-purple-500" />
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
                const property = propertyMap[item.propertyId];
                const intent = getIntent(item.intentId);
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      item.status === 'failed' && 'border-red-300 bg-red-50/50 dark:bg-red-950/20'
                    )}
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
                              {property?.address || 'Unknown'}
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
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.caption?.substring(0, 100)}...
                          </p>
                          {item.scheduledAt && state.startTime.toLowerCase() !== 'now' && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-purple-600">
                              <Clock className="h-3 w-3" />
                              {item.scheduledAt.toLocaleString()}
                            </div>
                          )}
                        </div>

                        {/* Index */}
                        <Badge variant="secondary" className="flex-shrink-0">
                          #{index + 1}
                        </Badge>
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
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <div
                          className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center',
                            state.selectedAccounts.includes(account.id)
                              ? 'border-purple-600 bg-purple-600'
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

            {/* Summary */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">Batch Summary</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    {state.items.length} properties
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={readyCount > 0 ? 'text-green-500' : 'text-amber-500'}>
                      {readyCount > 0 ? '✓' : '○'}
                    </span>
                    {readyCount} posts ready
                  </li>
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
              </CardContent>
            </Card>

            {/* Publish Button */}
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
                className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
                disabled={state.selectedAccounts.length === 0 || readyCount === 0}
                onClick={handlePublish}
              >
                <Rocket className="h-4 w-4" />
                {state.startTime.toLowerCase().trim() === 'now'
                  ? `Publish ${readyCount} Posts Now`
                  : `Schedule ${readyCount} Posts`}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============ FORM STEP ============
  return (
    <div className="space-y-6">
      {/* Batch Setup Card */}
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Row 1: Property selector + start time */}
            <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
              <span className="text-muted-foreground">Create</span>

              {/* Property Selector */}
              <Popover open={propertySelectOpen} onOpenChange={setPropertySelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      'justify-between min-w-[200px] h-auto py-1.5 px-3',
                      state.items.length > 0
                        ? 'border-purple-400 bg-purple-50 dark:bg-purple-950/30'
                        : 'border-dashed'
                    )}
                  >
                    {state.items.length > 0 ? (
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-purple-600" />
                        <span>{state.items.length} posts</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select properties...</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
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
                            (item) => item.propertyId === property.id
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
                                    ? 'bg-purple-600 border-purple-600'
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

              <span className="text-muted-foreground">starting</span>

              {/* Start Time */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="now"
                  value={state.startTime}
                  onChange={(e) => setState((prev) => ({ ...prev, startTime: e.target.value }))}
                  className="w-[180px] h-auto py-1.5 px-3 text-center"
                />
                {state.startTime && getDatePreview(state.startTime) && (
                  <div className="absolute top-full mt-1 left-0 right-0 text-xs text-center text-purple-600 dark:text-purple-400">
                    {getDatePreview(state.startTime)}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Interval */}
            <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
              <span className="text-muted-foreground">with</span>

              <Select
                value={state.intervalHours}
                onValueChange={(v) => setState((prev) => ({ ...prev, intervalHours: v }))}
              >
                <SelectTrigger className="w-[130px] h-auto py-1.5">
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

              <span className="text-muted-foreground">between each post.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shared Context (applies to all) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <label className="font-medium text-sm">
              Shared Context <span className="text-muted-foreground">(optional)</span>
            </label>
          </div>
          <Textarea
            placeholder="Add context that applies to all posts... (e.g., 'All properties are move-in ready')"
            value={state.sharedContext}
            onChange={(e) => setState((prev) => ({ ...prev, sharedContext: e.target.value }))}
            rows={2}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            This context will be combined with each post's specific context for caption generation.
          </p>
        </CardContent>
      </Card>

      {/* Batch Items (Per-Post Configuration) */}
      {state.items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">
              Posts ({state.items.length})
              <span className="text-muted-foreground font-normal ml-2">
                Click to customize each post
              </span>
            </h3>
            <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {state.items.map((item, index) => {
              const property = propertyMap[item.propertyId];
              if (!property) return null;
              return (
                <BatchItemRow
                  key={item.id}
                  item={item}
                  property={property}
                  index={index}
                  onChange={(updates) => updateItem(item.id, updates)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Generate Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={!isValid}
          onClick={handleGenerate}
          className="gap-2 bg-purple-600 hover:bg-purple-700"
        >
          <Sparkles className="h-4 w-4" />
          Generate {state.items.length} Posts
        </Button>
      </div>
    </div>
  );
}
