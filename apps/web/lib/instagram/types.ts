// Instagram Agent v1 types

export type ContentType = 'tonight_today' | 'weekend_preview' | 'category_roundup' | 'upcoming_events' | 'party_teaser' | 'restaurant_spotlight';
export type PostStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published' | 'failed';

// Weekly content calendar — each weekday has a unique theme
export type DayTheme =
  | 'weekly_roundup'        // Monday: Magazine-style "This Week's Issue"
  | 'happy_hour_spotlight'  // Tuesday: Deep dive on standout happy hours
  | 'hidden_gems'           // Wednesday: Lesser-known spots, new finds
  | 'weekend_preview'       // Thursday: What's happening Fri-Sun
  | 'specials_deals';       // Friday: Best food/drink specials

export interface WeeklyThemeConfig {
  dayOfWeek: number;        // 1=Mon, 2=Tue, ..., 5=Fri
  theme: DayTheme;
  label: string;
  contentType: ContentType;
  forceSubtype?: string;
  description: string;
}

export interface InstagramAccount {
  id: string;
  market_id: string;
  instagram_business_account_id: string;
  facebook_page_id: string;
  access_token_encrypted: string;
  token_expires_at: string | null;
  post_time: string;
  timezone: string;
  is_active: boolean;
  meta_app_id: string | null;
  meta_app_secret: string | null;
}

export interface InstagramPost {
  id: string;
  market_id: string;
  post_date: string;
  content_type: ContentType;
  selected_entity_ids: string[];
  caption: string;
  media_urls: string[];
  instagram_media_id: string | null;
  instagram_permalink: string | null;
  status: PostStatus;
  generation_metadata: GenerationMetadata;
  engagement_metrics: EngagementMetrics;
  error_message: string | null;
  created_at: string;
  published_at: string | null;
  scheduled_publish_at: string | null;
  day_theme: DayTheme | null;
}

export interface GenerationMetadata {
  post_type: ContentType;
  total_candidates: number;
  total_hidden: number;
  visible_names: string[];
  decision_path: string;
  model_used: string;
  token_usage?: { prompt: number; completion: number; total: number };
  day_of_week: string;
  event_type?: string;
  category?: string;
  spotlight_restaurant_id?: string;
}

export interface EngagementMetrics {
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reach?: number;
  impressions?: number;
  collected_at?: string;
}

export interface ScoredCandidate {
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  entity_id: string;
  entity_type: 'event' | 'happy_hour' | 'special' | 'restaurant';
  entity_name: string;
  score: number;
  tier_weight: number;
  freshness: number;
  photo_quality: number;
  rating_weight: number;
  recency_penalty: number;
  image_url: string | null;
  cover_image_url: string | null;
  detail_text?: string;
}

export interface HeadlineParts {
  count: string;
  label: string;
  dayLabel: string;
}

export interface SlideCandidate {
  restaurant_name: string;
  detail_text: string;
  image_url: string | null;
  cover_image_url: string | null;
}

export interface HolidaySpecialSlide {
  restaurant_name: string;
  cover_image_url: string | null;
  specials: { name: string; category: string; price: string | null; description: string | null }[];
}

// ============================================================================
// Restaurant Spotlight types
// ============================================================================

export interface SpotlightSpecial {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  special_price: number | null;
  original_price: number | null;
  days_of_week: string[];
  start_time: string | null;
  end_time: string | null;
}

export interface SpotlightHappyHour {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  start_time: string | null;
  end_time: string | null;
  days_of_week: string[];
  items: Array<{
    name: string;
    discounted_price: number | null;
    original_price: number | null;
  }>;
}

export interface SpotlightEvent {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  event_type: string;
  start_time: string | null;
  performer_name: string | null;
  days_of_week: string[];
  event_date: string | null;
  is_recurring: boolean;
}

export interface SpotlightDeal {
  id: string;
  title: string;
  description: string | null;
  discount_type: 'percent_off' | 'dollar_off' | 'bogo' | 'free_item' | 'custom';
  discount_value: number | null;
  original_price: number | null;
  image_url: string | null;
  days_of_week: string[];
  start_time: string | null;
  end_time: string | null;
  end_date: string | null;
}

export interface SpotlightPhoto {
  id: string;
  url: string;
  caption: string | null;
  display_order: number;
  is_cover: boolean;
}

export interface RestaurantSpotlightCandidate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  custom_description: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  categories: string[];
  tier_name: 'premium' | 'elite';
  market_id: string;
  specials: SpotlightSpecial[];
  happy_hours: SpotlightHappyHour[];
  events: SpotlightEvent[];
  deals: SpotlightDeal[];
  photos: SpotlightPhoto[];
}

export interface SpotlightScoredCandidate {
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  tier_name: 'premium' | 'elite';
  photo_count: number;
  special_count: number;
  happy_hour_count: number;
  event_count: number;
  deal_count: number;
  content_score: number;
  days_since_last_spotlight: number | null;
  last_spotlight_date: string | null;
}

export interface MarketConfig {
  market_id: string;
  market_slug: string;
  market_name: string;
  county: string;
  state: string;
  instagram_account: InstagramAccount | null;
}

export interface GenerationResult {
  success: boolean;
  post_id?: string;
  content_type?: ContentType;
  caption?: string;
  media_urls?: string[];
  error?: string;
}

export interface PublishResult {
  success: boolean;
  instagram_media_id?: string;
  permalink?: string;
  error?: string;
}
