/**
 * Shared type definitions for TasteLanc
 * Used by both web and mobile apps
 */

// ============================================
// ENUMS
// ============================================

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type EventType = 'live_music' | 'trivia' | 'karaoke' | 'dj' | 'comedy' | 'sports' | 'bingo' | 'music_bingo' | 'poker' | 'other';

export type RestaurantCategory =
  // Existing
  | 'bars' | 'nightlife' | 'rooftops' | 'lunch' | 'dinner' | 'outdoor_dining'
  // Cuisines
  | 'american' | 'italian' | 'mexican' | 'chinese' | 'japanese_sushi' | 'thai'
  | 'indian' | 'mediterranean' | 'vietnamese' | 'korean' | 'caribbean' | 'bbq'
  | 'seafood' | 'steakhouse' | 'pizza' | 'deli_sandwiches' | 'pa_dutch'
  | 'breakfast' | 'brunch' | 'desserts'
  // Dining Style
  | 'fine_dining' | 'casual' | 'fast_casual' | 'food_truck' | 'cafe_coffee' | 'bakery'
  // Drinks
  | 'brewery' | 'winery' | 'distillery' | 'cocktail_bar'
  // Features
  | 'live_music' | 'sports_bar' | 'pet_friendly' | 'byob' | 'late_night' | 'family_friendly' | 'date_night';

export type RestaurantFeature =
  // Entertainment
  | 'live_piano' | 'live_band' | 'live_dj' | 'trivia_nights' | 'karaoke'
  | 'comedy_shows' | 'live_sports_viewing' | 'arcade_games' | 'board_games' | 'pool_tables'
  // Dining Experience
  | 'private_dining' | 'prix_fixe_menu' | 'tasting_menu' | 'chefs_table'
  | 'wine_pairing' | 'beer_flights' | 'cocktail_menu' | 'seasonal_menu' | 'farm_to_table'
  // Space & Atmosphere
  | 'outdoor_patio' | 'heated_patio' | 'rooftop_seating' | 'fireplace'
  | 'waterfront' | 'garden_dining' | 'sidewalk_cafe' | 'covered_outdoor'
  // Services
  | 'reservations' | 'walkins_welcome' | 'takeout' | 'delivery' | 'catering'
  | 'event_space' | 'full_bar' | 'byob_allowed' | 'valet_parking' | 'free_parking' | 'street_parking'
  // Accessibility & Family
  | 'wheelchair_accessible' | 'high_chairs' | 'kids_menu' | 'family_friendly'
  | 'pet_friendly_indoor' | 'pet_friendly_patio'
  // Dietary Accommodations
  | 'vegan_options' | 'vegetarian_options' | 'gluten_free_options'
  | 'halal' | 'kosher' | 'allergy_friendly';

export type SubscriptionTier = 'basic' | 'premium' | 'elite';

export type RewardActionType = 'trivia' | 'checkin' | 'review' | 'photo' | 'share' | 'event' | 'referral';

// ============================================
// BASE INTERFACES (Common to both platforms)
// ============================================

export interface BaseRestaurant {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  zip_code: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  custom_description: string | null;
  categories: RestaurantCategory[];
  features: RestaurantFeature[];
  is_active: boolean;
  display_preferences: { tabs: Array<{ key: string; hidden: boolean }> } | null;
  created_at: string;
  updated_at: string;
}

export interface BaseProfile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface HappyHourItem {
  id: string;
  happy_hour_id: string;
  name: string;
  description: string | null;
  original_price: number | null;
  discounted_price: number | null;
  discount_description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface Special {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  is_recurring: boolean;
  days_of_week: DayOfWeek[];
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  original_price: number | null;
  special_price: number | null;
  discount_description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantHours {
  id: string;
  restaurant_id: string;
  day_of_week: DayOfWeek;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  restaurant_id: string;
  created_at: string;
}

// ============================================
// REWARDS SYSTEM (Shared)
// ============================================

export interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  lifetime_points: number;
  created_at: string;
  updated_at: string;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  action_type: RewardActionType;
  points: number;
  multiplier: number;
  base_points: number;
  restaurant_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ============================================
// VOTING SYSTEM (Shared)
// ============================================

export interface Vote {
  id: string;
  user_id: string;
  restaurant_id: string;
  category: string;
  month: string;
  created_at: string;
}

export interface VoteBalance {
  id: string;
  user_id: string;
  month: string;
  votes_remaining: number;
  created_at: string;
  updated_at: string;
}
