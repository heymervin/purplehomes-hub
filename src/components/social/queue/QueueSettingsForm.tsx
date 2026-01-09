/**
 * QueueSettingsForm
 *
 * Form for configuring queue posting days, time slots, and limits.
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { QueueSettings } from '@/lib/queue/types';
import { DAY_LABELS, AVAILABLE_TIME_SLOTS } from '@/lib/queue/constants';

interface QueueSettingsFormProps {
  settings: QueueSettings;
  onChange: (updates: Partial<QueueSettings>) => void;
}

// Helper to format 24h time to 12h
function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function QueueSettingsForm({
  settings,
  onChange,
}: QueueSettingsFormProps) {
  // Toggle a posting day
  const toggleDay = (day: number) => {
    const newDays = settings.postingDays.includes(day)
      ? settings.postingDays.filter((d) => d !== day)
      : [...settings.postingDays, day].sort((a, b) => a - b);
    onChange({ postingDays: newDays });
  };

  // Toggle a time slot
  const toggleTimeSlot = (time: string) => {
    const newSlots = settings.timeSlots.includes(time)
      ? settings.timeSlots.filter((t) => t !== time)
      : [...settings.timeSlots, time].sort();
    onChange({ timeSlots: newSlots });
  };

  return (
    <div className="space-y-6">
      {/* Posting Days */}
      <div className="space-y-3">
        <Label>Posting Days</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
            const isSelected = settings.postingDays.includes(day);
            const isWeekend = day === 0 || day === 6;

            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  'w-12 h-12 rounded-lg text-sm font-medium transition-all',
                  isSelected
                    ? 'bg-purple-600 text-white'
                    : isWeekend
                      ? 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      : 'bg-muted text-foreground hover:bg-purple-100'
                )}
              >
                {DAY_LABELS[day]}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Click to toggle. Weekends are off by default.
        </p>
      </div>

      {/* Time Slots */}
      <div className="space-y-3">
        <Label>Time Slots</Label>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_TIME_SLOTS.map((slot) => {
            const isSelected = settings.timeSlots.includes(slot.time);

            return (
              <button
                key={slot.time}
                type="button"
                onClick={() => toggleTimeSlot(slot.time)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                  isSelected
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20'
                    : 'border-border hover:border-purple-300'
                )}
              >
                <span className="text-xl">{slot.icon}</span>
                <div>
                  <p className="font-medium text-sm">{slot.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(slot.time)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Limits */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="maxPerDay">Max Posts Per Day</Label>
          <Input
            id="maxPerDay"
            type="number"
            min={1}
            max={10}
            value={settings.maxPostsPerDay}
            onChange={(e) =>
              onChange({ maxPostsPerDay: parseInt(e.target.value) || 1 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minHours">Min Hours Between</Label>
          <Input
            id="minHours"
            type="number"
            min={1}
            max={24}
            value={settings.minHoursBetween}
            onChange={(e) =>
              onChange({ minHoursBetween: parseInt(e.target.value) || 1 })
            }
          />
        </div>
      </div>
    </div>
  );
}
