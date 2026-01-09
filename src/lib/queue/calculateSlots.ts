/**
 * Queue Slot Calculation Logic
 *
 * Core algorithms for calculating available posting slots based on
 * queue settings and existing scheduled posts.
 */

import type {
  QueueSettings,
  AvailableSlot,
  SlotAllocation,
  PipelinePost,
} from './types';
import { DEFAULT_QUEUE_SETTINGS, DAY_LABELS_FULL } from './constants';

/**
 * Calculate the next N available posting slots based on queue settings
 * and existing scheduled posts
 */
export function calculateNextSlots(
  count: number,
  settings: QueueSettings = DEFAULT_QUEUE_SETTINGS,
  existingPosts: PipelinePost[] = [],
  startFrom: Date = new Date()
): AvailableSlot[] {
  const slots: AvailableSlot[] = [];
  const now = new Date();

  // Create a set of already-taken slot times for quick lookup
  const takenSlots = new Set(
    existingPosts
      .filter((p) => p.status === 'scheduled')
      .map((p) => p.scheduledAt.toISOString())
  );

  // Count posts per day to respect maxPostsPerDay
  const postsPerDay = new Map<string, number>();
  existingPosts.forEach((post) => {
    if (post.status === 'scheduled') {
      const dayKey = post.scheduledAt.toISOString().split('T')[0];
      postsPerDay.set(dayKey, (postsPerDay.get(dayKey) || 0) + 1);
    }
  });

  // Start searching from startFrom date
  const currentDate = new Date(startFrom);
  currentDate.setSeconds(0, 0);

  // Search up to 30 days ahead
  const maxDate = new Date(startFrom);
  maxDate.setDate(maxDate.getDate() + 30);

  while (slots.length < count && currentDate < maxDate) {
    const dayOfWeek = currentDate.getDay();
    const dayKey = currentDate.toISOString().split('T')[0];

    // Check if this day is enabled for posting
    if (settings.postingDays.includes(dayOfWeek)) {
      // Check if we haven't exceeded max posts for this day
      const dayPostCount = postsPerDay.get(dayKey) || 0;

      if (dayPostCount < settings.maxPostsPerDay) {
        // Try each time slot
        for (const timeSlot of settings.timeSlots) {
          if (slots.length >= count) break;

          const [hours, minutes] = timeSlot.split(':').map(Number);
          const slotDate = new Date(currentDate);
          slotDate.setHours(hours, minutes, 0, 0);

          // Skip if slot is in the past
          if (slotDate <= now) continue;

          // Skip if slot is already taken
          if (takenSlots.has(slotDate.toISOString())) continue;

          // Check minimum hours between posts
          const lastSlot = slots[slots.length - 1];
          if (lastSlot) {
            const hoursDiff =
              (slotDate.getTime() - lastSlot.datetime.getTime()) /
              (1000 * 60 * 60);
            if (hoursDiff < settings.minHoursBetween) continue;
          }

          // Check against existing posts for min hours between
          const tooCloseToExisting = existingPosts.some((post) => {
            if (post.status !== 'scheduled') return false;
            const hoursDiff =
              Math.abs(slotDate.getTime() - post.scheduledAt.getTime()) /
              (1000 * 60 * 60);
            return hoursDiff < settings.minHoursBetween;
          });
          if (tooCloseToExisting) continue;

          // This slot is available!
          slots.push(createAvailableSlot(slotDate, now));

          // Update tracking
          takenSlots.add(slotDate.toISOString());
          postsPerDay.set(dayKey, (postsPerDay.get(dayKey) || 0) + 1);
        }
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }

  return slots;
}

/**
 * Create an AvailableSlot object from a Date
 */
function createAvailableSlot(datetime: Date, now: Date): AvailableSlot {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const slotDay = new Date(datetime);
  slotDay.setHours(0, 0, 0, 0);

  const isToday = slotDay.getTime() === today.getTime();
  const isTomorrow = slotDay.getTime() === tomorrow.getTime();

  let dayLabel: string;
  if (isToday) {
    dayLabel = 'Today';
  } else if (isTomorrow) {
    dayLabel = 'Tomorrow';
  } else {
    dayLabel = datetime.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  const timeLabel = datetime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    datetime,
    dayLabel,
    timeLabel,
    isToday,
    isTomorrow,
  };
}

/**
 * Allocate properties to available slots
 */
export function allocatePropertiesToSlots(
  properties: Array<{ id: string; propertyCode: string; platforms: string[] }>,
  settings: QueueSettings = DEFAULT_QUEUE_SETTINGS,
  existingPosts: PipelinePost[] = []
): SlotAllocation[] {
  const slots = calculateNextSlots(properties.length, settings, existingPosts);

  return properties.map((property, index) => ({
    propertyId: property.id,
    propertyCode: property.propertyCode,
    slot: slots[index],
    platforms: property.platforms,
  }));
}

/**
 * Get the next single available slot
 */
export function getNextAvailableSlot(
  settings: QueueSettings = DEFAULT_QUEUE_SETTINGS,
  existingPosts: PipelinePost[] = []
): AvailableSlot | null {
  const slots = calculateNextSlots(1, settings, existingPosts);
  return slots[0] || null;
}

/**
 * Check if a specific datetime is available
 */
export function isSlotAvailable(
  datetime: Date,
  settings: QueueSettings,
  existingPosts: PipelinePost[]
): boolean {
  const dayOfWeek = datetime.getDay();

  // Check if day is enabled
  if (!settings.postingDays.includes(dayOfWeek)) return false;

  // Check if time matches a slot
  const timeStr = `${datetime.getHours().toString().padStart(2, '0')}:${datetime.getMinutes().toString().padStart(2, '0')}`;
  if (!settings.timeSlots.includes(timeStr)) return false;

  // Check if slot is taken
  const isTaken = existingPosts.some(
    (p) =>
      p.status === 'scheduled' &&
      p.scheduledAt.toISOString() === datetime.toISOString()
  );
  if (isTaken) return false;

  // Check max posts per day
  const dayKey = datetime.toISOString().split('T')[0];
  const dayCount = existingPosts.filter(
    (p) =>
      p.status === 'scheduled' &&
      p.scheduledAt.toISOString().split('T')[0] === dayKey
  ).length;
  if (dayCount >= settings.maxPostsPerDay) return false;

  return true;
}

/**
 * Format a slot for display
 */
export function formatSlotDisplay(slot: AvailableSlot): string {
  return `${slot.dayLabel} at ${slot.timeLabel}`;
}

/**
 * Get human-readable summary of queue settings
 */
export function getSettingsSummary(settings: QueueSettings): string {
  const days = settings.postingDays
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS_FULL[d].slice(0, 3))
    .join(', ');

  const times = settings.timeSlots
    .map((t) => {
      const [h, m] = t.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    })
    .join(', ');

  return `${days} • ${times} • Max ${settings.maxPostsPerDay}/day`;
}
