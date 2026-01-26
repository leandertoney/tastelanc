import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { getFavorites } from './favorites';
import { getRecentVisitCounts } from './visits';
import type { Restaurant, RestaurantCategory } from '../types/database';
import { ONBOARDING_DATA_KEY, type OnboardingData } from '../types/onboarding';

// Scoring configuration
const SCORING = {
  // Recent visit bonus: +5 per visit in last 30 days, capped at +20
  VISIT_BONUS_PER_VISIT: 5,
  VISIT_BONUS_MAX: 20,
  VISIT_DAYS_WINDOW: 30,

  // Favorite bonus
  FAVORITE_BONUS: 10,

  // Distance penalty: -1 per mile, capped at -15
  DISTANCE_PENALTY_PER_MILE: 1,
  DISTANCE_PENALTY_MAX: 15,
};

// Storage key for viewed restaurants (for freshness)
const VIEWED_RESTAURANTS_KEY = '@tastelanc_viewed_restaurants';

// Map entertainment preferences to categories
const ENTERTAINMENT_TO_CATEGORY: Record<string, RestaurantCategory[]> = {
  'Live music': ['bars', 'nightlife'],
  'Trivia': ['bars'],
  'Cocktails': ['bars', 'nightlife', 'rooftops'],
  'Outdoor dining': ['outdoor_dining', 'rooftops'],
  'Brunch': ['brunch'],
  'Late night': ['nightlife', 'bars'],
};

// Map food preferences to search terms (for description/name matching)
const FOOD_SEARCH_TERMS: Record<string, string[]> = {
  'Burgers': ['burger', 'grill', 'american'],
  'Mexican': ['mexican', 'taco', 'burrito', 'cantina'],
  'Italian': ['italian', 'pasta', 'pizza', 'trattoria'],
  'Pizza': ['pizza', 'pizzeria'],
  'Seafood': ['seafood', 'fish', 'oyster', 'crab'],
  'Vegan': ['vegan', 'vegetarian', 'plant'],
};

/**
 * Get user's onboarding preferences
 */
