import {
  addDays,
  addHours,
  addMinutes,
  addWeeks,
  setHours,
  setMinutes,
  setMonth,
  setDate,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  startOfDay,
  isToday,
  isTomorrow,
  format,
} from 'date-fns';

export interface ParsedDateTime {
  date: Date;
  isNow: boolean;
  formatted: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Parse natural language date/time strings into Date objects
 *
 * Supported formats:
 * - "now" -> immediately
 * - "tomorrow" -> tomorrow at 9am
 * - "tomorrow 9am", "tomorrow 2pm" -> specific time
 * - "monday", "tuesday", etc. -> next occurrence at 9am
 * - "monday 3pm" -> next occurrence at specific time
 * - "next week" -> 7 days from now at 9am
 * - "in 2 hours", "in 30 minutes" -> relative time
 * - "9am", "2:30pm", "14:00" -> today if future, tomorrow if past
 * - "January 13 6am", "Jan 15 3pm" -> absolute dates with time
 * - "1/13 9am", "12/25 2pm" -> numeric dates with time
 */
export function parseDateTimeString(input: string): ParsedDateTime | null {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) {
    return null;
  }

  // "now" - immediate
  if (trimmed === 'now') {
    return {
      date: new Date(),
      isNow: true,
      formatted: 'Now',
      confidence: 'high',
    };
  }

  const now = new Date();

  // "today" or "today 9am" patterns
  if (trimmed === 'today' || trimmed.startsWith('today ')) {
    const result = parseTodayPattern(trimmed, now);
    if (result) {
      return {
        date: result,
        isNow: false,
        formatted: formatParsedDate(result),
        confidence: 'high',
      };
    }
  }
  let result: Date | null = null;
  let confidence: 'high' | 'medium' | 'low' = 'medium';

  // Try different patterns in order of specificity
  result = parseAbsoluteDatePattern(trimmed, now);
  if (result) {
    confidence = 'high';
  }

  if (!result) {
    result = parseTomorrowPattern(trimmed, now);
    if (result) confidence = 'high';
  }

  if (!result) {
    result = parseWeekdayPattern(trimmed, now);
    if (result) confidence = 'high';
  }

  if (!result) {
    result = parseRelativePattern(trimmed, now);
    if (result) confidence = 'high';
  }

  if (!result) {
    result = parseNextWeekPattern(trimmed, now);
    if (result) confidence = 'high';
  }

  if (!result) {
    result = parseTimeOnlyPattern(trimmed, now);
    if (result) confidence = 'medium';
  }

  if (!result) {
    return null;
  }

  return {
    date: result,
    isNow: false,
    formatted: formatParsedDate(result),
    confidence,
  };
}

/**
 * Parse absolute date patterns like "January 13 6am", "Jan 15 3pm", "1/13 9am"
 */
