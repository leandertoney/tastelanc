// Instagram Agent v1 types

export type ContentType = 'tonight_today' | 'weekend_preview' | 'category_roundup' | 'upcoming_events';
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
  specials: { name: string; category: string; price: string | null; description: string | null }[];
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
