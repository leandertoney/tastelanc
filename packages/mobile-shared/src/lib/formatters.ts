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

// Feature display names
export const FEATURE_LABELS: Record<string, string> = {
  live_piano: 'Live Piano',
  live_band: 'Live Band',
  live_dj: 'Live DJ',
  trivia_nights: 'Trivia Nights',
  karaoke: 'Karaoke',
  comedy_shows: 'Comedy Shows',
  live_sports_viewing: 'Live Sports',
  arcade_games: 'Arcade/Games',
  board_games: 'Board Games',
  pool_tables: 'Pool Tables',
  private_dining: 'Private Dining',
  prix_fixe_menu: 'Prix Fixe Menu',
  tasting_menu: 'Tasting Menu',
  chefs_table: "Chef's Table",
  wine_pairing: 'Wine Pairing',
  beer_flights: 'Beer Flights',
  cocktail_menu: 'Cocktail Menu',
  seasonal_menu: 'Seasonal Menu',
  farm_to_table: 'Farm to Table',
  outdoor_patio: 'Outdoor Patio',
  heated_patio: 'Heated Patio',
  rooftop_seating: 'Rooftop Seating',
  fireplace: 'Fireplace',
  waterfront: 'Waterfront',
  garden_dining: 'Garden Dining',
  sidewalk_cafe: 'Sidewalk Cafe',
  covered_outdoor: 'Covered Outdoor',
  reservations: 'Reservations',
  walkins_welcome: 'Walk-ins Welcome',
  takeout: 'Takeout',
  delivery: 'Delivery',
  catering: 'Catering',
  event_space: 'Event Space',
  full_bar: 'Full Bar',
  byob_allowed: 'BYOB',
  valet_parking: 'Valet Parking',
  free_parking: 'Free Parking',
  street_parking: 'Street Parking',
  wheelchair_accessible: 'Wheelchair Accessible',
  high_chairs: 'High Chairs',
  kids_menu: 'Kids Menu',
  family_friendly: 'Family Friendly',
  pet_friendly_indoor: 'Pet Friendly (Indoor)',
  pet_friendly_patio: 'Pet Friendly (Patio)',
  vegan_options: 'Vegan Options',
  vegetarian_options: 'Vegetarian Options',
  gluten_free_options: 'Gluten-Free Options',
  halal: 'Halal',
  kosher: 'Kosher',
  allergy_friendly: 'Allergy Friendly',
};

// Feature icon mapping (Ionicons)
export const FEATURE_ICONS: Record<string, string> = {
  live_piano: 'musical-note-outline',
  live_band: 'musical-notes-outline',
  live_dj: 'headset-outline',
  trivia_nights: 'help-circle-outline',
  karaoke: 'mic-outline',
  comedy_shows: 'happy-outline',
  live_sports_viewing: 'football-outline',
  arcade_games: 'game-controller-outline',
  board_games: 'dice-outline',
  pool_tables: 'ellipse-outline',
  private_dining: 'lock-closed-outline',
  prix_fixe_menu: 'list-outline',
  tasting_menu: 'wine-outline',
  chefs_table: 'star-outline',
  wine_pairing: 'wine-outline',
  beer_flights: 'beer-outline',
  cocktail_menu: 'cafe-outline',
  seasonal_menu: 'leaf-outline',
  farm_to_table: 'nutrition-outline',
  outdoor_patio: 'sunny-outline',
  heated_patio: 'flame-outline',
  rooftop_seating: 'arrow-up-outline',
  fireplace: 'flame-outline',
  waterfront: 'water-outline',
  garden_dining: 'flower-outline',
  sidewalk_cafe: 'walk-outline',
  covered_outdoor: 'umbrella-outline',
  reservations: 'calendar-outline',
  walkins_welcome: 'walk-outline',
  takeout: 'bag-handle-outline',
  delivery: 'bicycle-outline',
  catering: 'fast-food-outline',
  event_space: 'people-outline',
  full_bar: 'wine-outline',
  byob_allowed: 'bag-outline',
  valet_parking: 'car-outline',
  free_parking: 'car-outline',
  street_parking: 'navigate-outline',
  wheelchair_accessible: 'accessibility-outline',
  high_chairs: 'resize-outline',
  kids_menu: 'happy-outline',
  family_friendly: 'people-outline',
  pet_friendly_indoor: 'paw-outline',
  pet_friendly_patio: 'paw-outline',
  vegan_options: 'leaf-outline',
  vegetarian_options: 'nutrition-outline',
  gluten_free_options: 'checkmark-circle-outline',
  halal: 'checkmark-circle-outline',
  kosher: 'checkmark-circle-outline',
  allergy_friendly: 'alert-circle-outline',
};

export function formatFeatureName(feature: string): string {
  if (FEATURE_LABELS[feature]) return FEATURE_LABELS[feature];
  return feature
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function getFeatureIconName(feature: string): string {
  return FEATURE_ICONS[feature] || 'ellipse-outline';
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