export async function getUserPreferences(): Promise<OnboardingData | null> {
  try {
    const data = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
}

/**
 * Get recommended categories based on user preferences
 */
function getRecommendedCategories(preferences: OnboardingData): RestaurantCategory[] {
  const categories = new Set<RestaurantCategory>();

  // Map entertainment preferences to categories
  preferences.entertainmentPreferences.forEach((pref) => {
    const mappedCategories = ENTERTAINMENT_TO_CATEGORY[pref];
    if (mappedCategories) {
      mappedCategories.forEach((cat) => categories.add(cat));
    }
  });

  // If no specific preferences, add some defaults
  if (categories.size === 0) {
    categories.add('dinner');
    categories.add('bars');
  }

  return Array.from(categories);
}

/**
 * Calculate distance between two coordinates in miles
 */
function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Score a restaurant based on user preferences, visit history, favorites, and distance
 */
function scoreRestaurant(
  restaurant: Restaurant,
  preferences: OnboardingData,
  favorites: string[],
  recentVisitCounts: Record<string, number> = {},
  userLocation?: { latitude: number; longitude: number }
): number {
  let score = 0;

  // Boost for verified restaurants
  if (restaurant.is_verified) {
    score += 5;
  }

  // Boost for restaurants in preferred categories
  const preferredCategories = getRecommendedCategories(preferences);
  const matchingCategories = restaurant.categories.filter((cat) =>
    preferredCategories.includes(cat)
  );
  score += matchingCategories.length * 15;

  // Boost for food preference matches in name/description
  preferences.foodPreferences.forEach((foodPref) => {
    const searchTerms = FOOD_SEARCH_TERMS[foodPref] || [];
    const nameAndDesc = `${restaurant.name} ${restaurant.description || ''}`.toLowerCase();

    searchTerms.forEach((term) => {
      if (nameAndDesc.includes(term.toLowerCase())) {
        score += 20;
      }
    });
  });

  // Recent visit bonus: +5 per visit in last 30 days, capped at +20
  if (recentVisitCounts[restaurant.id]) {
    const visitBoost = Math.min(
      recentVisitCounts[restaurant.id] * SCORING.VISIT_BONUS_PER_VISIT,
      SCORING.VISIT_BONUS_MAX
    );
    score += visitBoost;
  }

  // Favorite bonus: +10
  if (favorites.includes(restaurant.id)) {
    score += SCORING.FAVORITE_BONUS;
  }

  // Distance penalty: -1 per mile, capped at -15
  if (userLocation && restaurant.latitude && restaurant.longitude) {
    const distance = calculateDistanceMiles(
      userLocation.latitude,
      userLocation.longitude,
      restaurant.latitude,
      restaurant.longitude
    );
    const distancePenalty = Math.min(
      distance * SCORING.DISTANCE_PENALTY_PER_MILE,
      SCORING.DISTANCE_PENALTY_MAX
    );
    score -= distancePenalty;
  }

  // Small random factor for variety (0-3)
  score += Math.random() * 3;

  return score;
}

/**
 * Get personalized restaurant recommendations
 * @param limit - Number of recommendations to return
 * @param userId - Optional user ID for favorites-based scoring
 * @param userLocation - Optional user location for distance-based scoring
 */
export async function getRecommendations(
  limit: number = 10,
  userId?: string,
  userLocation?: { latitude: number; longitude: number }
): Promise<Restaurant[]> {
  try {
    // Get user preferences
    const preferences = await getUserPreferences();

    // Get user's favorites (if userId provided)
    const favorites = userId ? await getFavorites(userId) : [];

    // Get user's recent visit counts for personalization (last 30 days)
    const { counts: recentVisitCounts } = userId
      ? await getRecentVisitCounts(userId, SCORING.VISIT_DAYS_WINDOW)
      : { counts: {} };

    // If no preferences, return active restaurants ordered by name
    if (!preferences) {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    }

    // Get recommended categories
    const recommendedCategories = getRecommendedCategories(preferences);

    // Fetch restaurants that match preferred categories
    // Using OR logic to get restaurants in ANY of the preferred categories
    let allRestaurants: Restaurant[] = [];

    // Fetch restaurants matching each category
    for (const category of recommendedCategories) {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .contains('categories', [category])
        .limit(30);

      if (!error && data) {
        allRestaurants = [...allRestaurants, ...data];
      }
    }

    // Also fetch some general verified restaurants for variety
    const { data: verifiedData } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true)
      .limit(10);

    if (verifiedData) {
      allRestaurants = [...allRestaurants, ...verifiedData];
    }

    // Remove duplicates
    const uniqueRestaurants = Array.from(
      new Map(allRestaurants.map((r) => [r.id, r])).values()
    );

    // Score and sort restaurants (including visit-based personalization and distance)
    const scoredRestaurants = uniqueRestaurants.map((restaurant) => ({
      restaurant,
      score: scoreRestaurant(restaurant, preferences, favorites, recentVisitCounts, userLocation),
    }));

    scoredRestaurants.sort((a, b) => b.score - a.score);

    // Return top recommendations
    return scoredRestaurants.slice(0, limit).map((item) => item.restaurant);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
}

/**
 * Get a personalized greeting based on time and preferences
 */
export function getPersonalizedGreeting(preferences: OnboardingData | null): string {
  const hour = new Date().getHours();

  let timeGreeting: string;
  if (hour < 12) {
    timeGreeting = 'Good morning';
  } else if (hour < 17) {
    timeGreeting = 'Good afternoon';
  } else {
    timeGreeting = 'Good evening';
  }

  if (!preferences) {
    return `${timeGreeting}! Here are some spots we think you'll love.`;
  }

  // Personalize based on preferences
  if (preferences.entertainmentPreferences.includes('Brunch') && hour < 14) {
    return `${timeGreeting}! Ready for brunch? Check out these spots.`;
  }

  if (preferences.entertainmentPreferences.includes('Late night') && hour >= 20) {
    return `${timeGreeting}! Looking for late-night fun? We've got you.`;
  }

  if (preferences.entertainmentPreferences.includes('Cocktails') && hour >= 17) {
    return `${timeGreeting}! Time for cocktails? Here are our picks.`;
  }

  return `${timeGreeting}! Based on your taste, you'll love these.`;
}

/**
 * Track that user viewed a restaurant (for future freshness scoring)
 */
export async function trackRestaurantView(restaurantId: string): Promise<void> {
  try {
    const viewedData = await AsyncStorage.getItem(VIEWED_RESTAURANTS_KEY);
    const viewed: Record<string, number> = viewedData ? JSON.parse(viewedData) : {};

    viewed[restaurantId] = Date.now();

    // Keep only last 100 views
    const entries = Object.entries(viewed);
    if (entries.length > 100) {
      entries.sort((a, b) => b[1] - a[1]);
      const trimmed = Object.fromEntries(entries.slice(0, 100));
      await AsyncStorage.setItem(VIEWED_RESTAURANTS_KEY, JSON.stringify(trimmed));
    } else {
      await AsyncStorage.setItem(VIEWED_RESTAURANTS_KEY, JSON.stringify(viewed));
    }
  } catch (error) {
    console.error('Error tracking restaurant view:', error);
  }
}

/**
 * Shuffle array randomly (Fisher-Yates algorithm)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get featured restaurants for homepage
 * Shows paid restaurants first (randomized), then unpaid (randomized)
 * @param limit - Number of restaurants to return (default 16)
 */
export async function getFeaturedRestaurants(limit: number = 16): Promise<Restaurant[]> {
  try {
    // First, fetch ALL premium/elite restaurants (guaranteed to include them)
    const { data: paidRestaurants, error: paidError } = await supabase
      .from('restaurants')
      .select('*, tiers!inner(name)')
      .eq('is_active', true)
      .in('tiers.name', ['premium', 'elite']);

    if (paidError) {
      console.error('Error fetching paid restaurants:', paidError);
    }

    const paid = paidRestaurants || [];
    const paidIds = new Set(paid.map((r) => r.id));

    // Then fetch basic/unpaid restaurants to fill remaining slots
    const remainingSlots = Math.max(0, limit - paid.length + 30); // Extra for randomization
    const { data: unpaidRestaurants, error: unpaidError } = await supabase
      .from('restaurants')
      .select('*, tiers(name)')
      .eq('is_active', true)
      .limit(remainingSlots);

    if (unpaidError) throw unpaidError;

    // Filter out any paid restaurants that might have been included
    const unpaid = (unpaidRestaurants || []).filter((r) => !paidIds.has(r.id));

    // Shuffle each group and concat paid first
    const result = [...shuffleArray(paid), ...shuffleArray(unpaid)].slice(0, limit);

    return result;
  } catch (error) {
    console.error('Error getting featured restaurants:', error);
    return [];
  }
}

/**
 * Get "Other Places Nearby" restaurants (excludes featured restaurants)
 * Less prominent section with pagination support
 */
export async function getOtherRestaurants(
  excludeIds: string[],
  page: number = 0,
  pageSize: number = 10
): Promise<{ restaurants: Restaurant[]; hasMore: boolean }> {
  try {
    const offset = page * pageSize;

    // Get total count for hasMore calculation
    let query = supabase
      .from('restaurants')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('name', { ascending: true })
      .range(offset, offset + pageSize);

    // Exclude featured restaurants if provided
    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const hasMore = count ? offset + pageSize < count : false;

    return {
      restaurants: data || [],
      hasMore,
    };
  } catch (error) {
    console.error('Error getting other restaurants:', error);
    return { restaurants: [], hasMore: false };
  }
}

/**
 * Get suggestion text for why a restaurant is recommended
 */
export function getRecommendationReason(
  restaurant: Restaurant,
  preferences: OnboardingData | null
): string | null {
  if (!preferences) return null;

  // Check category matches
  const preferredCategories = preferences ? getRecommendedCategories(preferences) : [];

  for (const category of restaurant.categories) {
    if (preferredCategories.includes(category)) {
      switch (category) {
        case 'brunch':
          return 'Perfect for brunch lovers';
        case 'bars':
          return 'Great bar scene';
        case 'nightlife':
          return 'Perfect for night owls';
        case 'outdoor_dining':
          return 'Al fresco dining';
        case 'rooftops':
          return 'Amazing rooftop views';
        default:
          return null;
      }
    }
  }

  // Check food preference matches
  for (const foodPref of preferences.foodPreferences) {
    const searchTerms = FOOD_SEARCH_TERMS[foodPref] || [];
    const nameAndDesc = `${restaurant.name} ${restaurant.description || ''}`.toLowerCase();

    for (const term of searchTerms) {
      if (nameAndDesc.includes(term.toLowerCase())) {
        return `Great ${foodPref.toLowerCase()}`;
      }
    }
  }

  if (restaurant.is_verified) {
    return 'TasteLanc verified';
  }

  return null;
}
