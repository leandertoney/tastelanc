// ── Badge types ───────────────────────────────────────────────────────────────
export type BadgeCriteriaType =
  | 'checkin_count'
  | 'unique_restaurants'
  | 'happy_hour_checkin'
  | 'weekend_checkin';

export interface BadgeCriteria {
  type: BadgeCriteriaType;
  threshold: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  criteria: BadgeCriteria;
  market_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  market_id: string;
  earned_at: string;
  badge?: Badge;
}

// ── Challenge types ───────────────────────────────────────────────────────────
export type ChallengeType =
  | 'checkin_count'
  | 'unique_restaurants'
  | 'happy_hour_checkin'
  | 'cuisine_variety'
  | 'weekend_checkin'
  | 'streak';

export interface Challenge {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  challenge_type: ChallengeType;
  target_count: number;
  days_of_week: string[] | null;
  resets_weekly: boolean;
  sponsor_restaurant_id: string | null;
  reward_description: string | null;
  market_id: string | null;
  is_active: boolean;
  created_at: string;
  // joined
  sponsor_restaurant?: { id: string; name: string } | null;
}

export interface UserChallengeProgress {
  id: string;
  user_id: string;
  challenge_id: string;
  progress_count: number;
  completed_at: string | null;
  week_start: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeWithProgress extends Challenge {
  progress: UserChallengeProgress | null;
}

// ── Reward claim types ────────────────────────────────────────────────────────
export interface RewardClaim {
  id: string;
  user_id: string;
  restaurant_id: string;
  challenge_id: string | null;
  claim_token: string;
  claimed_at: string;
  expires_at: string;
  is_redeemed: boolean;
  redemption_window_minutes: number;
  // joined
  restaurant?: { id: string; name: string };
  challenge?: { name: string; reward_description: string | null } | null;
}

// ── Right Now feed types ──────────────────────────────────────────────────────
export type RightNowItemType = 'happy_hour' | 'event' | 'special';

export interface RightNowItem {
  id: string;
  type: RightNowItemType;
  restaurantId: string;
  restaurantName: string;
  restaurantId2?: string;
  itemName: string;
  timeWindow: string;
  tierName?: string | null;
}

// ── Leaderboard types ─────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string | null;
  checkin_count: number;
  unique_restaurants: number;
  is_current_user: boolean;
}

// ── Labs / Feature voting types ───────────────────────────────────────────────
export interface LabFeature {
  id: string;
  title: string;
  description: string;
  icon_name: string;
}

export interface FeatureVote {
  id: string;
  user_id: string;
  feature_id: string;
  vote: 1 | -1;
  created_at: string;
}

export interface LabFeatureWithVotes extends LabFeature {
  upvotes: number;
  downvotes: number;
  userVote: 1 | -1 | null;
}

// ── Badge award context (passed to useAwardBadges mutation) ───────────────────
export interface BadgeAwardContext {
  currentCheckinCount: number;
  uniqueRestaurantCount: number;
  isDuringHappyHour: boolean;
  isWeekend: boolean;
}
