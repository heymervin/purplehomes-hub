import React, { useState, useEffect } from 'react';
import { Info, Expand, Calendar, Clock, CheckCircle2, Loader2, Pencil } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useSocialAccounts } from '@/services/ghlApi';
import { renderImejisTemplate } from '@/services/imejis/api';
import { getTemplateById } from '@/lib/templates/profiles';
import { buildImejisPayload, resolveAllFields, preparePropertyForTemplate } from '@/lib/templates/fieldMapper';
import { getAgentById } from '@/lib/socialHub/agents';
import PostPreview from '../components/PostPreview';
import ExpandablePreview from '../components/ExpandablePreview';
import type { WizardState, Platform, WizardStep } from '../types';
import { toast } from 'sonner';

interface PublishStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  onPublish: () => void;
  onReset: () => void;
  onGoToStep?: (step: WizardStep) => void;
}

// Fallback accounts for demo mode
const DEMO_ACCOUNTS = [
  { id: 'demo-fb-1', platform: 'facebook' as const, accountName: 'Purple Homes', isActive: true },
  { id: 'demo-ig-1', platform: 'instagram' as const, accountName: '@purplehomes', isActive: true },
  { id: 'demo-li-1', platform: 'linkedin' as const, accountName: 'Purple Homes LLC', isActive: true },
];

const PLATFORM_ICONS: Record<string, string> = {
  facebook: 'FB',
  instagram: 'IG',
  linkedin: 'LI',
  twitter: 'X',
  tiktok: 'TT',
  gmb: 'G',
};

