/**
 * Queue System Constants
 *
 * Default settings and predefined options for the queue system.
 */

import type { QueueSettings, TimeSlot } from './types';

// Default queue settings
export const DEFAULT_QUEUE_SETTINGS: QueueSettings = {
  postingDays: [1, 2, 3, 4, 5], // Monday - Friday
  timeSlots: ['09:00', '12:00', '16:00'],
  maxPostsPerDay: 3,
  minHoursBetween: 3,
};

// Predefined time slots for selection
export const AVAILABLE_TIME_SLOTS: TimeSlot[] = [
  { time: '07:00', label: 'Early Morning', icon: '🌅', enabled: false },
  { time: '09:00', label: 'Morning', icon: '☀️', enabled: true },
  { time: '12:00', label: 'Midday', icon: '🌞', enabled: true },
  { time: '14:00', label: 'Afternoon', icon: '🌤️', enabled: false },
  { time: '16:00', label: 'Late Afternoon', icon: '🌇', enabled: true },
  { time: '18:00', label: 'Evening', icon: '🌆', enabled: false },
  { time: '20:00', label: 'Night', icon: '🌙', enabled: false },
];

// Day labels (short)
export const DAY_LABELS: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

// Day labels (full)
export const DAY_LABELS_FULL: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

// localStorage key
export const QUEUE_SETTINGS_KEY = 'purple-homes-queue-settings';
