/**
 * Database type definitions
 * TODO: Generate from Supabase schema using `npx supabase gen types typescript`
 */

export type RestaurantCategory =
  | 'bars'
  | 'nightlife'
  | 'rooftops'
  | 'breakfast'
  | 'brunch'
  | 'lunch'
  | 'dinner'
  | 'desserts'
  | 'outdoor_dining';

export type CuisineType =
  | 'american_contemporary'
  | 'italian'
  | 'mediterranean'
  | 'asian'
  | 'latin'
  | 'seafood'
  | 'steakhouse'
  | 'pub_fare'
  | 'cafe'
  | 'breakfast'
  | 'brunch'
  | 'desserts';

export type EventType = 'live_music' | 'trivia' | 'karaoke' | 'dj' | 'comedy' | 'sports' | 'bingo' | 'other' | 'promotion';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type PremiumTier = 'basic' | 'premium' | 'elite';

export interface Tier {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  has_preferred_placement: boolean;
  has_analytics: boolean;
  has_events: boolean;
  has_happy_hours: boolean;
  has_specials: boolean;
  max_photos: number;
  created_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  zip_code: string | null;
  phone: string | null;
  website: string | null;
  menu_link: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  photos: string[] | null;
  description: string | null;
  categories: RestaurantCategory[];
  cuisine: CuisineType | null;
  is_active: boolean;
  is_verified: boolean;
  tier_id: string | null;
  average_rating: number | null;
  tastelancrating: number | null;
  tastelancrating_count: number;
  created_at: string;
  updated_at: string;
  // Google Places enrichment
  google_place_id: string | null;
  google_rating: number | null;
  google_review_count: number;
  google_review_highlights: string[] | null;
  // Enrichment fields
  price_range: string | null;
  signature_dishes: string[] | null;
  vibe_tags: string[] | null;
  best_for: string[] | null;
  neighborhood: string | null;
  parking_info: string | null;
  noise_level: string | null;
}

// Restaurant with tier data joined
export interface RestaurantWithTier extends Restaurant {
  tiers: Tier | null;
}

export interface RestaurantHours {
  id: string;
  restaurant_id: string;
  day_of_week: DayOfWeek;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export interface Event {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  event_type: EventType;
  is_recurring: boolean;
  days_of_week: DayOfWeek[];
  event_date: string | null;
  start_time: string;
  end_time: string | null;
  performer_name: string | null;
  cover_charge: number | null;
  image_url: string | null;
  is_active: boolean;
}

export interface HappyHour {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  days_of_week: DayOfWeek[];
  start_time: string;
  end_time: string;
  is_active: boolean;
  image_url: string | null;
  items?: HappyHourItem[];
}

export interface HappyHourItem {
  id: string;
  happy_hour_id: string;
  name: string;
  description: string | null;
  original_price: number | null;
  discounted_price: number | null;
  discount_description: string | null;
}

export interface Special {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  days_of_week: DayOfWeek[];
  start_time: string | null;
  end_time: string | null;
  original_price: number | null;
  special_price: number | null;
  image_url: string | null;
  is_active: boolean;
}

// Extended Restaurant type with related data for detail screen
export interface RestaurantWithDetails extends Restaurant {
  hours?: RestaurantHours[];
  happy_hours?: HappyHour[];
  specials?: Special[];
  events?: Event[];
}

// Spotlight special for homepage carousel
export interface SpotlightSpecial {
  id?: string;
  restaurantId?: string;
  title: string;
  restaurantName: string;
  timeWindow: string;
  imageUrl?: string;
  isPremium?: boolean;
}

// Cuisine display names
export const CUISINE_LABELS: Record<CuisineType, string> = {
  american_contemporary: 'American Contemporary',
  italian: 'Italian',
  mediterranean: 'Mediterranean',
  asian: 'Asian',
  latin: 'Latin',
  seafood: 'Seafood',
  steakhouse: 'Steakhouse',
  pub_fare: 'Pub Fare',
  cafe: 'Cafe & Coffee',
  breakfast: 'Breakfast',
  brunch: 'Brunch',
  desserts: 'Desserts',
};

export const ALL_CUISINES: CuisineType[] = [
  'breakfast',
  'brunch',
  'american_contemporary',
  'italian',
  'mediterranean',
  'asian',
  'latin',
  'seafood',
  'steakhouse',
  'pub_fare',
  'cafe',
  'desserts',
];

// Menu types
export type DietaryFlag = 'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'nut-free' | 'spicy';

export interface MenuItem {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  price: number | null;
  price_description: string | null;
  is_available: boolean;
  is_featured: boolean;
  dietary_flags: DietaryFlag[];
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuSection {
  id: string;
  menu_id: string;
  name: string;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  menu_items: MenuItem[];
}

export interface Menu {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  menu_sections: MenuSection[];
}

// Blog post from Rosie's Blog
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body_html: string;
  tags: string[];
  cover_image_url: string | null;
  cover_image_data: string | null;
  featured_restaurants: string[] | null;
  created_at: string;
  updated_at: string;
}

// User profile with premium subscription fields
export type PremiumSource = 'apple' | 'stripe' | null;

export interface Profile {
  id: string; // Supabase user UUID
  premium_active: boolean;
  premium_source: PremiumSource;
  premium_expires_at: string | null; // ISO timestamp
  created_at: string;
  updated_at: string;
}
