import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a price for display
 */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

/**
 * Format a time string (HH:MM:SS) for display
 */
export function formatTime(time: string | null): string {
  if (!time) return '';
  // Special case for midnight
  if (time === '00:00' || time === '00:00:00') return 'Midnight';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Get the current day of week
 */
export function getCurrentDayOfWeek(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

/**
 * Check if a restaurant is currently open
 */
export function isCurrentlyOpen(
  hours: { day_of_week: string; open_time: string | null; close_time: string | null; is_closed: boolean }[]
): boolean {
  const today = getCurrentDayOfWeek();
  const todayHours = hours.find(h => h.day_of_week === today);

  if (!todayHours || todayHours.is_closed || !todayHours.open_time || !todayHours.close_time) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

  return currentTime >= todayHours.open_time && currentTime <= todayHours.close_time;
}

/**
 * Capitalize first letter of each word
 */
export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Generate a slug from a string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
