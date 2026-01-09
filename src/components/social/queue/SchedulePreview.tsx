/**
 * SchedulePreview
 *
 * Preview component for batch wizard showing how properties will be
 * allocated to queue slots.
 */

import { Clock, Calendar, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SlotAllocation } from '@/lib/queue/types';

interface SchedulePreviewProps {
  allocations: SlotAllocation[];
  onAdjust?: () => void;
  showAdjustButton?: boolean;
}

export function SchedulePreview({
  allocations,
  onAdjust,
  showAdjustButton = true,
}: SchedulePreviewProps) {
  // Group by day
  const groupedByDay = allocations.reduce(
    (acc, allocation) => {
      const dayLabel = allocation.slot.dayLabel;
      if (!acc.has(dayLabel)) {
        acc.set(dayLabel, []);
      }
      acc.get(dayLabel)!.push(allocation);
      return acc;
    },
    new Map<string, SlotAllocation[]>()
  );

  // Calculate time span
  const firstPost = allocations[0];
  const lastPost = allocations[allocations.length - 1];
  const timeSpan =
    firstPost && lastPost
      ? `${firstPost.slot.dayLabel} ${firstPost.slot.timeLabel} - ${lastPost.slot.dayLabel} ${lastPost.slot.timeLabel}`
      : '';

  if (allocations.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-muted/30">
        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No available slots found. Check your queue settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time Span Summary */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
            {allocations.length} posts will be scheduled
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{timeSpan}</span>
      </div>

      {/* Schedule List */}
      <ScrollArea className="h-[250px] rounded-lg border">
        <div className="p-4 space-y-4">
          {Array.from(groupedByDay.entries()).map(
            ([dayLabel, dayAllocations]) => (
              <div key={dayLabel}>
                {/* Day Header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">{dayLabel}</span>
                  <Badge variant="secondary" className="text-xs">
                    {dayAllocations.length}
                  </Badge>
                </div>

                {/* Allocations */}
                <div className="space-y-2 ml-4">
                  {dayAllocations.map((allocation, index) => (
                    <div
                      key={`${allocation.propertyId}-${index}`}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      {/* Time */}
                      <div className="flex items-center gap-1 w-20">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {allocation.slot.timeLabel}
                        </span>
                      </div>

                      {/* Property */}
                      <Badge variant="outline" className="text-purple-600">
                        {allocation.propertyCode}
                      </Badge>

                      {/* Platforms */}
                      <div className="flex items-center gap-1 ml-auto">
                        {allocation.platforms.map((p) => (
                          <span
                            key={p}
                            className="text-xs text-muted-foreground capitalize"
                          >
                            {p.slice(0, 2)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </ScrollArea>

      {/* Adjust Button */}
      {showAdjustButton && onAdjust && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onAdjust}>
            Adjust in Pipeline
          </Button>
        </div>
      )}
    </div>
  );
}
