import { addDays, addWeeks, format, setHours, setMinutes, startOfDay, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from 'date-fns';

export interface DateSuggestion {
  label: string;
  date: Date;
  value: string; // ISO string
}

export interface TimeSuggestion {
  label: string;
  value: string; // "HH:mm" format
  hours: number;
  minutes: number;
}

/**
 * Get date suggestions based on user input
 */
export function getDateSuggestions(input: string): DateSuggestion[] {
  const trimmed = input.trim().toLowerCase();
  const now = new Date();
  const suggestions: DateSuggestion[] = [];

  if (!trimmed) {
    // Default suggestions when empty
    const tomorrow = addDays(startOfDay(now), 1);
    const nextWeek = addWeeks(startOfDay(now), 1);

    suggestions.push(
      { label: 'Today', date: startOfDay(now), value: startOfDay(now).toISOString() },
      { label: `Tomorrow (${format(tomorrow, 'MMM d')})`, date: tomorrow, value: tomorrow.toISOString() },
      { label: `Next week (${format(nextWeek, 'MMM d')})`, date: nextWeek, value: nextWeek.toISOString() },
    );

    return suggestions;
  }

  // Check for weekday names
  const weekdayMap: Record<string, (date: Date) => Date> = {
    monday: nextMonday,
    mon: nextMonday,
    tuesday: nextTuesday,
    tue: nextTuesday,
    wednesday: nextWednesday,
    wed: nextWednesday,
    thursday: nextThursday,
    thu: nextThursday,
    friday: nextFriday,
    fri: nextFriday,
    saturday: nextSaturday,
    sat: nextSaturday,
    sunday: nextSunday,
    sun: nextSunday,
  };

  // Match weekday
  for (const [key, getNextDay] of Object.entries(weekdayMap)) {
    if (key.startsWith(trimmed)) {
      // Get next 4 occurrences of this weekday
      let currentDate = getNextDay(now);
      for (let i = 0; i < 4; i++) {
        suggestions.push({
          label: format(currentDate, 'EEEE, MMMM d'),
          date: currentDate,
          value: currentDate.toISOString(),
        });
        currentDate = addWeeks(currentDate, 1);
      }
      return suggestions;
    }
  }

  // Match month names
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  const monthMatch = monthNames.findIndex(m => m.startsWith(trimmed));
  if (monthMatch !== -1) {
    // Show upcoming dates in this month
    const targetMonth = monthMatch;
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // If month has passed, use next year
    const year = targetMonth < currentMonth ? currentYear + 1 : currentYear;

    // Suggest 1st, 15th, and last day of month
    const firstDay = new Date(year, targetMonth, 1);
    const midMonth = new Date(year, targetMonth, 15);
    const lastDay = new Date(year, targetMonth + 1, 0); // Last day of month

    suggestions.push(
      { label: format(firstDay, 'MMMM d, yyyy'), date: firstDay, value: firstDay.toISOString() },
      { label: format(midMonth, 'MMMM d, yyyy'), date: midMonth, value: midMonth.toISOString() },
      { label: format(lastDay, 'MMMM d, yyyy'), date: lastDay, value: lastDay.toISOString() },
    );

    return suggestions;
  }

  // Match "tomorrow", "today", "next week"
  if ('tomorrow'.startsWith(trimmed)) {
    const tomorrow = addDays(startOfDay(now), 1);
    suggestions.push({ label: `Tomorrow (${format(tomorrow, 'MMM d')})`, date: tomorrow, value: tomorrow.toISOString() });
  }

  if ('today'.startsWith(trimmed)) {
    suggestions.push({ label: 'Today', date: startOfDay(now), value: startOfDay(now).toISOString() });
  }

  if (trimmed.includes('next') || 'next week'.startsWith(trimmed)) {
    const nextWeek = addWeeks(startOfDay(now), 1);
    suggestions.push({ label: `Next week (${format(nextWeek, 'MMM d')})`, date: nextWeek, value: nextWeek.toISOString() });
  }

  return suggestions;
}

/**
 * Get time suggestions based on user input
 */
export function getTimeSuggestions(input: string): TimeSuggestion[] {
  const trimmed = input.trim();
  const suggestions: TimeSuggestion[] = [];

  if (!trimmed) {
    // Default suggestions: common posting times
    const commonTimes = [
      { hours: 6, minutes: 0, label: '6:00 AM' },
      { hours: 9, minutes: 0, label: '9:00 AM' },
      { hours: 12, minutes: 0, label: '12:00 PM' },
      { hours: 15, minutes: 0, label: '3:00 PM' },
      { hours: 18, minutes: 0, label: '6:00 PM' },
      { hours: 21, minutes: 0, label: '9:00 PM' },
    ];

    return commonTimes.map(t => ({
      ...t,
      value: `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}`,
    }));
  }

  // Parse number input (e.g., "04", "16", "4")
  const numMatch = trimmed.match(/^(\d{1,2})$/);
  if (numMatch) {
    const hour = parseInt(numMatch[1], 10);

    if (hour >= 0 && hour <= 23) {
      // Show 15-minute increments for this hour in both 12-hour and 24-hour
      const increments = [0, 15, 30, 45];

      // Add suggestions for AM (if hour is 0-12)
      if (hour <= 12) {
        increments.forEach(min => {
          const h = hour;
          const displayHour = h === 0 ? 12 : h;
          suggestions.push({
            hours: h,
            minutes: min,
            label: `${displayHour}:${String(min).padStart(2, '0')} AM`,
            value: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
          });
        });
      }

      // Add suggestions for PM (if hour is 1-12 or if military time 13-23)
      if (hour >= 1 && hour <= 12) {
        const pmHour = hour + 12;
        increments.forEach(min => {
          const displayHour = hour;
          suggestions.push({
            hours: pmHour,
            minutes: min,
            label: `${displayHour}:${String(min).padStart(2, '0')} PM`,
            value: `${String(pmHour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
          });
        });
      } else if (hour >= 13 && hour <= 23) {
        // Military time
        increments.forEach(min => {
          const displayHour = hour - 12;
          suggestions.push({
            hours: hour,
            minutes: min,
            label: `${displayHour}:${String(min).padStart(2, '0')} PM`,
            value: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
          });
        });
      }
    }
  }

  return suggestions;
}

/**
 * Combine date and time into a single Date object
 */
export function combineDateAndTime(dateIso: string, timeValue: string): Date {
  const date = new Date(dateIso);
  const [hours, minutes] = timeValue.split(':').map(Number);
  return setMinutes(setHours(date, hours), minutes);
}

/**
 * Format combined date/time for display
 */
export function formatScheduleDateTime(date: Date): string {
  return format(date, 'EEE, MMM d \'at\' h:mm a');
}
