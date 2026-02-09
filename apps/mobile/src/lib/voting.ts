/**
 * Voting Service
 * Manages vote submission, balance, and leaderboard via Supabase.
 * All data is stored server-side for cross-user aggregation.
 */

import { supabase } from './supabase';
import { requestReviewIfEligible } from './reviewPrompts';
import type { VoteCategory, VoteRecord, VoteBalance, LeaderboardEntry } from '../types/voting';

// Maximum votes per user per month
const VOTES_PER_MONTH = 4;

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get the first day of next month (for UI reset display)
 */
export function getNextResetDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

/**
 * Get vote balance for a user by counting their votes this month
 */
export async function getVoteBalance(userId: string): Promise<VoteBalance> {
  try {
    const { count, error } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('month', getCurrentMonth());

    if (error) {
      console.error('[Voting] Error getting vote balance:', error);
      return { votesRemaining: VOTES_PER_MONTH, votesUsed: 0 };
    }

    const votesUsed = count || 0;
    return {
      votesRemaining: Math.max(0, VOTES_PER_MONTH - votesUsed),
      votesUsed,
    };
  } catch (error) {
    console.error('[Voting] Exception getting balance:', error);
    return { votesRemaining: VOTES_PER_MONTH, votesUsed: 0 };
  }
}

/**
 * Get all votes for a user (all time, for vote history screen)
 */
export async function getUserVotes(userId: string): Promise<VoteRecord[]> {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Voting] Error getting user votes:', error);
      return [];
    }

    return (data || []) as VoteRecord[];
  } catch (error) {
    console.error('[Voting] Exception getting user votes:', error);
    return [];
  }
}

/**
 * Get user's votes for the current month
 */
export async function getCurrentMonthVotes(userId: string): Promise<VoteRecord[]> {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', userId)
      .eq('month', getCurrentMonth())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Voting] Error getting month votes:', error);
      return [];
    }

    return (data || []) as VoteRecord[];
  } catch (error) {
    console.error('[Voting] Exception getting month votes:', error);
    return [];
  }
}

/**
 * Check if user has already voted in a category this month
 */
export async function hasVotedInCategory(
  userId: string,
  category: VoteCategory
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('id')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('month', getCurrentMonth())
      .maybeSingle();

    if (error) {
      console.error('[Voting] Error checking category vote:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('[Voting] Exception checking category:', error);
    return false;
  }
}

/**
 * Submit a vote for a restaurant in a category
 */
export async function submitVote(
  userId: string,
  restaurantId: string,
  category: VoteCategory
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check vote balance
    const balance = await getVoteBalance(userId);
    if (balance.votesRemaining <= 0) {
      return { success: false, error: 'No votes remaining this month' };
    }

    // Insert vote - UNIQUE constraint (user_id, category, month) prevents duplicates
    const { error } = await supabase.from('votes').insert({
      user_id: userId,
      restaurant_id: restaurantId,
      category,
      month: getCurrentMonth(),
    });

    if (error) {
      // Handle unique constraint violation (already voted in this category)
      if (error.code === '23505') {
        return { success: false, error: 'Already voted in this category this month' };
      }
      console.error('[Voting] Error submitting vote:', error);
      return { success: false, error: 'Failed to submit vote' };
    }

    // Trigger review prompt on first vote
    requestReviewIfEligible('first_vote');

    return { success: true };
  } catch (error) {
    console.error('[Voting] Exception submitting vote:', error);
    return { success: false, error: 'Failed to submit vote' };
  }
}

/**
 * Get leaderboard for a specific category (aggregated across all users)
 */
export async function getCategoryLeaderboard(
  category: VoteCategory,
  month?: string
): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase.rpc('get_category_leaderboard', {
      p_category: category,
      p_month: month || getCurrentMonth(),
    });

    if (error) {
      console.error('[Voting] Error getting leaderboard:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      restaurant_id: row.restaurant_id,
      category,
      tier: row.tier as LeaderboardEntry['tier'],
      vote_count: Number(row.vote_count),
    }));
  } catch (error) {
    console.error('[Voting] Exception getting leaderboard:', error);
    return [];
  }
}

/**
 * Get current month winners (top pick for each category)
 */
export async function getCurrentWinners(
  month?: string
): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase.rpc('get_current_winners', {
      p_month: month || getCurrentMonth(),
    });

    if (error) {
      console.error('[Voting] Error getting winners:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      restaurant_id: row.restaurant_id,
      category: row.category as VoteCategory,
      tier: row.tier as LeaderboardEntry['tier'],
      vote_count: Number(row.vote_count),
    }));
  } catch (error) {
    console.error('[Voting] Exception getting winners:', error);
    return [];
  }
}
