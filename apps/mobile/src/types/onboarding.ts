export type UserType = 'local' | 'visitor' | null;

export interface OnboardingData {
  userType: UserType;
  name: string | null;
  frequency: string | null;
  discoverySource: string | null;
  eventPreferences: string[];
  budget: string | null;
  entertainmentPreferences: string[];
  foodPreferences: string[];
}

export const ONBOARDING_STORAGE_KEY = 'onboarding_completed';
export const ONBOARDING_DATA_KEY = 'onboarding_data';

export const FREQUENCY_OPTIONS = [
  'Every day',
  'A few times a week',
  'Once a week',
  'Once a month',
  'Just exploring',
];

export const DISCOVERY_OPTIONS = [
  'Instagram',
  'Facebook',
  'TikTok',
  'Friend',
  'ChatGPT / AI',
  'Bar / Restaurant',
  'Google',
  'Other',
];

export const BUDGET_OPTIONS = ['$', '$$', '$$$'];

export const ENTERTAINMENT_OPTIONS = [
  'Date night',
  'Casual hangout',
  'After work drinks',
  'Weekend brunch',
  'Late night eats',
  'Special occasion',
];

export const FOOD_OPTIONS = [
  'Modern American',
  'Italian',
  'Mediterranean',
  'Asian',
  'Latin',
  'Seafood',
  'Steakhouse',
  'Pub Food',
];

// Map food preference labels to cuisine types for database queries
export const FOOD_PREFERENCE_TO_CUISINE: Record<string, string> = {
  'Modern American': 'american_contemporary',
  'Italian': 'italian',
  'Mediterranean': 'mediterranean',
  'Asian': 'asian',
  'Latin': 'latin',
  'Seafood': 'seafood',
  'Steakhouse': 'steakhouse',
  'Pub Food': 'pub_fare',
};

export const EVENT_OPTIONS = [
  'Live Music',
  'Trivia',
  'Comedy',
  'Sports',
  'Wine Tastings',
  'Networking',
  'Karaoke',
  'DJ Nights',
];
