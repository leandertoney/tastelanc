/**
 * Voting Eligibility Service
 * Checks if a user can vote for a restaurant based on recorded visits.
 * A user is eligible to vote for a restaurant if they have at least one
 * visit recorded in the current calendar month.
 */

import { supabase } from './supabase';
import type { VotingEligibility } from '../types/voting';

/**
 * Get the start of the current calendar month as ISO string
 */
function getMonthStartISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/**
 * Check if a user has visited a specific restaurant this month
 */
export async function checkVotingEligibility(
  userId: string,
  restaurantId: string
): Promise<boolean> {
  try {
    const monthStart = getMonthStartISO();

    const { data, error } = await supabase
      .from('visits')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .gte('visited_at', monthStart)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[VotingEligibility] Error checking visit:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('[VotingEligibility] Exception:', error);
    return false;
  }
}

/**
 * Batch check voting eligibility for multiple restaurants.
 * Uses an RPC function for a single round-trip instead of N queries.
 */
export async function batchCheckVotingEligibility(
  userId: string,
  restaurantIds: string[]
): Promise<Record<string, boolean>> {
  const eligibilityMap: Record<string, boolean> = {};

  if (!restaurantIds.length) {
    return eligibilityMap;
  }

  // Initialize all as ineligible
  restaurantIds.forEach((id) => {
    eligibilityMap[id] = false;
  });

  try {
    const { data, error } = await supabase.rpc('check_voting_eligibility', {
      p_user_id: userId,
      p_restaurant_ids: restaurantIds,
    });

    if (error) {
      console.error('[VotingEligibility] RPC error:', error);
      return eligibilityMap;
    }

    // Mark visited restaurants as eligible
    if (data) {
      for (const row of data) {
        eligibilityMap[row.restaurant_id] = true;
      }
    }

    return eligibilityMap;
  } catch (error) {
    console.error('[VotingEligibility] Exception in batch check:', error);
    return eligibilityMap;
  }
}

/**
 * Check if user can vote for a specific restaurant.
 * Returns eligibility status with user-friendly message if ineligible.
 */
export async function canVoteForRestaurant(
  userId: string,
  restaurantId: string,
  restaurantName: string
): Promise<VotingEligibility> {
  try {
    const isEligible = await checkVotingEligibility(userId, restaurantId);

    if (isEligible) {
      return { canVote: true };
    }

    return {
      canVote: false,
      reason: `You need to have visited ${restaurantName} this month to vote for them.`,
    };
  } catch (error) {
    console.error('[VotingEligibility] Error:', error);
    return {
      canVote: false,
      reason: 'Unable to verify your visit. Please try again.',
    };
  }
}
