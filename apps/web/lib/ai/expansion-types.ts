// ─────────────────────────────────────────────────────────
// City Expansion Agent — TypeScript Types
// ─────────────────────────────────────────────────────────

// Pipeline statuses
export type ExpansionCityStatus =
  | 'researching'
  | 'researched'
  | 'brand_ready'
  | 'approved'
  | 'setup_in_progress'
  | 'live'
  | 'on_hold'
  | 'rejected';

export type JobListingStatus = 'draft' | 'approved' | 'posted' | 'closed';

export type JobRoleType = 'sales_rep' | 'market_manager' | 'content_creator' | 'community_manager';

export type ExpansionAction =
  | 'city_added'
  | 'research_started'
  | 'research_completed'
  | 'brand_generated'
  | 'brand_selected'
  | 'brand_regenerated'
  | 'job_listing_generated'
  | 'job_listing_approved'
  | 'job_listing_rejected'
  | 'job_posted'
  | 'application_received'
  | 'city_approved'
  | 'city_rejected'
  | 'city_put_on_hold'
  | 'market_created'
  | 'status_changed'
  | 'note_added';

export type InboundEmailCategory = 'inquiry' | 'lead' | 'spam' | 'other';

// ─────────────────────────────────────────────────────────
// Database row types
// ─────────────────────────────────────────────────────────

export interface ExpansionCity {
  id: string;
  city_name: string;
  county: string;
  state: string;
  slug: string;
  population: number | null;
  median_income: number | null;
  median_age: number | null;
  restaurant_count: number | null;
  bar_count: number | null;
  dining_scene_description: string | null;
  competition_analysis: string | null;
  market_potential_score: number | null;
  research_data: CityResearchData;
  center_latitude: number | null;
  center_longitude: number | null;
  radius_miles: number;
  status: ExpansionCityStatus;
  priority: number;
  admin_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  market_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandDraft {
  id: string;
  city_id: string;
  app_name: string;
  tagline: string;
  ai_assistant_name: string;
  premium_name: string;
  colors: BrandColors;
  market_config_json: Record<string, unknown>;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  avatar_image_url: string | null;  // DALL-E generated mascot image
  is_selected: boolean;
  variant_number: number;
  created_at: string;
  updated_at: string;
}

export interface ExpansionJobListing {
  id: string;
  city_id: string;
  title: string;
  role_type: JobRoleType;
  description: string;
  requirements: string[] | null;
  compensation_summary: string | null;
  location: string | null;
  is_remote: boolean;
  status: JobListingStatus;
  posted_at: string | null;
  valid_through: string | null;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_unit: string;
  approved_by: string | null;
  approved_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  city?: ExpansionCity;
  brand?: BrandDraft;
}

export interface JobApplication {
  id: string;
  job_listing_id: string | null;
  city_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  message: string | null;
  resume_url: string | null;
  status: 'new' | 'reviewed' | 'contacted' | 'rejected' | 'hired';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogEntry {
  id: string;
  city_id: string;
  user_id: string | null;
  action: ExpansionAction;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface InboundEmail {
  id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  headers: Record<string, unknown>;
  attachments: unknown[];
  is_read: boolean;
  is_archived: boolean;
  admin_notes: string | null;
  category: InboundEmailCategory;
  linked_city_id: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────
// Scoring types
// ─────────────────────────────────────────────────────────

export interface MarketSubScores {
  population_density: number;   // 0-100
  dining_scene: number;         // 0-100
  competition: number;          // 0-100 (lower competition = higher score)
  college_presence: number;     // 0-100
  tourism: number;              // 0-100
  income_level: number;         // 0-100
}

export interface SubScoreReasoning {
  population_density: string;
  dining_scene: string;
  competition: string;
  college_presence: string;
  tourism: string;
  income_level: string;
}

// ─────────────────────────────────────────────────────────
// AI response types
// ─────────────────────────────────────────────────────────

export interface ResearchSource {
  name: string;           // "US Census Bureau ACS 2023"
  url: string;            // clickable link to source
  data_point: string;     // "Population: 126,092"
  accessed_at: string;    // ISO timestamp
}

export interface CityResearchData {
  // Regional clustering
  suggested_region_name?: string;     // e.g. "Cumberland", "Lehigh Valley"
  cluster_towns?: string[];           // e.g. ["Carlisle", "Mechanicsburg", "Camp Hill"]
  cluster_population?: number;        // combined population of all cluster towns
  // Validated data sources
  sources?: ResearchSource[];
  // Research data
  key_neighborhoods?: string[];
  notable_restaurants?: string[];
  local_food_traditions?: string;
  college_presence?: string;
  tourism_factors?: string;
  seasonal_considerations?: string;
  expansion_reasoning?: string;
  sub_scores?: MarketSubScores;
  sub_score_reasoning?: SubScoreReasoning;
  ai_estimated_restaurant_count?: number;
  ai_estimated_bar_count?: number;
  google_places_restaurant_count?: number;
  google_places_bar_count?: number;
  google_places_validated?: boolean;
  google_places_validated_at?: string;
  [key: string]: unknown;
}

export interface CityResearchResult {
  population: number;
  median_income: number;
  median_age: number;
  restaurant_count: number;
  bar_count: number;
  dining_scene_description: string;
  competition_analysis: string;
  center_latitude: number;
  center_longitude: number;
  key_neighborhoods: string[];
  notable_restaurants: string[];
  local_food_traditions: string;
  college_presence: string;
  tourism_factors: string;
  seasonal_considerations: string;
  expansion_reasoning: string;
  sub_scores: MarketSubScores;
  sub_score_reasoning: SubScoreReasoning;
}

export interface BrandColors {
  accent: string;
  accentHover: string;
  gold: string;
  bg: string;
  card: string;
  surface: string;
  surfaceLight: string;
  headerBg: string;
  headerText: string;
}

export interface BrandProposal {
  app_name: string;
  tagline: string;
  ai_assistant_name: string;
  premium_name: string;
  colors: BrandColors;
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  market_config_json: Record<string, unknown>;
  avatar_image_url?: string;  // DALL-E generated mascot image URL
}

export interface JobListingDraft {
  title: string;
  description: string;
  requirements: string[];
  compensation_summary: string;
  location: string;
}

export interface CitySuggestion {
  city_name: string;
  county: string;
  state: string;
  population: number;
  reasoning: string;
  estimated_score: number;
  // Regional clustering — nearby towns that would be bundled under one app
  suggested_region_name?: string;  // e.g. "Cumberland" instead of "Carlisle"
  cluster_towns?: string[];        // e.g. ["Carlisle", "Mechanicsburg", "Camp Hill", ...]
  cluster_population?: number;     // combined population of all cluster towns
}

// ─────────────────────────────────────────────────────────
// Dashboard stats
// ─────────────────────────────────────────────────────────

export interface ExpansionStats {
  total: number;
  researching: number;
  researched: number;
  brand_ready: number;
  approved: number;
  setup_in_progress: number;
  live: number;
  on_hold: number;
  rejected: number;
}
