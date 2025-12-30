import { SupabaseClient } from '@supabase/supabase-js';
import { RewardActionType } from '@/types/database';

// Rate limits for each action type
export const RATE_LIMITS: Record<RewardActionType, { limit: number; period: 'day' | 'ever' | 'per_entity' }> = {
  trivia: { limit: 1, period: 'day' },
  checkin: { limit: 1, period: 'per_entity' }, // 1 per restaurant per day
  review: { limit: 1, period: 'ever' }, // 1 per restaurant ever
  photo: { limit: 3, period: 'per_entity' }, // 3 per restaurant per day
  share: { limit: 1, period: 'per_entity' }, // 1 per restaurant per day
  event: { limit: 1, period: 'per_entity' }, // 1 per event
  referral: { limit: 1, period: 'per_entity' }, // 1 per referred user
};

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Validate if a user can earn points for an action
 * Checks rate limits and anti-abuse rules
 */
export async function validateRewardAction(
  supabase: SupabaseClient,
  userId: string,
  actionType: RewardActionType,
  restaurantId?: string,
  metadata?: Record<string, unknown>
): Promise<ValidationResult> {
  const today = new Date().toISOString().split('T')[0];
  const rateLimit = RATE_LIMITS[actionType];

  switch (actionType) {
    case 'trivia': {
      // Check if user already answered trivia today
      const { data: existing } = await supabase
        .from('trivia_responses')
        .select('id')
        .eq('user_id', userId)
        .eq('answered_at', today)
        .single();

      if (existing) {
        return { isValid: false, reason: 'You have already answered today\'s trivia question' };
      }
      return { isValid: true };
    }

    case 'checkin': {
      if (!restaurantId) {
        return { isValid: false, reason: 'Restaurant ID is required for check-ins' };
      }

      // Check if user already checked in to this restaurant today
      const { data: existing } = await supabase
        .from('point_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('action_type', 'checkin')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', `${today}T00:00:00`)
        .single();

      if (existing) {
        return { isValid: false, reason: 'You have already checked in to this restaurant today' };
      }
      return { isValid: true };
    }

    case 'review': {
      if (!restaurantId) {
        return { isValid: false, reason: 'Restaurant ID is required for reviews' };
      }

      // Check if user already reviewed this restaurant
      const { data: existing } = await supabase
        .from('point_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('action_type', 'review')
        .eq('restaurant_id', restaurantId)
        .single();

      if (existing) {
        return { isValid: false, reason: 'You have already reviewed this restaurant' };
      }
      return { isValid: true };
    }

    case 'photo': {
      if (!restaurantId) {
        return { isValid: false, reason: 'Restaurant ID is required for photo uploads' };
      }

      // Check how many photos user uploaded to this restaurant today
      const { count } = await supabase
        .from('point_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action_type', 'photo')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', `${today}T00:00:00`);

      if (count && count >= rateLimit.limit) {
        return { isValid: false, reason: 'You have reached the maximum photo uploads for this restaurant today' };
      }
      return { isValid: true };
    }

    case 'share': {
      if (!restaurantId) {
        return { isValid: false, reason: 'Restaurant ID is required for social shares' };
      }

      // Check if user already shared this restaurant today
      const { data: existing } = await supabase
        .from('point_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('action_type', 'share')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', `${today}T00:00:00`)
        .single();

      if (existing) {
        return { isValid: false, reason: 'You have already shared this restaurant today' };
      }
      return { isValid: true };
    }

    case 'event': {
      const eventId = metadata?.event_id as string;
      if (!eventId) {
        return { isValid: false, reason: 'Event ID is required for event attendance' };
      }

      // Check if user already attended this event
      const { data: existing } = await supabase
        .from('point_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('action_type', 'event')
        .contains('metadata', { event_id: eventId })
        .single();

      if (existing) {
        return { isValid: false, reason: 'You have already earned points for this event' };
      }
      return { isValid: true };
    }

    case 'referral': {
      const referredUserId = metadata?.referred_user_id as string;
      if (!referredUserId) {
        return { isValid: false, reason: 'Referred user ID is required' };
      }

      // Check if referral already credited
      const { data: existing } = await supabase
        .from('point_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('action_type', 'referral')
        .contains('metadata', { referred_user_id: referredUserId })
        .single();

      if (existing) {
        return { isValid: false, reason: 'You have already received points for this referral' };
      }
      return { isValid: true };
    }

    default:
      return { isValid: false, reason: 'Unknown action type' };
  }
}

/**
 * Check if user has a premium subscription
 */
export async function checkPremiumStatus(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('consumer_subscriptions')
    .select('status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return !!subscription;
}