function parseAbsoluteDatePattern(input: string, now: Date): Date | null {
  const monthNames: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };

  // Pattern 1: "January 13 6am", "Jan 15 3pm"
  const monthDayMatch = input.match(/^(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/i);

  if (monthDayMatch) {
    const month = monthNames[monthDayMatch[1].toLowerCase()];
    const day = parseInt(monthDayMatch[2], 10);

    // Start with current year
    let targetDate = setMonth(setDate(startOfDay(now), day), month);

    // If the date has passed this year, use next year
    if (targetDate < startOfDay(now)) {
      targetDate = new Date(targetDate.getFullYear() + 1, month, day);
    }

    // Apply time if provided
    if (monthDayMatch[3]) {
      targetDate = applyTime(targetDate, [monthDayMatch[0], monthDayMatch[3], monthDayMatch[4], monthDayMatch[5]]);
    } else {
      // Default to 9am
      targetDate = setHours(setMinutes(targetDate, 0), 9);
    }

    return targetDate;
  }

  // Pattern 2: "1/13 9am", "12/25 2pm", "3/5 10:30am"
  const numericDateMatch = input.match(/^(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/);

  if (numericDateMatch) {
    const month = parseInt(numericDateMatch[1], 10) - 1; // 0-indexed
    const day = parseInt(numericDateMatch[2], 10);

    // Start with current year
    let targetDate = new Date(now.getFullYear(), month, day);

    // If the date has passed this year, use next year
    if (targetDate < startOfDay(now)) {
      targetDate = new Date(now.getFullYear() + 1, month, day);
    }

    // Apply time if provided
    if (numericDateMatch[3]) {
      targetDate = applyTime(targetDate, [numericDateMatch[0], numericDateMatch[3], numericDateMatch[4], numericDateMatch[5]]);
    } else {
      // Default to 9am
      targetDate = setHours(setMinutes(targetDate, 0), 9);
    }

    return targetDate;
  }

  return null;
}

/**
 * Parse "today" or "today 9am" patterns
 */
function parseTodayPattern(input: string, now: Date): Date | null {
  if (!input.startsWith('today')) {
    return null;
  }

  const today = startOfDay(now);
  const timeMatch = input.match(/today\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

  if (timeMatch) {
    return applyTime(today, timeMatch);
  }

  // Default to 9am
  return setHours(setMinutes(today, 0), 9);
}

/**
 * Parse "tomorrow" or "tomorrow 9am" patterns
 */
function parseTomorrowPattern(input: string, now: Date): Date | null {
  if (!input.startsWith('tomorrow')) {
    return null;
  }

  const tomorrow = addDays(startOfDay(now), 1);
  const timeMatch = input.match(/tomorrow\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

  if (timeMatch) {
    return applyTime(tomorrow, timeMatch);
  }

  // Default to 9am
  return setHours(setMinutes(tomorrow, 0), 9);
}

/**
 * Parse weekday patterns like "monday", "tuesday 3pm"
 */
function parseWeekdayPattern(input: string, now: Date): Date | null {
  const weekdayMap: Record<string, (date: Date) => Date> = {
    monday: nextMonday,
    mon: nextMonday,
    tuesday: nextTuesday,
    tue: nextTuesday,
    tues: nextTuesday,
    wednesday: nextWednesday,
    wed: nextWednesday,
    thursday: nextThursday,
    thu: nextThursday,
    thur: nextThursday,
    friday: nextFriday,
    fri: nextFriday,
    saturday: nextSaturday,
    sat: nextSaturday,
    sunday: nextSunday,
    sun: nextSunday,
  };

  // Extract weekday and optional time
  const match = input.match(/^(monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|friday|fri|saturday|sat|sunday|sun)(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/i);

  if (!match) {
    return null;
  }

  const weekday = match[1].toLowerCase();
  const getNextDay = weekdayMap[weekday];

  if (!getNextDay) {
    return null;
  }

  let targetDay = getNextDay(now);

  // Apply time if provided
  if (match[2]) {
    targetDay = applyTime(targetDay, [match[0], match[2], match[3], match[4]]);
  } else {
    // Default to 9am
    targetDay = setHours(setMinutes(targetDay, 0), 9);
  }

  return targetDay;
}

/**
 * Parse relative patterns like "in 2 hours", "in 30 minutes"
 */
function parseRelativePattern(input: string, now: Date): Date | null {
  const match = input.match(/^in\s+(\d+)\s+(hour|hours|hr|hrs|minute|minutes|min|mins|day|days)$/i);

  if (!match) {
    return null;
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (unit.startsWith('hour') || unit.startsWith('hr')) {
    return addHours(now, amount);
  }

  if (unit.startsWith('minute') || unit.startsWith('min')) {
    return addMinutes(now, amount);
  }

  if (unit.startsWith('day')) {
    return addDays(setHours(setMinutes(now, 0), 9), amount);
  }

  return null;
}

/**
 * Parse "next week" pattern
 */
function parseNextWeekPattern(input: string, now: Date): Date | null {
  if (input === 'next week') {
    const nextWeek = addWeeks(startOfDay(now), 1);
    return setHours(setMinutes(nextWeek, 0), 9);
  }

  return null;
}

/**
 * Parse time-only patterns like "9am", "2:30pm", "14:00"
 * If the time has already passed today, use tomorrow
 */
function parseTimeOnlyPattern(input: string, now: Date): Date | null {
  const match = input.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);

  if (!match) {
    return null;
  }

  let targetDay = startOfDay(now);
  targetDay = applyTime(targetDay, match);

  // If time has passed, use tomorrow
  if (targetDay <= now) {
    targetDay = addDays(targetDay, 1);
  }

  return targetDay;
}

/**
 * Apply time from regex match to a date
 */
function applyTime(date: Date, match: (string | undefined)[]): Date {
  let hours = parseInt(match[1] || '9', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const meridiem = (match[3] || '').toLowerCase();

  // Handle 12-hour format
  if (meridiem === 'pm' && hours < 12) {
    hours += 12;
  } else if (meridiem === 'am' && hours === 12) {
    hours = 0;
  }

  return setMinutes(setHours(date, hours), minutes);
}

/**
 * Format a parsed date for display
 */
function formatParsedDate(date: Date): string {
  const now = new Date();

  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  }

  if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'h:mm a')}`;
  }

  // Within a week
  const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 7) {
    return `${format(date, 'EEEE')} at ${format(date, 'h:mm a')}`;
  }

  // Further out
  return format(date, 'MMM d at h:mm a');
}

/**
 * Validate and get a formatted preview of the parsed date
 */
export function getDatePreview(input: string): string | null {
  if (!input.trim()) {
    return null;
  }

  if (input.toLowerCase().trim() === 'now') {
    return 'Publish immediately';
  }

  const parsed = parseDateTimeString(input);
  if (parsed) {
    return parsed.formatted;
  }

  return null;
}

/**
 * Convert parsed date to ISO string for API
 */
export function toScheduleDate(input: string): string | undefined {
  if (!input.trim() || input.toLowerCase().trim() === 'now') {
    return undefined;
  }

  const parsed = parseDateTimeString(input);
  return parsed?.date.toISOString();
}
