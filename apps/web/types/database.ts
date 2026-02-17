/**
 * Database type definitions for TasteLanc
 * Based on the existing Supabase schema
 */

// Enums
export type SubscriptionTier = 'basic' | 'premium' | 'elite';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
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
export type EventType = 'live_music' | 'trivia' | 'karaoke' | 'dj' | 'comedy' | 'sports' | 'bingo' | 'other';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled';
export type TeamMemberRole = 'owner' | 'manager';
export type TeamMemberStatus = 'pending' | 'active' | 'revoked';

// Core Tables
export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tier {
  id: string;
  name: SubscriptionTier;
  display_name: string;
  price_monthly: number | null;
  price_yearly: number | null;
  has_logo: boolean;
  has_menu: boolean;
  has_analytics: boolean;
  has_push_notifications: boolean;
  has_preferred_placement: boolean;
  has_social_features: boolean;
  has_unlimited_pushes: boolean;
  has_weekly_updates: boolean;
  has_custom_ads: boolean;
  has_consulting: boolean;
  has_advanced_analytics: boolean;
  max_daily_notifications: number;
  created_at: string;
}

export interface Restaurant {
  id: string;
  owner_id: string | null;
  tier_id: string;
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
  primary_color: string;
  secondary_color: string;
  categories: RestaurantCategory[];
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  // Enrichment fields for better blog content
  price_range: string | null;
  signature_dishes: string[] | null;
  vibe_tags: string[] | null;
  best_for: string[] | null;
  neighborhood: string | null;
  parking_info: string | null;
  noise_level: string | null;
  average_rating: number | null;
  tastelancrating: number | null;
  tastelancrating_count: number;
  reservation_links: string | null;
  stripe_subscription_id: string | null;
  checkin_pin: string | null;
  market_id: string;
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

export interface Subscription {
  id: string;
  restaurant_id: string;
  tier_id: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  current_period_start: string | null;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

// Content Tables
export interface Menu {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
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
}

export interface MenuItem {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  price: number | null;
  price_description: string | null;
  is_available: boolean;
  is_featured: boolean;
  dietary_flags: string[];
  display_order: number;
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

export interface Event {
  id: string;
  restaurant_id: string | null;
  self_promoter_id: string | null;
  market_id: string;
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

export interface RestaurantPhoto {
  id: string;
  restaurant_id: string;
  url: string;
  caption: string | null;
  is_cover: boolean;
  display_order: number;
  created_at: string;
}

// User Interaction Tables
export interface Favorite {
  id: string;
  user_id: string;
  restaurant_id: string;
  created_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  restaurant_id: string;
  created_at: string;
}

// Voting Tables
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

// Analytics Tables
export interface AnalyticsPageView {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  session_id: string | null;
  page_type: string;
  viewed_at: string;
}

export interface AnalyticsClick {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  click_type: string;
  click_target: string | null;
  clicked_at: string;
}

// Extended Types with Relations
export interface RestaurantWithDetails extends Restaurant {
  hours?: RestaurantHours[];
  happy_hours?: (HappyHour & { items?: HappyHourItem[] })[];
  specials?: Special[];
  events?: Event[];
  menus?: (Menu & { sections?: (MenuSection & { items?: MenuItem[] })[] })[];
  photos?: RestaurantPhoto[];
  tier?: Tier;
}

export interface HappyHourWithRestaurant extends HappyHour {
  restaurant: Restaurant;
  items?: HappyHourItem[];
}

export interface EventWithRestaurant extends Event {
  restaurant: Restaurant;
}

export interface SpecialWithRestaurant extends Special {
  restaurant: Restaurant;
}

// Contact Submissions (for restaurant inquiries)
export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  message: string;
  interested_plan: 'premium' | 'elite' | null;
  created_at: string;
  read_at: string | null;
  responded_at: string | null;
  notes: string | null;
}

// Consumer Subscription (for app premium users)
export type ConsumerSubscriptionPlan = 'basic' | 'premium';
export type SubscriptionDuration = '3mo' | '6mo' | 'yearly' | 'monthly';

export interface ConsumerSubscription {
  id: string;
  user_id: string;
  plan: ConsumerSubscriptionPlan;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  billing_period: 'monthly' | 'yearly';
  current_period_start: string | null;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

// Rewards System Types
export type RewardActionType = 'trivia' | 'checkin' | 'review' | 'photo' | 'share' | 'event' | 'referral';

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

export interface PointTransactionWithRestaurant extends PointTransaction {
  restaurant?: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  } | null;
}

export interface TriviaQuestion {
  id: string;
  question: string;
  correct_answer: string;
  wrong_answers: string[];
  category: string | null;
  difficulty: string;
  is_active: boolean;
  times_used: number;
  created_at: string;
}

export interface TriviaResponse {
  id: string;
  user_id: string;
  question_id: string;
  answered_correctly: boolean;
  points_earned: number;
  answered_at: string;
  created_at: string;
}

// Team Members
export interface RestaurantMember {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  email: string;
  role: TeamMemberRole;
  invited_by: string;
  status: TeamMemberStatus;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

// Admin types
export interface AdminStats {
  totalRestaurants: number;
  activeSubscriptions: number;
  totalPageViews: number;
  totalContacts: number;
  unreadContacts: number;
  signupsByPlan: {
    premium: number;
    elite: number;
  };
}
