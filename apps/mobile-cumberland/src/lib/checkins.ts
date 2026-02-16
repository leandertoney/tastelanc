import AsyncStorage from '@react-native-async-storage/async-storage';
import { earnPoints, POINT_VALUES } from './rewards';

const CHECKINS_KEY = '@tastelanc_checkins';

export interface CheckIn {
  restaurantId: string;
  restaurantName: string;
  timestamp: string;
  pointsEarned: number;
}

export interface CheckInData {
  checkins: CheckIn[];
  totalPoints: number;
}

/**
 * Get storage key for user-specific check-ins
 */
function getStorageKey(userId: string): string {
  return `${CHECKINS_KEY}_${userId}`;
}

/**
 * Get all check-ins from AsyncStorage
 * @param userId - Supabase user UUID
 */
export async function getCheckIns(userId: string): Promise<CheckInData> {
  try {
    const storageKey = getStorageKey(userId);
    const data = await AsyncStorage.getItem(storageKey);
    if (data) {
      return JSON.parse(data);
    }
    return { checkins: [], totalPoints: 0 };
  } catch (error) {
    console.error('Error reading check-ins:', error);
    return { checkins: [], totalPoints: 0 };
  }
}

/**
 * Get check-in count for a specific restaurant
 * @param userId - Supabase user UUID
 * @param restaurantId - Restaurant UUID
 */
export async function getRestaurantCheckInCount(userId: string, restaurantId: string): Promise<number> {
  const data = await getCheckIns(userId);
  return data.checkins.filter((c) => c.restaurantId === restaurantId).length;
}

/**
 * Check if user can check in (limit one per restaurant per day)
 * @param userId - Supabase user UUID
 * @param restaurantId - Restaurant UUID
 */
export async function canCheckIn(userId: string, restaurantId: string): Promise<boolean> {
  const data = await getCheckIns(userId);
  const today = new Date().toDateString();

  const todayCheckIn = data.checkins.find(
    (c) => c.restaurantId === restaurantId && new Date(c.timestamp).toDateString() === today
  );

  return !todayCheckIn;
}

/**
 * Record a new check-in
 * Integrates with rewards API to earn points (with premium multiplier)
 * Falls back to local storage if API fails
 *
 * @param userId - Supabase user UUID
 * @param restaurantId - Restaurant UUID
 * @param restaurantName - Restaurant display name
 * @param points - Base points to award (default from POINT_VALUES.checkin = 5)
 */
export async function recordCheckIn(
  userId: string,
  restaurantId: string,
  restaurantName: string,
  points: number = POINT_VALUES.checkin
): Promise<{ success: boolean; totalPoints: number; message: string; pointsEarned?: number }> {
  try {
    // Check if already checked in today
    const canDoCheckIn = await canCheckIn(userId, restaurantId);
    if (!canDoCheckIn) {
      const data = await getCheckIns(userId);
      return {
        success: false,
        totalPoints: data.totalPoints,
        message: "You've already checked in here today!",
      };
    }

    let pointsEarned = points;
    let newBalance = 0;

    // Try to earn points via rewards API (handles premium multiplier)
    try {
      const rewardsResult = await earnPoints({
        action_type: 'checkin',
        restaurant_id: restaurantId,
        radar_verified: true, // PIN verification is trusted
      });

      pointsEarned = rewardsResult.points_earned;
      newBalance = rewardsResult.new_balance;
    } catch (apiError) {
      console.warn('[CheckIn] Rewards API failed, using local storage:', apiError);
      // API failed, continue with local storage only
    }

    // Store locally for offline access and history
    const storageKey = getStorageKey(userId);
    const data = await getCheckIns(userId);
    const newCheckIn: CheckIn = {
      restaurantId,
      restaurantName,
      timestamp: new Date().toISOString(),
      pointsEarned,
    };

    data.checkins.push(newCheckIn);
    // Use API balance if available, otherwise calculate locally
    data.totalPoints = newBalance > 0 ? newBalance : data.totalPoints + pointsEarned;

    await AsyncStorage.setItem(storageKey, JSON.stringify(data));

    return {
      success: true,
      totalPoints: data.totalPoints,
      message: `+${pointsEarned} points earned!`,
      pointsEarned,
    };
  } catch (error) {
    console.error('Error recording check-in:', error);
    return {
      success: false,
      totalPoints: 0,
      message: 'Failed to record check-in',
    };
  }
}

/**
 * Get total points
 * @param userId - Supabase user UUID
 */
export async function getTotalPoints(userId: string): Promise<number> {
  const data = await getCheckIns(userId);
  return data.totalPoints;
}

/**
 * Get recent check-ins (last 10)
 * @param userId - Supabase user UUID
 * @param limit - Number of check-ins to return
 */
export async function getRecentCheckIns(userId: string, limit: number = 10): Promise<CheckIn[]> {
  const data = await getCheckIns(userId);
  return data.checkins.slice(-limit).reverse();
}

/**
 * Clear all check-ins for a user (for testing)
 * @param userId - Supabase user UUID
 */
export async function clearCheckIns(userId: string): Promise<void> {
  try {
    const storageKey = getStorageKey(userId);
    await AsyncStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Error clearing check-ins:', error);
  }
}
