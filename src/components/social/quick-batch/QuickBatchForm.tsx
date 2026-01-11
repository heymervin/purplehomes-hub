import React, { useState, useMemo } from 'react';
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
  ArrowLeft, Eye, Clock, RefreshCw, X, CheckCircle2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperties, useSocialAccounts, useCreateSocialPost } from '@/services/ghlApi';
import { getTemplateById } from '@/lib/templates/profiles';
import { buildImejisPayload, resolveAllFields, preparePropertyForTemplate } from '@/lib/templates/fieldMapper';
import { renderImejisTemplate } from '@/services/imejis/api';
import { useCaptionGenerate } from '../create-wizard/hooks/useCaptionGenerate';
import { POST_INTENTS, TONE_PRESETS, type PostIntent, type CaptionTone } from '../create-wizard/types';
import { getDatePreview, toScheduleDate, parseDateTimeString } from '@/lib/utils/dateParser';
import { addHours } from 'date-fns';
import type { Property } from '@/types';
import { toast } from 'sonner';

// Template options for dropdown
const TEMPLATE_OPTIONS = [
  { id: 'just-listed', label: 'Just Listed', icon: '🏷️' },
  { id: 'just-sold', label: 'Just Sold', icon: '🎉' },
  { id: 'open-house', label: 'Open House', icon: '🚪' },
  { id: 'personal-value', label: 'Value Tips', icon: '💡' },
  { id: 'success-story', label: 'Success Story', icon: '⭐' },
  { id: 'none', label: 'No Image', icon: '📝' },
];

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

interface PropertyPostState {
  propertyId: string;
  property: Property;
  caption: string;
  imageUrl: string | null;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  error?: string;
  scheduledAt?: Date;
}

interface QuickBatchFormState {
  selectedProperties: Property[];
  startTime: string;
  intervalHours: string;
  intent: PostIntent;
  tone: CaptionTone;
  templateId: string | null;
  context: string;
  selectedAccounts: string[];
  propertyPosts: PropertyPostState[];
}

