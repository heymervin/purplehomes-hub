/**
 * Step 5: Schedule/Stagger
 *
 * Choose when to post:
 * - Now (immediate)
 * - Add to Queue (auto-schedule based on queue settings)
 * - Staggered (start time + interval)
 */

import { useMemo } from 'react';
import { Calendar, Clock, Zap, Layers, ListOrdered } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, addHours, setHours, setMinutes } from 'date-fns';
import type { Property } from '@/types';
import type { BatchWizardState, ScheduleType } from '../types';
import { useSocialAccounts, useScheduledPosts } from '@/services/ghlApi';
import { SocialAccountSelector } from '../../SocialAccountSelector';
import { SchedulePreview } from '../../queue/SchedulePreview';
import { useQueueSettings } from '@/hooks/useQueueSettings';
import { allocatePropertiesToSlots, getSettingsSummary } from '@/lib/queue/calculateSlots';
import type { PipelinePost } from '@/lib/queue/types';

interface BatchScheduleStepProps {
  properties: Property[];
  state: BatchWizardState;
  updateState: (updates: Partial<BatchWizardState>) => void;
}

export default function BatchScheduleStep({
  properties,
  state,
  updateState,
}: BatchScheduleStepProps) {
  const { data: socialAccountsData } = useSocialAccounts();
  const { data: scheduledPostsData } = useScheduledPosts();
  const { settings } = useQueueSettings();
  const accounts = socialAccountsData?.accounts || [];

  const selectedProperties = properties.filter((p) =>
    state.selectedPropertyIds.includes(p.id)
  );

  // Transform existing posts to PipelinePost format for slot calculation
  const existingPosts: PipelinePost[] = useMemo(() => {
    const ghlPosts = scheduledPostsData?.posts || [];
    return ghlPosts.map(post => ({
      id: post.id,
      content: post.summary || '',
      imageUrl: post.media?.[0]?.url,
      platforms: post.accountIds || [],
      scheduledAt: new Date(post.scheduleDate || post.createdAt),
      status: post.status === 'scheduled' ? 'scheduled' : post.status === 'published' ? 'published' : 'failed',
      accountIds: post.accountIds || [],
    }));
  }, [scheduledPostsData]);

  // Calculate queue allocations when "Add to Queue" is selected
  const queueAllocations = useMemo(() => {
    if (state.scheduleType !== 'queue') return [];

    const propertiesToAllocate = selectedProperties.map((p) => ({
      id: p.id,
      propertyCode: p.propertyCode || p.id,
      platforms: state.selectedAccounts,
    }));

    return allocatePropertiesToSlots(propertiesToAllocate, settings, existingPosts);
  }, [selectedProperties, settings, state.scheduleType, state.selectedAccounts, existingPosts]);

  // Calculate scheduled times preview for staggered
  const scheduledTimes = useMemo(() => {
    if (state.scheduleType !== 'staggered' || !state.staggerSettings.startDate) {
      return [];
    }

    const startDate = new Date(state.staggerSettings.startDate);
    const [hours, minutes] = state.staggerSettings.startTime.split(':').map(Number);
    const currentTime = setMinutes(setHours(startDate, hours), minutes);

    return selectedProperties.map((property, index) => {
      const time = addHours(currentTime, index * state.staggerSettings.intervalHours);
      return {
        property,
        time,
      };
    });
  }, [selectedProperties, state.scheduleType, state.staggerSettings]);

  const handleScheduleTypeChange = (type: ScheduleType) => {
    updateState({ scheduleType: type });
  };

  const handleStartDateChange = (dateStr: string) => {
    updateState({
      staggerSettings: {
        ...state.staggerSettings,
        startDate: dateStr ? new Date(dateStr) : null,
      },
    });
  };

  const handleStartTimeChange = (time: string) => {
    updateState({
      staggerSettings: {
        ...state.staggerSettings,
        startTime: time,
      },
    });
  };

  const handleIntervalChange = (hours: number) => {
    updateState({
      staggerSettings: {
        ...state.staggerSettings,
        intervalHours: hours,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Schedule Posts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose when to publish your {selectedProperties.length} posts
        </p>
      </div>

      {/* Account Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Select Accounts</Label>
        <SocialAccountSelector
          accounts={accounts.map((a) => ({
            id: a.id,
            platform: a.platform as 'facebook' | 'instagram' | 'linkedin',
            accountName: a.accountName,
            profilePicture: a.avatar,
            connected: a.isActive,
          }))}
          selectedIds={state.selectedAccounts}
          onSelectionChange={(ids) => updateState({ selectedAccounts: ids })}
        />
      </div>

      {/* Schedule Type */}
      <div className="space-y-3">
        <Label className="text-base font-medium">When to Post</Label>
        <RadioGroup
          value={state.scheduleType}
          onValueChange={(v) => handleScheduleTypeChange(v as ScheduleType)}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {/* Post Now */}
          <label
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
              state.scheduleType === 'now'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                : 'border-muted hover:border-muted-foreground/30'
            )}
          >
            <RadioGroupItem value="now" className="mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Post Now</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Publish all {selectedProperties.length} posts immediately
              </p>
            </div>
          </label>

          {/* Add to Queue */}
          <label
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
              state.scheduleType === 'queue'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                : 'border-muted hover:border-muted-foreground/30'
            )}
          >
            <RadioGroupItem value="queue" className="mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-green-500" />
                <span className="font-medium">Add to Queue</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-schedule based on your queue settings
              </p>
            </div>
          </label>

          {/* Staggered */}
          <label
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
              state.scheduleType === 'staggered'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                : 'border-muted hover:border-muted-foreground/30'
            )}
          >
            <RadioGroupItem value="staggered" className="mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Staggered</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Custom start time + interval
              </p>
            </div>
          </label>
        </RadioGroup>
      </div>

      {/* Queue Settings Summary & Preview */}
      {state.scheduleType === 'queue' && (
        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Queue settings: </span>
              {getSettingsSummary(settings)}
            </p>
          </div>
          <SchedulePreview allocations={queueAllocations} showAdjustButton={false} />
        </div>
      )}

      {/* Stagger Settings */}
      {state.scheduleType === 'staggered' && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={
                  state.staggerSettings.startDate
                    ? format(state.staggerSettings.startDate, 'yyyy-MM-dd')
                    : ''
                }
                onChange={(e) => handleStartDateChange(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={state.staggerSettings.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="interval">Hours Between Posts</Label>
            <div className="flex items-center gap-3 mt-1">
              <Input
                id="interval"
                type="number"
                min={1}
                max={24}
                value={state.staggerSettings.intervalHours}
                onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">hours apart</span>
            </div>
          </div>

          {/* Time estimate */}
          {state.staggerSettings.startDate && scheduledTimes.length > 0 && (
            <div className="p-3 bg-background rounded border">
              <p className="text-sm">
                <span className="text-muted-foreground">First post: </span>
                <span className="font-medium">
                  {format(scheduledTimes[0].time, 'MMM d, h:mm a')}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Last post: </span>
                <span className="font-medium">
                  {format(scheduledTimes[scheduledTimes.length - 1].time, 'MMM d, h:mm a')}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Schedule Preview for Staggered */}
      {state.scheduleType === 'staggered' && scheduledTimes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Schedule Preview</Label>
            <Badge variant="secondary">{scheduledTimes.length} posts</Badge>
          </div>
          <ScrollArea className="h-[200px] border rounded-lg">
            <div className="p-3 space-y-2">
              {scheduledTimes.map(({ property, time }, index) => (
                <div
                  key={property.id}
                  className="flex items-center gap-3 p-2 rounded bg-muted/30"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{property.address}</p>
                    <p className="text-xs text-muted-foreground">{property.city}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(time, 'MMM d')}</span>
                    <Clock className="h-3 w-3 ml-2" />
                    <span>{format(time, 'h:mm a')}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Warning if no accounts */}
      {state.selectedAccounts.length === 0 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Please select at least one social media account to continue.
          </p>
        </div>
      )}
    </div>
  );
}
