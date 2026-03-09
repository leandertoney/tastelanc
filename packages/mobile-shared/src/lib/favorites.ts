import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestReviewIfEligible } from './reviewPrompts';

const FAVORITES_KEY = '@tastelanc_favorites';

/**
 * Get storage key for user-specific favorites
 */
function getStorageKey(userId: string): string {
  return `${FAVORITES_KEY}_${userId}`;
}

/**
 * Get all favorite restaurant IDs from AsyncStorage
 * @param userId - Supabase user UUID
 */
export async function getFavorites(userId: string): Promise<string[]> {
  try {
    const storageKey = getStorageKey(userId);
    const data = await AsyncStorage.getItem(storageKey);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading favorites:', error);
    return [];
  }
}

/**
 * Check if a restaurant is favorited
 * @param userId - Supabase user UUID
 * @param restaurantId - Restaurant UUID
 */
export async function isFavorited(userId: string, restaurantId: string): Promise<boolean> {
  const favorites = await getFavorites(userId);
  return favorites.includes(restaurantId);
}

/**
 * Add a restaurant to favorites
 * @param userId - Supabase user UUID
 * @param restaurantId - Restaurant UUID
 */
export async function addFavorite(userId: string, restaurantId: string): Promise<boolean> {
  try {
    const storageKey = getStorageKey(userId);
    const favorites = await getFavorites(userId);
    if (!favorites.includes(restaurantId)) {
      favorites.push(restaurantId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(favorites));
    }
    // Trigger review prompt on first save
    requestReviewIfEligible('first_save');
    return true;
  } catch (error) {
    console.error('Error adding favorite:', error);
    return false;
  }
}

/**
 * Remove a restaurant from favorites
 * @param userId - Supabase user UUID
 * @param restaurantId - Restaurant UUID
 */
export async function removeFavorite(userId: string, restaurantId: string): Promise<boolean> {
  try {
    const storageKey = getStorageKey(userId);
    const favorites = await getFavorites(userId);
    const index = favorites.indexOf(restaurantId);
    if (index > -1) {
      favorites.splice(index, 1);
      await AsyncStorage.setItem(storageKey, JSON.stringify(favorites));
    }
    return true;
  } catch (error) {
    console.error('Error removing favorite:', error);
    return false;
  }
}

/**
 * Toggle favorite status for a restaurant
 * Returns the new favorite state (true = favorited, false = not favorited)
 * @param userId - Supabase user UUID
 * @param restaurantId - Restaurant UUID
 */
export async function toggleFavorite(userId: string, restaurantId: string): Promise<boolean> {
  const favorited = await isFavorited(userId, restaurantId);
  if (favorited) {
    await removeFavorite(userId, restaurantId);
    return false;
  } else {
    await addFavorite(userId, restaurantId);
    return true;
  }
}

/**
 * Clear all favorites for a user
 * @param userId - Supabase user UUID
 */
export async function clearFavorites(userId: string): Promise<void> {
  try {
    const storageKey = getStorageKey(userId);
    await AsyncStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Error clearing favorites:', error);
  }
}
