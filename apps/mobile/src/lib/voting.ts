import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VoteCategory, VoteRecord, VoteBalance, LeaderboardEntry } from '../types/voting';
import { requestReviewIfEligible } from './reviewPrompts';

const VOTES_KEY = '@tastelanc_votes';
const VOTE_BALANCE_KEY = '@tastelanc_vote_balance';
const LEADERBOARD_KEY = '@tastelanc_leaderboard';

// Default votes per month for premium users
const VOTES_PER_MONTH = 4;

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get next month's first day for reset date
 */
function getNextResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

/**
 * Get or initialize vote balance for a user
 * @param userId - Supabase user UUID
 */
export async function getVoteBalance(userId: string): Promise<VoteBalance> {
  try {
    const storageKey = `${VOTE_BALANCE_KEY}_${userId}`;
    const data = await AsyncStorage.getItem(storageKey);
    if (data) {
      const balance: VoteBalance = JSON.parse(data);
      // Check if we need to reset (new month)
      const currentMonth = getCurrentMonthYear();
      const storedMonth = balance.next_reset ? new Date(balance.next_reset).toISOString().slice(0, 7) : '';

      if (new Date() >= new Date(balance.next_reset)) {
        // Reset votes for new month
        const newBalance: VoteBalance = {
          user_id: userId,
          votes_available: VOTES_PER_MONTH,
          next_reset: getNextResetDate(),
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(newBalance));
        return newBalance;
      }
      return balance;
    }

    // Initialize for first time
    const newBalance: VoteBalance = {
      user_id: userId,
      votes_available: VOTES_PER_MONTH,
      next_reset: getNextResetDate(),
    };
    await AsyncStorage.setItem(storageKey, JSON.stringify(newBalance));
    return newBalance;
  } catch (error) {
    console.error('Error getting vote balance:', error);
    return {
      user_id: userId,
      votes_available: VOTES_PER_MONTH,
      next_reset: getNextResetDate(),
    };
  }
}

/**
 * Get all votes for a user
 * @param userId - Supabase user UUID
 */
export async function getUserVotes(userId: string): Promise<VoteRecord[]> {
  try {
    const storageKey = `${VOTES_KEY}_${userId}`;
    const data = await AsyncStorage.getItem(storageKey);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error getting user votes:', error);
    return [];
  }
}

/**
 * Get user's votes for current month
 * @param userId - Supabase user UUID
 */
export async function getCurrentMonthVotes(userId: string): Promise<VoteRecord[]> {
  const allVotes = await getUserVotes(userId);
  const currentMonth = getCurrentMonthYear();
  return allVotes.filter((vote) => vote.month_year === currentMonth);
}

/**
 * Check if user has already voted in a category this month
 * @param userId - Supabase user UUID
 * @param category - Vote category to check
 */
export async function hasVotedInCategory(userId: string, category: VoteCategory): Promise<boolean> {
  const monthVotes = await getCurrentMonthVotes(userId);
  return monthVotes.some((vote) => vote.category === category);
}

/**
 * Submit a vote
 * @param userId - Supabase user UUID
 * @param restaurantId - Restaurant UUID
 * @param category - Vote category
 */
export async function submitVote(
  userId: string,
  restaurantId: string,
  category: VoteCategory
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check vote balance
    const balance = await getVoteBalance(userId);
    if (balance.votes_available <= 0) {
      return { success: false, error: 'No votes remaining this month' };
    }

    // Check if already voted in this category
    if (await hasVotedInCategory(userId, category)) {
      return { success: false, error: 'Already voted in this category this month' };
    }

    // Create vote record
    const vote: VoteRecord = {
      id: `vote_${Date.now()}`,
      user_id: userId,
      restaurant_id: restaurantId,
      category,
      created_at: new Date().toISOString(),
      month_year: getCurrentMonthYear(),
    };

    // Save vote
    const votesStorageKey = `${VOTES_KEY}_${userId}`;
    const votes = await getUserVotes(userId);
    votes.push(vote);
    await AsyncStorage.setItem(votesStorageKey, JSON.stringify(votes));

    // Decrement balance
    const balanceStorageKey = `${VOTE_BALANCE_KEY}_${userId}`;
    balance.votes_available -= 1;
    await AsyncStorage.setItem(balanceStorageKey, JSON.stringify(balance));

    // Update leaderboard
    await updateLeaderboard(restaurantId, category);

    // Trigger review prompt on first vote
    requestReviewIfEligible('first_vote');

    return { success: true };
  } catch (error) {
    console.error('Error submitting vote:', error);
    return { success: false, error: 'Failed to submit vote' };
  }
}

/**
 * Update leaderboard with new vote
 */
async function updateLeaderboard(restaurantId: string, category: VoteCategory): Promise<void> {
  try {
    const leaderboard = await getLeaderboard();
    const currentMonth = getCurrentMonthYear();

    // Find or create entry for this restaurant/category
    const existingIndex = leaderboard.findIndex(
      (entry) =>
        entry.restaurant_id === restaurantId &&
        entry.category === category &&
        entry.month_year === currentMonth
    );

    if (existingIndex === -1) {
      // Create new entry
      leaderboard.push({
        restaurant_id: restaurantId,
        category,
        tier: 'on_the_board',
        month_year: currentMonth,
        vote_count: 1,
      });
    } else {
      // Increment vote count
      (leaderboard[existingIndex] as any).vote_count =
        ((leaderboard[existingIndex] as any).vote_count || 0) + 1;
    }

    // Recalculate tiers for this category
    const categoryEntries = leaderboard.filter(
      (e) => e.category === category && e.month_year === currentMonth
    );

    // Sort by vote count
    categoryEntries.sort((a, b) =>
      ((b as any).vote_count || 0) - ((a as any).vote_count || 0)
    );

    // Assign tiers based on rank
    categoryEntries.forEach((entry, index) => {
      if (index === 0) {
        entry.tier = 'top_pick';
      } else if (index === 1) {
        entry.tier = 'leading_pick';
      } else if (index === 2) {
        entry.tier = 'local_favorite';
      } else {
        entry.tier = 'on_the_board';
      }
    });

    await AsyncStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
}

/**
 * Get leaderboard entries
 */
export async function getLeaderboard(): Promise<(LeaderboardEntry & { vote_count?: number })[]> {
  try {
    const data = await AsyncStorage.getItem(LEADERBOARD_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

/**
 * Get leaderboard for a specific category
 */
export async function getCategoryLeaderboard(
  category: VoteCategory,
  monthYear?: string
): Promise<(LeaderboardEntry & { vote_count?: number })[]> {
  const leaderboard = await getLeaderboard();
  const targetMonth = monthYear || getCurrentMonthYear();

  return leaderboard
    .filter((entry) => entry.category === category && entry.month_year === targetMonth)
    .sort((a, b) => ((b as any).vote_count || 0) - ((a as any).vote_count || 0));
}

/**
 * Get current month winners (top pick for each category)
 */
export async function getCurrentWinners(): Promise<(LeaderboardEntry & { vote_count?: number })[]> {
  const leaderboard = await getLeaderboard();
  const currentMonth = getCurrentMonthYear();

  return leaderboard.filter(
    (entry) => entry.month_year === currentMonth && entry.tier === 'top_pick'
  );
}

/**
 * Clear all voting data (for testing)
 */
export async function clearVotingData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([VOTES_KEY, VOTE_BALANCE_KEY, LEADERBOARD_KEY]);
  } catch (error) {
    console.error('Error clearing voting data:', error);
  }
}
