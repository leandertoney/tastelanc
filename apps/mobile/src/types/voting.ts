export type VoteCategory =
  | 'best_wings'
  | 'best_burgers'
  | 'best_pizza'
  | 'best_cocktails'
  | 'best_happy_hour'
  | 'best_brunch'
  | 'best_late_night'
  | 'best_live_music';

export interface VoteRecord {
  id: string;
  user_id: string;
  restaurant_id: string;
  category: VoteCategory;
  created_at: string;
  month_year: string; // format YYYY-MM
}

export interface VoteBalance {
  user_id: string;
  votes_available: number; // defaults to 4 per premium user per month
  next_reset: string; // ISO date
}

export interface LeaderboardEntry {
  restaurant_id: string;
  category: VoteCategory;
  tier: 'top_pick' | 'leading_pick' | 'local_favorite' | 'on_the_board';
  month_year: string;
}
