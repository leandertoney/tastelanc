/**
 * Shared constants for TasteLanc
 * Used by both web and mobile apps
 */

import { RestaurantCategory, RestaurantFeature } from './types';

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
  { value: 'breakfast', label: 'Breakfast', group: 'cuisines' },
  { value: 'brunch', label: 'Brunch', group: 'cuisines' },
  { value: 'desserts', label: 'Desserts', group: 'cuisines' },

  // Meal Time
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
// FEATURE DEFINITIONS
// ============================================

export interface FeatureDefinition {
  value: RestaurantFeature;
  label: string;
  icon: string; // Ionicons name for mobile, can be mapped to lucide on web
}

export type FeatureGroupKey = 'entertainment' | 'dining_experience' | 'space_atmosphere' | 'services' | 'accessibility_family' | 'dietary';

export interface FeatureGroup {
  key: FeatureGroupKey;
  label: string;
  icon: string;
  features: FeatureDefinition[];
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    key: 'entertainment',
    label: 'Entertainment',
    icon: 'musical-notes-outline',
    features: [
      { value: 'live_piano', label: 'Live Piano', icon: 'musical-note-outline' },
      { value: 'live_band', label: 'Live Band', icon: 'musical-notes-outline' },
      { value: 'live_dj', label: 'Live DJ', icon: 'headset-outline' },
      { value: 'trivia_nights', label: 'Trivia Nights', icon: 'help-circle-outline' },
      { value: 'karaoke', label: 'Karaoke', icon: 'mic-outline' },
      { value: 'comedy_shows', label: 'Comedy Shows', icon: 'happy-outline' },
      { value: 'live_sports_viewing', label: 'Live Sports', icon: 'football-outline' },
      { value: 'arcade_games', label: 'Arcade/Games', icon: 'game-controller-outline' },
      { value: 'board_games', label: 'Board Games', icon: 'dice-outline' },
      { value: 'pool_tables', label: 'Pool Tables', icon: 'ellipse-outline' },
    ],
  },
  {
    key: 'dining_experience',
    label: 'Dining Experience',
    icon: 'restaurant-outline',
    features: [
      { value: 'private_dining', label: 'Private Dining', icon: 'lock-closed-outline' },
      { value: 'prix_fixe_menu', label: 'Prix Fixe Menu', icon: 'list-outline' },
      { value: 'tasting_menu', label: 'Tasting Menu', icon: 'wine-outline' },
      { value: 'chefs_table', label: "Chef's Table", icon: 'star-outline' },
      { value: 'wine_pairing', label: 'Wine Pairing', icon: 'wine-outline' },
      { value: 'beer_flights', label: 'Beer Flights', icon: 'beer-outline' },
      { value: 'cocktail_menu', label: 'Cocktail Menu', icon: 'cafe-outline' },
      { value: 'seasonal_menu', label: 'Seasonal Menu', icon: 'leaf-outline' },
      { value: 'farm_to_table', label: 'Farm to Table', icon: 'nutrition-outline' },
    ],
  },
  {
    key: 'space_atmosphere',
    label: 'Space & Atmosphere',
    icon: 'sunny-outline',
    features: [
      { value: 'outdoor_patio', label: 'Outdoor Patio', icon: 'sunny-outline' },
      { value: 'heated_patio', label: 'Heated Patio', icon: 'flame-outline' },
      { value: 'rooftop_seating', label: 'Rooftop Seating', icon: 'arrow-up-outline' },
      { value: 'fireplace', label: 'Fireplace', icon: 'flame-outline' },
      { value: 'waterfront', label: 'Waterfront', icon: 'water-outline' },
      { value: 'garden_dining', label: 'Garden Dining', icon: 'flower-outline' },
      { value: 'sidewalk_cafe', label: 'Sidewalk Cafe', icon: 'walk-outline' },
      { value: 'covered_outdoor', label: 'Covered Outdoor', icon: 'umbrella-outline' },
    ],
  },
  {
    key: 'services',
    label: 'Services',
    icon: 'construct-outline',
    features: [
      { value: 'reservations', label: 'Reservations', icon: 'calendar-outline' },
      { value: 'walkins_welcome', label: 'Walk-ins Welcome', icon: 'walk-outline' },
      { value: 'takeout', label: 'Takeout', icon: 'bag-handle-outline' },
      { value: 'delivery', label: 'Delivery', icon: 'bicycle-outline' },
      { value: 'catering', label: 'Catering', icon: 'fast-food-outline' },
      { value: 'event_space', label: 'Event Space', icon: 'people-outline' },
      { value: 'full_bar', label: 'Full Bar', icon: 'wine-outline' },
      { value: 'byob_allowed', label: 'BYOB', icon: 'bag-outline' },
      { value: 'valet_parking', label: 'Valet Parking', icon: 'car-outline' },
      { value: 'free_parking', label: 'Free Parking', icon: 'car-outline' },
      { value: 'street_parking', label: 'Street Parking', icon: 'navigate-outline' },
    ],
  },
  {
    key: 'accessibility_family',
    label: 'Accessibility & Family',
    icon: 'accessibility-outline',
    features: [
      { value: 'wheelchair_accessible', label: 'Wheelchair Accessible', icon: 'accessibility-outline' },
      { value: 'high_chairs', label: 'High Chairs', icon: 'resize-outline' },
      { value: 'kids_menu', label: 'Kids Menu', icon: 'happy-outline' },
      { value: 'family_friendly', label: 'Family Friendly', icon: 'people-outline' },
      { value: 'pet_friendly_indoor', label: 'Pet Friendly (Indoor)', icon: 'paw-outline' },
      { value: 'pet_friendly_patio', label: 'Pet Friendly (Patio)', icon: 'paw-outline' },
    ],
  },
  {
    key: 'dietary',
    label: 'Dietary Accommodations',
    icon: 'nutrition-outline',
    features: [
      { value: 'vegan_options', label: 'Vegan Options', icon: 'leaf-outline' },
      { value: 'vegetarian_options', label: 'Vegetarian Options', icon: 'nutrition-outline' },
      { value: 'gluten_free_options', label: 'Gluten-Free Options', icon: 'checkmark-circle-outline' },
      { value: 'halal', label: 'Halal', icon: 'checkmark-circle-outline' },
      { value: 'kosher', label: 'Kosher', icon: 'checkmark-circle-outline' },
      { value: 'allergy_friendly', label: 'Allergy Friendly', icon: 'alert-circle-outline' },
    ],
  },
];

export const ALL_FEATURES: FeatureDefinition[] = FEATURE_GROUPS.flatMap(g => g.features);

export function getFeatureLabel(feature: RestaurantFeature | string): string {
  const def = ALL_FEATURES.find(f => f.value === feature);
  return def?.label || feature.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function getFeatureIcon(feature: RestaurantFeature | string): string {
  const def = ALL_FEATURES.find(f => f.value === feature);
  return def?.icon || 'ellipse-outline';
}

export function getAllFeatureValues(): RestaurantFeature[] {
  return ALL_FEATURES.map(f => f.value);
}

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
  bingo: 'Bingo',
  music_bingo: 'Music Bingo',
  poker: 'Poker',
  other: 'Other',
};

export function getEventTypeLabel(type: string): string {
  return EVENT_TYPE_LABELS[type] || type;
}
