/**
 * Event recurrence helpers — shared logic for weekly and monthly patterns.
 * Used by EntertainmentSection, EventsSection, useRightNow, itineraryGenerator,
 * prefetch, EventDetailScreen, ArtistDetailScreen, EntertainmentViewAllScreen.
 */

import type { DayOfWeek } from '../types/database';

export interface MonthlyPatternEntry {
  week: number; // 1-5 (1st through 5th weekday of the month)
  day: DayOfWeek;
}

// Minimal shape required by these helpers — works with ApiEvent, Event, etc.
export interface RecurringEvent {
  is_recurring: boolean;
  days_of_week: DayOfWeek[];
  recurrence_frequency?: string | null;
  monthly_pattern?: MonthlyPatternEntry[] | null;
  event_date?: string | null;
}

const DAY_SORT: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th'];

/**
 * Returns the nth-weekday-of-month for a given date.
 * E.g., April 6 2026 (a Monday) → { week: 1, day: 'monday' }
 */
export function getNthWeekdayOfMonth(date: Date): { week: number; day: DayOfWeek } {
  const dayOfWeek = date
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase() as DayOfWeek;
  const week = Math.ceil(date.getDate() / 7);
  return { week, day: dayOfWeek };
}

/**
 * Checks if an event occurs on a given date.
 * Handles one-time, weekly recurring, and monthly recurring.
 */
export function isRecurringEventOnDate(event: RecurringEvent, date: Date): boolean {
  if (!event.is_recurring) {
    const dateStr = date.toISOString().split('T')[0];
    return event.event_date === dateStr;
  }

  const frequency = event.recurrence_frequency || 'weekly';

  if (frequency === 'monthly' && event.monthly_pattern?.length) {
    const { week, day } = getNthWeekdayOfMonth(date);
    return event.monthly_pattern.some(p => p.week === week && p.day === day);
  }

  // Weekly (default)
  const dayOfWeek = date
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase() as DayOfWeek;
  return event.days_of_week.includes(dayOfWeek);
}

/**
 * Formats a human-readable recurrence label.
 * Weekly:  "Every Mon, Wed"
 * Monthly: "Every 1st Sun, 2nd & 4th Tue"
 * One-time: "Apr 13, 2026"
 */
export function formatRecurrenceLabel(event: RecurringEvent): string {
  if (!event.is_recurring) {
    if (event.event_date) {
      return new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return '';
  }

  const frequency = event.recurrence_frequency || 'weekly';

  if (frequency === 'monthly' && event.monthly_pattern?.length) {
    return formatMonthlyPattern(event.monthly_pattern);
  }

  // Weekly
  const dayAbbrevs = [...event.days_of_week]
    .sort((a, b) => (DAY_SORT[a] ?? 0) - (DAY_SORT[b] ?? 0))
    .map(d => d.charAt(0).toUpperCase() + d.slice(1, 3));
  return `Every ${dayAbbrevs.join(', ')}`;
}

function formatMonthlyPattern(pattern: MonthlyPatternEntry[]): string {
  // Group by day → "1st & 3rd Mon, 2nd Tue"
  const grouped = new Map<DayOfWeek, number[]>();
  for (const { week, day } of pattern) {
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(week);
  }

  const parts: string[] = [];
  const entries = [...grouped.entries()].sort((a, b) => {
    return Math.min(...a[1]) - Math.min(...b[1]) || (DAY_SORT[a[0]] ?? 0) - (DAY_SORT[b[0]] ?? 0);
  });

  for (const [day, weeks] of entries) {
    weeks.sort((a, b) => a - b);
    const abbr = day.charAt(0).toUpperCase() + day.slice(1, 3);
    const weekStr = weeks.map(w => ORDINALS[w] || `${w}th`).join(' & ');
    parts.push(`${weekStr} ${abbr}`);
  }

  return `Every ${parts.join(', ')}`;
}
