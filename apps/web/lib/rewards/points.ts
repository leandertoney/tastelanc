import { RewardActionType } from '@/types/database';

// Base point values for each action type
export const BASE_POINTS: Record<RewardActionType, number> = {
  trivia: 1, // DEFERRED: Daily trivia/challenge is "Coming Soon"
  checkin: 5,
  review: 5,
  event: 5,
  video_recommendation: 15,
  favorite: 1,
  daily_pick: 10,
  happy_hour_checkin: 8,
};

// Actions that are currently active (excludes deferred features)
export const ACTIVE_ACTIONS: RewardActionType[] = ['checkin', 'review', 'event', 'video_recommendation', 'favorite', 'daily_pick', 'happy_hour_checkin'];

// Premium multiplier (2.5x for premium users)
export const PREMIUM_MULTIPLIER = 2.5;

// Action display names for UI
export const ACTION_DISPLAY_NAMES: Record<RewardActionType, string> = {
  trivia: 'Daily Trivia',
  checkin: 'Restaurant Check-in',
  review: 'Leave a Review',
  event: 'Attend Event/Special',
  video_recommendation: 'Video Recommendation',
  favorite: 'Save a Restaurant',
  daily_pick: 'Daily Pick Check-in',
  happy_hour_checkin: 'Happy Hour Check-in',
};

/**
 * Calculate points for an action
 * @param actionType - The type of action performed
 * @param isPremium - Whether the user has a premium subscription
 * @returns The calculated points (base * multiplier)
 */
export function calculatePoints(actionType: RewardActionType, isPremium: boolean): number {
  const basePoints = BASE_POINTS[actionType];
  const multiplier = isPremium ? PREMIUM_MULTIPLIER : 1.0;
  return basePoints * multiplier;
}

/**
 * Get all available actions with their point values
 * @param isPremium - Whether the user has a premium subscription
 * @returns Array of active actions with base points, multiplied points, and display names
 */
export function getAvailableActions(isPremium: boolean) {
  return ACTIVE_ACTIONS.map((action) => ({
    action,
    displayName: ACTION_DISPLAY_NAMES[action],
    basePoints: BASE_POINTS[action],
    multiplier: isPremium ? PREMIUM_MULTIPLIER : 1.0,
    totalPoints: calculatePoints(action, isPremium),
  }));
}
