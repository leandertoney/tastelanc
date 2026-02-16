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
  month: string; // format YYYY-MM (matches DB column)
}

export interface VoteBalance {
  votesRemaining: number;
  votesUsed: number;
}

export interface LeaderboardEntry {
  restaurant_id: string;
  category: VoteCategory;
  tier: 'top_pick' | 'leading_pick' | 'local_favorite' | 'on_the_board';
  vote_count: number;
}

export interface VotingEligibility {
  canVote: boolean;
  reason?: string;
}
