import { SupabaseClient } from '@supabase/supabase-js';
import { RewardActionType } from '@/types/database';

// Rate limits for each action type
export const RATE_LIMITS: Record<RewardActionType, { limit: number; period: 'day' | 'ever' | 'per_entity' }> = {
  trivia: { limit: 1, period: 'day' },
  checkin: { limit: 1, period: 'per_entity' }, // 1 per restaurant per day
  review: { limit: 1, period: 'ever' }, // 1 per restaurant ever
  event: { limit: 1, period: 'per_entity' }, // 1 per event
  video_recommendation: { limit: 1, period: 'per_entity' }, // 1 per restaurant per day
  favorite: { limit: 1, period: 'per_entity' }, // 1 per restaurant ever
  daily_pick: { limit: 1, period: 'per_entity' }, // 1 per restaurant per day (daily pick)
  happy_hour_checkin: { limit: 1, period: 'per_entity' }, // 1 per restaurant per day
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

    case 'video_recommendation': {
      if (!restaurantId) {
        return { isValid: false, reason: 'Restaurant ID is required for video recommendations' };
      }

      // Check if user already posted a video recommendation for this restaurant today
      const { data: existingVideo } = await supabase
        .from('point_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('action_type', 'video_recommendation')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', `${today}T00:00:00`)
        .single();

      if (existingVideo) {
        return { isValid: false, reason: 'You have already earned points for a video recommendation at this restaurant today' };
      }
      return { isValid: true };
    }

    case 'favorite': {
      if (!restaurantId) {
        return { isValid: false, reason: 'Restaurant ID is required for favorites' };
      }

      // 1 point per restaurant, ever (first favorite only)
      const { data: existingFav } = await supabase
        .from('point_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('action_type', 'favorite')
        .eq('restaurant_id', restaurantId)
        .single();

      if (existingFav) {
        return { isValid: false, reason: 'You already earned points for favoriting this restaurant' };
      }
      return { isValid: true };
    }

    case 'daily_pick': {
      if (!restaurantId) {
        return { isValid: false, reason: 'Restaurant ID is required for daily pick check-ins' };
      }

      // 1 daily pick check-in per restaurant per day
      const { data: existingPick } = await supabase
        .from('point_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('action_type', 'daily_pick')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', `${today}T00:00:00`)
        .single();

      if (existingPick) {
        return { isValid: false, reason: 'You already earned points for this daily pick today' };
      }
      return { isValid: true };
    }

    case 'happy_hour_checkin': {
      if (!restaurantId) {
        return { isValid: false, reason: 'Restaurant ID is required for happy hour check-ins' };
      }

      // 1 happy hour check-in per restaurant per day
      const { data: existingHH } = await supabase
        .from('point_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('action_type', 'happy_hour_checkin')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', `${today}T00:00:00`)
        .single();

      if (existingHH) {
        return { isValid: false, reason: 'You already earned happy hour check-in points at this restaurant today' };
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
    .maybeSingle();

  return !!subscription;
}
