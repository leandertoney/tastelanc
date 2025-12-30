/**
 * Shared constants for TasteLanc
 * Used by both web and mobile apps
 */

import { RestaurantCategory } from './types';

// ============================================
// CATEGORY DEFINITIONS
// ============================================

export interface CategoryDefinition {
  value: RestaurantCategory;
  label: string;
  group: CategoryGroup;
}

export type CategoryGroup = 'cuisines' | 'meal_time' | 'dining_style' | 'drinks' | 'features';

export const CATEGORY_GROUPS: Record<CategoryGroup, string> = {
  cuisines: 'Cuisines',
  meal_time: 'Meal Time',
  dining_style: 'Dining Style',
  drinks: 'Drinks & Bars',
  features: 'Features',
};

export const ALL_CATEGORIES: CategoryDefinition[] = [
  // Cuisines
  { value: 'american', label: 'American', group: 'cuisines' },
  { value: 'italian', label: 'Italian', group: 'cuisines' },
  { value: 'mexican', label: 'Mexican', group: 'cuisines' },
  { value: 'chinese', label: 'Chinese', group: 'cuisines' },
  { value: 'japanese_sushi', label: 'Japanese/Sushi', group: 'cuisines' },
  { value: 'thai', label: 'Thai', group: 'cuisines' },
  { value: 'indian', label: 'Indian', group: 'cuisines' },
  { value: 'mediterranean', label: 'Mediterranean', group: 'cuisines' },
  { value: 'vietnamese', label: 'Vietnamese', group: 'cuisines' },
  { value: 'korean', label: 'Korean', group: 'cuisines' },
  { value: 'caribbean', label: 'Caribbean', group: 'cuisines' },
  { value: 'bbq', label: 'BBQ', group: 'cuisines' },
  { value: 'seafood', label: 'Seafood', group: 'cuisines' },
  { value: 'steakhouse', label: 'Steakhouse', group: 'cuisines' },
  { value: 'pizza', label: 'Pizza', group: 'cuisines' },
  { value: 'deli_sandwiches', label: 'Deli & Sandwiches', group: 'cuisines' },
  { value: 'pa_dutch', label: 'PA Dutch/Amish', group: 'cuisines' },

  // Meal Time
  { value: 'brunch', label: 'Brunch', group: 'meal_time' },
  { value: 'lunch', label: 'Lunch', group: 'meal_time' },
  { value: 'dinner', label: 'Dinner', group: 'meal_time' },
  { value: 'late_night', label: 'Late Night', group: 'meal_time' },

  // Dining Style
  { value: 'fine_dining', label: 'Fine Dining', group: 'dining_style' },
  { value: 'casual', label: 'Casual Dining', group: 'dining_style' },
  { value: 'fast_casual', label: 'Fast Casual', group: 'dining_style' },
  { value: 'food_truck', label: 'Food Truck', group: 'dining_style' },
  { value: 'cafe_coffee', label: 'Cafe & Coffee', group: 'dining_style' },
  { value: 'bakery', label: 'Bakery', group: 'dining_style' },
  { value: 'desserts', label: 'Desserts & Ice Cream', group: 'dining_style' },

  // Drinks & Bars
  { value: 'bars', label: 'Bars', group: 'drinks' },
  { value: 'nightlife', label: 'Nightlife', group: 'drinks' },
  { value: 'brewery', label: 'Brewery', group: 'drinks' },
  { value: 'winery', label: 'Winery', group: 'drinks' },
  { value: 'distillery', label: 'Distillery', group: 'drinks' },
  { value: 'cocktail_bar', label: 'Cocktail Bar', group: 'drinks' },

  // Features
  { value: 'outdoor_dining', label: 'Outdoor Dining', group: 'features' },
  { value: 'rooftops', label: 'Rooftop', group: 'features' },
  { value: 'live_music', label: 'Live Music', group: 'features' },
  { value: 'sports_bar', label: 'Sports Bar', group: 'features' },
  { value: 'pet_friendly', label: 'Pet Friendly', group: 'features' },
  { value: 'byob', label: 'BYOB', group: 'features' },
  { value: 'family_friendly', label: 'Family Friendly', group: 'features' },
  { value: 'date_night', label: 'Date Night', group: 'features' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getCategoriesByGroup(group: CategoryGroup): CategoryDefinition[] {
  return ALL_CATEGORIES.filter((cat) => cat.group === group);
}

export function getCategoryLabel(value: RestaurantCategory): string {
  const category = ALL_CATEGORIES.find((cat) => cat.value === value);
  return category?.label || value.replace(/_/g, ' ');
}

export function getAllCategoryValues(): RestaurantCategory[] {
  return ALL_CATEGORIES.map((cat) => cat.value);
}

// Grouped categories for UI display
export const CATEGORIES_BY_GROUP = {
  cuisines: getCategoriesByGroup('cuisines'),
  meal_time: getCategoriesByGroup('meal_time'),
  dining_style: getCategoriesByGroup('dining_style'),
  drinks: getCategoriesByGroup('drinks'),
  features: getCategoriesByGroup('features'),
};

// Simple flat list for forms
export const CATEGORY_OPTIONS = ALL_CATEGORIES.map((cat) => ({
  value: cat.value,
  label: cat.label,
}));

// ============================================
// DAY OF WEEK HELPERS
// ============================================

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export function getDayLabel(day: string): string {
  return DAY_LABELS[day] || day;
}

// ============================================
// EVENT TYPE HELPERS
// ============================================

export const EVENT_TYPE_LABELS: Record<string, string> = {
  live_music: 'Live Music',
  trivia: 'Trivia',
  karaoke: 'Karaoke',
  dj: 'DJ',
  comedy: 'Comedy',
  sports: 'Sports',
  other: 'Other',
};

export function getEventTypeLabel(type: string): string {
  return EVENT_TYPE_LABELS[type] || type;
}
