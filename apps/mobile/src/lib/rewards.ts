/**
 * Rewards API Service
 * Handles all rewards-related API calls for earning points, balance, and history
 */

import { supabase } from './supabase';

const REWARDS_API_BASE = 'https://tastelanc.com/api/mobile/rewards';

export type RewardActionType = 'checkin' | 'review' | 'photo' | 'share' | 'event' | 'referral';

export interface EarnPointsRequest {
  action_type: RewardActionType;
  restaurant_id: string;
  radar_verified: boolean;
  dwell_time_minutes?: number;
}

export interface EarnPointsResponse {
  success: boolean;
  points_earned: number;
  base_points: number;
  multiplier: number;
  new_balance: number;
  message?: string;
}

export interface RewardsBalance {
  total_points: number;
  lifetime_points: number;
  premium_active: boolean;
  multiplier: number; // 1.0 or 2.5
}

export interface RewardsHistoryItem {
  id: string;
  action_type: RewardActionType;
  restaurant_id: string;
  restaurant_name: string;
  points_earned: number;
  base_points: number;
  multiplier: number;
  created_at: string;
}

export interface RewardsHistoryResponse {
  items: RewardsHistoryItem[];
  total: number;
  has_more: boolean;
}

// Point values for UI display (base values before multiplier)
export const POINT_VALUES: Record<RewardActionType | 'trivia', number> = {
  trivia: 1,
  checkin: 5,
  review: 5,
  photo: 3,
  share: 3,
  event: 5,
  referral: 20,
};

// Action type labels for UI display
export const ACTION_LABELS: Record<RewardActionType | 'trivia', string> = {
  trivia: 'Daily Trivia',
  checkin: 'Check-in',
  review: 'Review',
  photo: 'Photo',
  share: 'Social Share',
  event: 'Event',
  referral: 'Referral',
};

// Action type icons (Ionicons names)
export const ACTION_ICONS: Record<RewardActionType | 'trivia', string> = {
  trivia: 'help-circle',
  checkin: 'location',
  review: 'star',
  photo: 'camera',
  share: 'share-social',
  event: 'calendar',
  referral: 'people',
};

/**
 * Get auth headers from Supabase session
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No active session');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

/**
 * Earn points for an action
 * @param request - The earn points request with action details
 * @returns Response with points earned and new balance
 */
export async function earnPoints(request: EarnPointsRequest): Promise<EarnPointsResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${REWARDS_API_BASE}/earn`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to earn points' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get current rewards balance
 * @returns Current and lifetime points with premium status
 */
export async function getRewardsBalance(): Promise<RewardsBalance> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${REWARDS_API_BASE}/balance`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch balance: ${response.status}`);
  }

  return response.json();
}

/**
 * Get rewards history with pagination
 * @param limit - Number of items per page (default 20)
 * @param offset - Offset for pagination (default 0)
 * @returns Paginated history items
 */
export async function getRewardsHistory(
  limit: number = 20,
  offset: number = 0
): Promise<RewardsHistoryResponse> {
  const headers = await getAuthHeaders();

  const url = new URL(`${REWARDS_API_BASE}/history`);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.status}`);
  }

  return response.json();
}

// ============ Rating API ============

const RATINGS_API_BASE = 'https://tastelanc.com/api/mobile/ratings';

export interface SubmitRatingResponse {
  success: boolean;
  rating: number;
  is_first_rating: boolean;
  points_earned: number;
  restaurant_rating: number | null;
  restaurant_rating_count: number;
  message: string;
}

export interface UserRatingResponse {
  has_rated: boolean;
  rating: number | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Submit a rating for a restaurant
 * @param restaurantId - The restaurant ID to rate
 * @param rating - Rating value (1-5)
 * @returns Response with points earned (if first rating) and updated aggregate
 */
export async function submitRating(
  restaurantId: string,
  rating: number
): Promise<SubmitRatingResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(RATINGS_API_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      restaurant_id: restaurantId,
      rating,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to submit rating' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get user's existing rating for a restaurant
 * @param restaurantId - The restaurant ID to check
 * @returns User's rating if they've rated, null otherwise
 */
export async function getUserRating(restaurantId: string): Promise<UserRatingResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${RATINGS_API_BASE}?restaurant_id=${restaurantId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch rating: ${response.status}`);
  }

  return response.json();
}