const INITIAL_STATE: QuickBatchFormState = {
  selectedProperties: [],
  startTime: 'now',
  intervalHours: '2',
  intent: 'just-listed',
  tone: 'professional',
  templateId: null,
  context: '',
  selectedAccounts: [],
  propertyPosts: [],
};

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

  const selectedTemplate = state.templateId && state.templateId !== 'none'
    ? getTemplateById(state.templateId)
    : null;

  // Toggle property selection
  const toggleProperty = (property: Property) => {
    setState(prev => {
      const isSelected = prev.selectedProperties.some(p => p.id === property.id);
      return {
        ...prev,
        selectedProperties: isSelected
          ? prev.selectedProperties.filter(p => p.id !== property.id)
          : [...prev.selectedProperties, property],
      };
    });
  };

  // Select/Deselect all
  const handleSelectAll = () => {
    setState(prev => ({
      ...prev,
      selectedProperties: properties,
    }));
  };

  const handleDeselectAll = () => {
    setState(prev => ({
      ...prev,
      selectedProperties: [],
    }));
  };

  // Calculate scheduled times for each property
  const calculateScheduledTimes = (): Date[] => {
    const parsed = parseDateTimeString(state.startTime);
    const startDate = parsed?.date || new Date();
    const interval = parseInt(state.intervalHours, 10);

    return state.selectedProperties.map((_, index) =>
      addHours(startDate, index * interval)
    );
  };

  // Generate content for all properties
  const handleGenerate = async () => {
    if (state.selectedProperties.length === 0) {
      toast.error('Please select at least one property');
      return;
    }

    setStep('generating');
    setGenerationProgress(0);

    const scheduledTimes = calculateScheduledTimes();
    const posts: PropertyPostState[] = [];
    const total = state.selectedProperties.length;

    for (let i = 0; i < total; i++) {
      const property = state.selectedProperties[i];
      setGenerationProgress(Math.round(((i + 0.5) / total) * 100));

      try {
        // Generate caption
        const captionResult = await generateCaption({
          property,
          context: state.context || `${property.beds} bed, ${property.baths} bath property in ${property.city}`,
          tone: state.tone,
          platform: 'all',
          postIntent: state.intent,
        });

        let imageUrl: string | null = null;

        // Generate image if template selected
        if (selectedTemplate) {
          const preparedProperty = preparePropertyForTemplate(property);
          const resolvedFields = resolveAllFields(selectedTemplate, preparedProperty, {});
          const payload = buildImejisPayload(selectedTemplate, resolvedFields);
          const imageResult = await renderImejisTemplate(payload);

          if (imageResult.success && imageResult.imageUrl) {
            imageUrl = imageResult.imageUrl;
          }
        }

        posts.push({
          propertyId: property.id,
          property,
          caption: captionResult.caption,
          imageUrl,
          status: 'ready',
          scheduledAt: scheduledTimes[i],
        });
      } catch (error) {
        console.error(`Error generating for ${property.address}:`, error);
        posts.push({
          propertyId: property.id,
          property,
          caption: '',
          imageUrl: null,
          status: 'failed',
          error: 'Generation failed',
          scheduledAt: scheduledTimes[i],
        });
      }

      setGenerationProgress(Math.round(((i + 1) / total) * 100));
    }

    // Auto-select first account
    if (state.selectedAccounts.length === 0 && connectedAccounts.length > 0) {
      setState(prev => ({
        ...prev,
        selectedAccounts: [connectedAccounts[0].id],
        propertyPosts: posts,
      }));
    } else {
      setState(prev => ({ ...prev, propertyPosts: posts }));
    }

    setStep('preview');
  };

  // Publish all posts
  const handlePublish = async () => {
    if (state.selectedAccounts.length === 0) {
      toast.error('Please select at least one account');
      return;
    }

    const readyPosts = state.propertyPosts.filter(p => p.status === 'ready');
    if (readyPosts.length === 0) {
      toast.error('No posts ready to publish');
      return;
    }

    setIsPublishing(true);
    setPublishProgress(0);

    const isNow = state.startTime.toLowerCase().trim() === 'now';
    let successCount = 0;

    for (let i = 0; i < readyPosts.length; i++) {
      const post = readyPosts[i];
      setPublishProgress(Math.round(((i + 0.5) / readyPosts.length) * 100));

      try {
        await createPost.mutateAsync({
          accountIds: state.selectedAccounts,
          summary: post.caption,
          media: post.imageUrl ? [{ url: post.imageUrl, type: 'image/png' }] : undefined,
          scheduleDate: isNow ? undefined : post.scheduledAt?.toISOString(),
          status: isNow ? 'published' : 'scheduled',
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to publish post for ${post.property.address}:`, error);
      }

      setPublishProgress(Math.round(((i + 1) / readyPosts.length) * 100));
    }

    setIsPublishing(false);
    toast.success(`${successCount} of ${readyPosts.length} posts published!`);

    // Reset
    setState(INITIAL_STATE);
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

  const isValid = useMemo(() => {
    if (state.selectedProperties.length === 0) return false;
    if (!state.intent || !state.tone) return false;
    return true;
  }, [state]);

  // Generating Step
  if (step === 'generating') {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Generating Content</h2>
            <p className="text-muted-foreground mb-4">
              Creating captions and images for {state.selectedProperties.length} properties...
            </p>
            <Progress value={generationProgress} className="w-full max-w-md mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">{generationProgress}%</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Preview Step
  if (step === 'preview') {
    const readyPosts = state.propertyPosts.filter(p => p.status === 'ready');
    const failedPosts = state.propertyPosts.filter(p => p.status === 'failed');

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
              Review Batch ({state.propertyPosts.length} posts)
            </h2>
            <p className="text-sm text-muted-foreground">
              {readyPosts.length} ready, {failedPosts.length} failed
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Post List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="max-h-[500px] overflow-y-auto space-y-3">
              {state.propertyPosts.map((post, index) => (
                <Card key={post.propertyId} className={cn(
                  post.status === 'failed' && "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {post.imageUrl ? (
                          <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No img
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {post.property.address}
                          </span>
                          {post.status === 'ready' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {post.caption.substring(0, 100)}...
                        </p>
                        {post.scheduledAt && state.startTime.toLowerCase() !== 'now' && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-purple-600">
                            <Clock className="h-3 w-3" />
                            {post.scheduledAt.toLocaleString()}
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
              ))}
            </div>
          </div>

          {/* Right: Account Selection + Publish */}
          <div className="space-y-4">
            {/* Account Selection */}
            <Card>
              <CardContent className="p-4">
                <label className="font-medium text-sm mb-3 block">Post to</label>
                {connectedAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No social accounts connected.
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
                <h3 className="font-medium mb-2">Batch Summary</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    {state.selectedProperties.length} properties
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={readyPosts.length > 0 ? "text-green-500" : "text-amber-500"}>
                      {readyPosts.length > 0 ? '✓' : '○'}
                    </span>
                    {readyPosts.length} posts ready
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
                disabled={state.selectedAccounts.length === 0 || readyPosts.length === 0}
                onClick={handlePublish}
              >
                <Rocket className="h-4 w-4" />
                {state.startTime.toLowerCase().trim() === 'now'
                  ? `Publish ${readyPosts.length} Posts Now`
                  : `Schedule ${readyPosts.length} Posts`}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Form Step
  return (
    <div className="space-y-6">
      {/* Main Sentence Form */}
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Row 1: Property count + Start time */}
            <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
              <span className="text-muted-foreground">I want to post</span>

              {/* Property Count/Selector */}
              <Popover open={propertySelectOpen} onOpenChange={setPropertySelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "justify-between min-w-[200px] h-auto py-1.5 px-3",
                      state.selectedProperties.length > 0
                        ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30"
                        : "border-dashed"
                    )}
                  >
                    {state.selectedProperties.length > 0 ? (
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-purple-600" />
                        <span>{state.selectedProperties.length} properties</span>
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
                        <Button variant="ghost" size="sm" onClick={handleSelectAll}>All</Button>
                        <Button variant="ghost" size="sm" onClick={handleDeselectAll}>None</Button>
                      </div>
                    </div>
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>No properties found.</CommandEmpty>
                      <CommandGroup>
                        {properties.map((property) => {
                          const isSelected = state.selectedProperties.some(p => p.id === property.id);
                          return (
                            <CommandItem
                              key={property.id}
                              value={`${property.address} ${property.city}`}
                              onSelect={() => toggleProperty(property)}
                            >
                              <div className={cn(
                                "w-4 h-4 mr-2 rounded border flex items-center justify-center",
                                isSelected
                                  ? "bg-purple-600 border-purple-600"
                                  : "border-muted-foreground/30"
                              )}>
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
                  onChange={(e) => setState(prev => ({ ...prev, startTime: e.target.value }))}
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
                onValueChange={(v) => setState(prev => ({ ...prev, intervalHours: v }))}
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

              <span className="text-muted-foreground">between each post,</span>
            </div>

            {/* Row 3: Intent + Tone */}
            <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
              <span className="text-muted-foreground">announcing</span>

              <Select value={state.intent} onValueChange={(v) => setState(prev => ({ ...prev, intent: v as PostIntent }))}>
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

            {/* Row 4: Template */}
            <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
              <span className="text-muted-foreground">Using the</span>

              <Select
                value={state.templateId || ''}
                onValueChange={(v) => setState(prev => ({ ...prev, templateId: v }))}
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

              <span className="text-muted-foreground">template for all.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Context Box (optional for batch) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <label className="font-medium text-sm">
              Shared Context <span className="text-muted-foreground">(optional)</span>
            </label>
          </div>
          <Textarea
            placeholder="Add context that applies to all properties... (e.g., 'All properties are move-in ready')"
            value={state.context}
            onChange={(e) => setState(prev => ({ ...prev, context: e.target.value }))}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            This context will be combined with each property's details for caption generation.
          </p>
        </CardContent>
      </Card>

      {/* Selected Properties Preview */}
      {state.selectedProperties.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">
                Selected Properties ({state.selectedProperties.length})
              </p>
              <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {state.selectedProperties.slice(0, 8).map((property) => (
                <Badge
                  key={property.id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => toggleProperty(property)}
                >
                  {property.address}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
              {state.selectedProperties.length > 8 && (
                <Badge variant="outline">
                  +{state.selectedProperties.length - 8} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
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
          Generate {state.selectedProperties.length} Posts
        </Button>
      </div>
    </div>
  );
}
