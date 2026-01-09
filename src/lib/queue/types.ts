/**
 * Queue System Types
 *
 * Type definitions for the intelligent scheduling queue system.
 * The queue is a UI concept - GHL remains the source of truth for scheduled posts,
 * while localStorage stores user preferences.
 */

// ============================================
// QUEUE SETTINGS
// ============================================

export interface QueueSettings {
  // Which days to post (0 = Sunday, 1 = Monday, etc.)
  postingDays: number[];

  // Time slots in 24h format ["09:00", "12:00", "16:00"]
  timeSlots: string[];

  // Maximum posts per day
  maxPostsPerDay: number;

  // Minimum hours between posts (prevents clustering)
  minHoursBetween: number;

  // Timezone (use browser default if not set)
  timezone?: string;
}

export interface TimeSlot {
  time: string; // "09:00"
  label: string; // "Morning"
  icon: string; // "☀️"
  enabled: boolean;
}

// ============================================
// CALCULATED SLOTS
// ============================================

export interface AvailableSlot {
  datetime: Date;
  dayLabel: string; // "Today", "Tomorrow", "Mon Jan 13"
  timeLabel: string; // "9:00 AM"
  isToday: boolean;
  isTomorrow: boolean;
}

export interface SlotAllocation {
  propertyId: string;
  propertyCode: string;
  slot: AvailableSlot;
  platforms: string[];
}

// ============================================
// PIPELINE POST (from GHL)
// ============================================

export interface PipelinePost {
  id: string;
  propertyId?: string;
  propertyCode?: string;
  content: string;
  imageUrl?: string;
  platforms: string[];
  scheduledAt: Date;
  status: 'scheduled' | 'published' | 'failed';
  accountIds: string[];
}

// ============================================
// SCHEDULE VIEW MODE
// ============================================

export type ScheduleViewMode = 'calendar' | 'pipeline';
