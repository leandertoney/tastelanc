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
