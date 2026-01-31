import type { LucideIcon } from 'lucide-react';
import type { DayOfWeek, EventType } from '@/types/database';

// Re-export for convenience
export type { DayOfWeek, EventType };

// Wizard Infrastructure
export interface WizardStepProps {
  isActive: boolean;
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export interface StepConfig {
  id: string;
  title: string;
  subtitle?: string;
}

// Time Picker
export interface TimePreset {
  label: string;
  time: string;
  icon?: LucideIcon;
}

export interface TimeSlot {
  value: string;      // "16:00"
  display: string;    // "4:00 PM"
}

// Day Selector
export interface DayQuickSelect {
  label: string;
  days: DayOfWeek[];
}

export const DAY_QUICK_SELECTS: DayQuickSelect[] = [
  { label: 'Weekdays', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
  { label: 'Weekends', days: ['saturday', 'sunday'] },
  { label: 'Every Day', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
];

export const DAYS_ORDERED: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

// Templates
export interface Template<T = Record<string, unknown>> {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  defaults: T;
}

// Form Data Types
export interface EventFormData {
  name: string;
  event_type: EventType;
  description: string;
  performer_name: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  days_of_week: DayOfWeek[];
  event_date: string;
  image_url?: string;
}

export interface HappyHourFormData {
  name: string;
  description: string;
  days_of_week: DayOfWeek[];
  start_time: string;
  end_time: string;
  image_url?: string;
}

export interface SpecialFormData {
  name: string;
  description: string;
  days_of_week: DayOfWeek[];
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  original_price: string;
  special_price: string;
  discount_description: string;
  is_recurring: boolean;
  image_url?: string;
}

// Smart Defaults
export interface SmartDefault {
  time: string;
  endTime?: string;
  days: DayOfWeek[];
  duration?: number;  // minutes
}

export interface SmartSuggestionData {
  suggestion: SmartDefault;
  message: string;
}

// Smart defaults configuration by event type
export const SMART_DEFAULTS: Record<EventType, SmartDefault> = {
  trivia: { time: '19:00', days: ['wednesday'], duration: 120 },
  live_music: { time: '20:00', days: ['friday', 'saturday'], duration: 180 },
  karaoke: { time: '21:00', days: ['thursday', 'friday'], duration: 180 },
  dj: { time: '22:00', days: ['friday', 'saturday'], duration: 240 },
  comedy: { time: '20:00', days: ['friday', 'saturday'], duration: 120 },
  sports: { time: '12:00', days: ['sunday'], duration: 240 },
  other: { time: '19:00', days: ['friday'], duration: 120 },
};

export const HAPPY_HOUR_DEFAULT: SmartDefault = {
  time: '16:00',
  endTime: '18:00',
  days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
};

// Time presets
export const TIME_PRESETS: TimePreset[] = [
  { label: 'Lunch', time: '12:00' },
  { label: 'Happy Hour', time: '16:00' },
  { label: 'Evening', time: '19:00' },
  { label: 'Late Night', time: '21:00' },
];

// Generate time slots (30-minute increments)
export function generateTimeSlots(
  startHour = 6,
  endHour = 24,
  increment = 30,
  includeMidnight = false
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += increment) {
      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const h = hour % 12 || 12;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const display = `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
      slots.push({ value, display });
    }
  }

  // Add midnight option at the end for end times (represents next day)
  if (includeMidnight) {
    slots.push({ value: '00:00', display: 'Midnight' });
  }

  return slots;
}

// Format time for display
export function formatTimeDisplay(time: string): string {
  if (!time) return '';
  // Special case for midnight
  if (time === '00:00') return 'Midnight';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours) % 12 || 12;
  const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
  return `${h}:${minutes} ${ampm}`;
}

// Calculate end time from duration
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}