export default function PublishStep({ state, updateState, onGoToStep }: PublishStepProps) {
  const [activePlatform, setActivePlatform] = useState<Platform>('facebook');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch connected accounts from GHL
  const { data: accountsData, isLoading: isLoadingAccounts } = useSocialAccounts();

  // Use connected accounts or fallback to demo
  const connectedAccounts = accountsData?.accounts?.length ? accountsData.accounts : DEMO_ACCOUNTS;

  // Auto-generate image when entering publish step if template selected but no image generated
  useEffect(() => {
    const shouldGenerate =
      state.selectedTemplateId &&
      !state.generatedImageUrl &&
      !state.customImagePreview &&
      !isGenerating;

    if (shouldGenerate) {
      generateTemplateImage();
    }
  }, [state.selectedTemplateId]);

  const generateTemplateImage = async () => {
    if (!state.selectedTemplateId) return;

    setIsGenerating(true);

    try {
      const template = getTemplateById(state.selectedTemplateId);
      if (!template) {
        toast.error('Template not found');
        setIsGenerating(false);
        return;
      }

      // Prepare property with selected supporting images
      let preparedProperty = state.selectedProperty
        ? preparePropertyForTemplate(state.selectedProperty)
        : null;

      // If user selected supporting images, override the images array
      if (preparedProperty && state.selectedSupportingImages?.length > 0) {
        preparedProperty = {
          ...preparedProperty,
          images: state.selectedSupportingImages,
        };
      }

      // Get selected agent for template fields
      const selectedAgent = state.selectedAgentId ? getAgentById(state.selectedAgentId) : undefined;

      const resolvedFields = resolveAllFields(template, preparedProperty, state.templateUserInputs || {}, selectedAgent);
      const payload = buildImejisPayload(template, resolvedFields);

      const result = await renderImejisTemplate(payload);

      if (result.success && result.imageUrl && result.imageBlob) {
        updateState({
          generatedImageUrl: result.imageUrl,
          generatedImageBlob: result.imageBlob,
        });
      } else {
        toast.error(result.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle account selection
  const toggleAccount = (accountId: string) => {
    const isSelected = state.selectedAccounts.includes(accountId);
    if (isSelected) {
      updateState({
        selectedAccounts: state.selectedAccounts.filter(id => id !== accountId),
      });
    } else {
      updateState({
        selectedAccounts: [...state.selectedAccounts, accountId],
      });
    }
  };

  // Get the image URL to display
  const imageUrl = state.generatedImageUrl || state.customImagePreview || null;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Preview & Publish</h2>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              Review your post and choose where to publish
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Preview Section */}
        <div>
          <Label className="mb-3 block">Preview</Label>

          <Tabs value={activePlatform} onValueChange={(v) => setActivePlatform(v as Platform)}>
            <TabsList>
              <TabsTrigger value="facebook">Facebook</TabsTrigger>
              <TabsTrigger value="instagram">Instagram</TabsTrigger>
              <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
            </TabsList>

            {(['facebook', 'instagram', 'linkedin'] as Platform[]).map((platform) => (
              <TabsContent key={platform} value={platform} className="mt-4">
                <Card>
                  <CardContent className="p-4 max-h-[500px] overflow-y-auto">
                    <div className="relative">
                      {/* Loading overlay when generating image */}
                      {isGenerating && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                          <div className="text-center space-y-2">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
                            <p className="text-sm font-medium">Generating image preview...</p>
                          </div>
                        </div>
                      )}

                      <PostPreview
                        platform={platform}
                        imageUrl={imageUrl}
                        caption={state.captions[platform]}
                        hashtags={
                          state.platformHashtagSettings[platform].enabled
                            ? state.selectedHashtags
                            : []
                        }
                        compact={true}
                      />

                      {/* Expand button */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-2 right-2 gap-1"
                          >
                            <Expand className="h-3 w-3" />
                            Expand
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <ExpandablePreview
                            platform={platform}
                            imageUrl={imageUrl}
                            caption={state.captions[platform]}
                            hashtags={
                              state.platformHashtagSettings[platform].enabled
                                ? state.selectedHashtags
                                : []
                            }
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Account Selection */}
        <div>
          <Label className="mb-3 block">Post to</Label>
          {isLoadingAccounts ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading accounts...
            </div>
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
                  <Checkbox
                    checked={state.selectedAccounts.includes(account.id)}
                    onCheckedChange={() => toggleAccount(account.id)}
                  />
                  <span className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
                    {PLATFORM_ICONS[account.platform] || account.platform.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium flex-1">{account.accountName}</span>
                  {account.isActive && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {!accountsData?.accounts?.length && (
            <p className="text-xs text-muted-foreground mt-2">
              Demo mode - Connect your social accounts in Settings to post for real
            </p>
          )}
        </div>

        {/* Schedule Options */}
        <div>
          <Label className="mb-3 block">When</Label>
          <RadioGroup
            value={state.scheduleType}
            onValueChange={(v) => updateState({ scheduleType: v as 'now' | 'later' })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="now" id="post-now" />
              <label htmlFor="post-now" className="cursor-pointer">Post now</label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="later" id="post-later" />
              <label htmlFor="post-later" className="cursor-pointer">Schedule for later</label>
            </div>
          </RadioGroup>

          {state.scheduleType === 'later' && (
            <div className="flex gap-4 mt-4">
              <div>
                <Label className="mb-1 block text-sm">Date</Label>
                <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    className="bg-transparent outline-none text-sm"
                    onChange={(e) => updateState({ scheduledDate: new Date(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1 block text-sm">Time</Label>
                <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="time"
                    className="bg-transparent outline-none text-sm"
                    onChange={(e) => updateState({ scheduledTime: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary with Edit Buttons */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Summary</h3>
            <ul className="space-y-2 text-sm">
              {/* Source/Property */}
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>
                    {state.selectedProperty
                      ? `Property: ${state.selectedProperty.address}`
                      : state.postType === 'custom'
                        ? 'Custom post with image'
                        : 'Text-only post'
                    }
                  </span>
                </div>
                {onGoToStep && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => onGoToStep('source')}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </li>

              {/* Caption */}
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={state.captions.facebook.length > 0 ? "text-green-500" : "text-amber-500"}>
                    {state.captions.facebook.length > 0 ? '✓' : '○'}
                  </span>
                  <span>Caption: {state.captions.facebook.length} characters</span>
                </div>
                {onGoToStep && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => onGoToStep('caption')}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </li>

              {/* Image */}
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={imageUrl ? "text-green-500" : "text-amber-500"}>
                    {imageUrl ? '✓' : '○'}
                  </span>
                  <span>Image: {imageUrl ? 'Ready' : 'None'}</span>
                </div>
                {onGoToStep && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => onGoToStep('image')}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </li>

              {/* Hashtags */}
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={state.selectedHashtags.length > 0 ? "text-green-500" : "text-amber-500"}>
                    {state.selectedHashtags.length > 0 ? '✓' : '○'}
                  </span>
                  <span>Hashtags: {state.selectedHashtags.length} selected</span>
                </div>
                {onGoToStep && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => onGoToStep('hashtags')}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </li>

              {/* Accounts - no edit, handled on this page */}
              <li className="flex items-center gap-2">
                <span className={state.selectedAccounts.length > 0 ? "text-green-500" : "text-red-500"}>
                  {state.selectedAccounts.length > 0 ? '✓' : '✗'}
                </span>
                <span>Posting to: {state.selectedAccounts.length} account(s)</span>
              </li>

              {/* Schedule - no edit, handled on this page */}
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>
                  {state.scheduleType === 'now' ? 'Publishing immediately' : `Scheduled for ${state.scheduledDate?.toLocaleDateString() || 'TBD'}`}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
