/**
 * PipelineView
 *
 * List view of upcoming scheduled posts grouped by day.
 * Shows queue status, next available slots, and settings access.
 */

import { useState, useMemo } from 'react';
import { Settings, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PipelinePostCard } from './PipelinePostCard';
import { QueueSettingsModal } from './QueueSettingsModal';
import { useQueueSettings } from '@/hooks/useQueueSettings';
import {
  getSettingsSummary,
  calculateNextSlots,
} from '@/lib/queue/calculateSlots';
import type { PipelinePost } from '@/lib/queue/types';

interface PipelineViewProps {
  posts: PipelinePost[];
  onEditPost: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  onCreatePost: () => void;
}

export function PipelineView({
  posts,
  onEditPost,
  onDeletePost,
  onCreatePost,
}: PipelineViewProps) {
  const { settings } = useQueueSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Group posts by day
  const groupedPosts = useMemo(() => {
    const groups = new Map<string, PipelinePost[]>();

    const sortedPosts = [...posts]
      .filter((p) => p.status === 'scheduled')
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    sortedPosts.forEach((post) => {
      const dayKey = post.scheduledAt.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      if (!groups.has(dayKey)) {
        groups.set(dayKey, []);
      }
      groups.get(dayKey)!.push(post);
    });

    return groups;
  }, [posts]);

  // Get next available slots
  const nextSlots = useMemo(() => {
    return calculateNextSlots(3, settings, posts);
  }, [settings, posts]);

  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Post Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            {getSettingsSummary(settings)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSettingsOpen(true)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Queue Settings
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium">Queue Active</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {scheduledCount} posts scheduled
        </div>
        {nextSlots[0] && (
          <div className="text-sm text-muted-foreground ml-auto flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Next slot: {nextSlots[0].dayLabel} {nextSlots[0].timeLabel}
          </div>
        )}
      </div>

      {/* Pipeline Content */}
      {scheduledCount === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No posts in queue</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create posts to see them appear here
          </p>
          <Button onClick={onCreatePost}>Create Post</Button>
        </div>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-6 pr-4">
            {Array.from(groupedPosts.entries()).map(([dayLabel, dayPosts]) => (
              <div key={dayLabel}>
                {/* Day Header */}
                <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background py-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{dayLabel}</span>
                  <Badge variant="secondary" className="text-xs">
                    {dayPosts.length} post{dayPosts.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {/* Posts for this day */}
                <div className="space-y-2 ml-6">
                  {dayPosts.map((post) => (
                    <PipelinePostCard
                      key={post.id}
                      post={post}
                      onEdit={() => onEditPost(post.id)}
                      onDelete={() => onDeletePost(post.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Available Slots Preview */}
      {nextSlots.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">Next Available Slots</p>
          <div className="flex gap-2 flex-wrap">
            {nextSlots.map((slot, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {slot.dayLabel} {slot.timeLabel}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <QueueSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
