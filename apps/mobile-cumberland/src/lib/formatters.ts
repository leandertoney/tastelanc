/**
 * Label formatting utilities for displaying database values
 */

// Category display names
export const CATEGORY_LABELS: Record<string, string> = {
  bars: 'Bar',
  nightlife: 'Nightlife',
  rooftops: 'Rooftop',
  brunch: 'Brunch',
  lunch: 'Lunch',
  dinner: 'Dinner',
  outdoor_dining: 'Outdoor Dining',
  cafe_coffee: 'Cafe & Coffee',
  delis_sandwiches: 'Deli & Sandwiches',
  bakery: 'Bakery',
  breakfast: 'Breakfast',
  fast_casual: 'Fast Casual',
  fine_dining: 'Fine Dining',
  food_truck: 'Food Truck',
  buffet: 'Buffet',
  pizza: 'Pizza',
  seafood: 'Seafood',
  steakhouse: 'Steakhouse',
  sushi: 'Sushi',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
};

// Cuisine display names
export const CUISINE_LABELS: Record<string, string> = {
  american_contemporary: 'American',
  italian: 'Italian',
  mediterranean: 'Mediterranean',
  asian: 'Asian',
  latin: 'Latin',
  seafood: 'Seafood',
  steakhouse: 'Steakhouse',
  pub_fare: 'Pub Fare',
  cafe: 'Cafe & Coffee',
};

/**
 * Format a category name for display
 * Uses the CATEGORY_LABELS map, falls back to converting snake_case to Title Case
 */
export function formatCategoryName(category: string): string {
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  // Convert snake_case to Title Case (e.g., "cafe_coffee" -> "Cafe Coffee")
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format a cuisine name for display
 * Uses the CUISINE_LABELS map, falls back to converting snake_case to Title Case
 */
export function formatCuisineName(cuisine: string): string {
  if (CUISINE_LABELS[cuisine]) return CUISINE_LABELS[cuisine];
  // Convert snake_case to Title Case
  return cuisine
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Vibe tag emoji mapping
const VIBE_EMOJI: Record<string, string> = {
  romantic: '\u{1F495}',
  trendy: '\u{1F525}',
  intimate: '\u{1F56F}\uFE0F',
  loud: '\u{1F50A}',
  casual: '\u270C\uFE0F',
  upscale: '\u2728',
  cozy: '\u{1F3E0}',
  lively: '\u{1F389}',
  chill: '\u{1F60E}',
  'family-friendly': '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}',
  elegant: '\u{1F947}',
  eclectic: '\u{1F308}',
  rustic: '\u{1F33F}',
};

export function getVibeEmoji(tag: string): string {
  return VIBE_EMOJI[tag.toLowerCase()] || '\u2B50';
}

// Best-for emoji mapping
const BEST_FOR_EMOJI: Record<string, string> = {
  'date-night': '\u{1F491}',
  families: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}',
  groups: '\u{1F465}',
  solo: '\u{1F9D1}',
  business: '\u{1F4BC}',
  celebrations: '\u{1F389}',
  'happy-hour': '\u{1F37B}',
  brunch: '\u{1F942}',
  'late-night': '\u{1F303}',
  casual: '\u270C\uFE0F',
};

export function getBestForEmoji(value: string): string {
  return BEST_FOR_EMOJI[value.toLowerCase()] || '\u2705';
}

/**
 * Format a tag label for display (dash-case to Title Case)
 */
export function formatTagLabel(tag: string): string {
  return tag
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get Ionicons icon name for noise level
 */
export function getNoiseIcon(level: string): string {
  switch (level?.toLowerCase()) {
    case 'quiet': return 'volume-low-outline';
    case 'moderate': return 'volume-medium-outline';
    case 'loud': return 'volume-high-outline';
    default: return 'volume-medium-outline';
  }
}

/**
 * Format noise level for display
 */
export function formatNoiseLevel(level: string): string {
  switch (level?.toLowerCase()) {
    case 'quiet': return 'Quiet';
    case 'moderate': return 'Moderate';
    case 'loud': return 'Lively';
    default: return level;
  }
}

/**
 * Format time from 24-hour format (HH:MM) to 12-hour format (h:MM AM/PM)
 * Examples: "17:00" -> "5:00 PM", "09:30" -> "9:30 AM", "00:00" -> "Midnight"
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '';

  // Special case for midnight
  if (time === '00:00' || time === '00:00:00') return 'Midnight';

  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';

  if (isNaN(hour)) return time;

  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  return `${hour12}:${minute} ${period}`;
}
