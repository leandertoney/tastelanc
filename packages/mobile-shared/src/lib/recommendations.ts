import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase, getBrand } from '../config/theme';
import { getFavorites } from './favorites';
import { getRecentVisitCounts } from './visits';
import { getEpochSeed, seededShuffle, basicFairRotate, getTierWeight } from './fairRotation';
import type { BehavioralFeedItemKind } from './userEvents';
import type { Restaurant, RestaurantCategory, CuisineType, PremiumTier } from '../types/database';
import { ONBOARDING_DATA_KEY, FOOD_PREFERENCE_TO_CUISINE, type OnboardingData } from '../types/onboarding';

// ─── Move Tab Algorithm ────────────────────────────────────────────────────────

/**
 * Context signals for the Move tab personalization algorithm.
 * Populated by usePersonalizedFeed hook and passed to applyContextBoosts().
 */
export interface MoveContext {
  currentTime: Date;
  /** Restaurant IDs visited in the last 7 days — suppress from top positions */
  visitedIds7d: Set<string>;
  /** Restaurant IDs visited in the last 30 days — soft suppress */
  visitedIds30d: Set<string>;
  /** Restaurant IDs the user has ever checked into — used for reward-loop nudge */
  checkinRestaurantIds: Set<string>;
  /** Restaurants where the user lingered on Move cards recently */
  dwelledRestaurantIds: Set<string>;
  /** Restaurants where the user tapped into detail from Move cards recently */
  detailViewedRestaurantIds: Set<string>;
  /** Restaurants the user has rapidly skipped multiple times */
  quickSkippedRestaurantIds: Set<string>;
  /** Per-card-type preference multipliers derived from recent behavior */
  kindAffinity: Partial<Record<BehavioralFeedItemKind, number>>;
}

const MOVE_SCORING = {
  HAPPY_HOUR_ACTIVE_NOW: 30,   // Happy hour is live right now
  EVENT_TODAY: 25,              // Event is happening today
  SPECIAL_RECENT: 20,           // Special created in last 7 days
  NEW_RESTAURANT: 15,           // Restaurant added in last 30 days
  TRENDING: 25,                 // 5+ checkins this week
  HIGH_COMMUNITY_RATING: 15,    // TasteLanc rating >= 4.5
  PROXIMITY_REWARD: 20,         // Within 0.5 miles
  BRUNCH_BONUS: 15,             // Sunday 10am–2pm + brunch category
  LUNCH_BONUS: 15,              // Weekday 11am–2pm + lunch/cafe category
  WEEKEND_EVENING_MULT: 1.2,    // Fri/Sat 5pm–11pm multiplier
  RECENT_VISIT_7D: -40,         // Visited in last 7 days — suppress
  RECENT_VISIT_30D: -15,        // Visited in last 30 days — soft suppress
  NEVER_VISITED_BONUS: 15,      // Discovery premium — never been here
  CHECKIN_ACTIVE_NEVER_HERE: 10, // Reward-loop nudge for checkin users
  DWELL_INTEREST: 18,           // User lingered on this restaurant in Move feed
  DETAIL_VIEW_INTEREST: 12,     // User tapped into this restaurant from Move feed
  QUICK_SKIP_DISINTEREST: -18,  // User repeatedly flicked past this restaurant
};

/**
 * Check if a happy hour is active at the given time.
 * daysOfWeek should be lowercase day names like ['monday', 'friday'].
 */
export function isHappyHourActiveNow(
  startTime: string,
  endTime: string,
  daysOfWeek: string[],
  now: Date = new Date()
): boolean {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayName = dayNames[now.getDay()];
  if (!daysOfWeek.some((d) => d.toLowerCase() === todayName)) return false;

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + (startM || 0);
  const endMinutes = endH * 60 + (endM || 0);

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Apply Move tab context boosts to a restaurant-linked feed item.
 * Returns a score delta (positive = boost, negative = suppress).
 *
 * Call this on top of the base scoreRestaurant() score for restaurant-linked
 * items in the Move feed (happy_hours, specials, events, buzz, new_restaurants).
 */
export function applyContextBoosts(
  restaurantId: string,
  restaurantCategories: string[],
  context: MoveContext,
  signals: {
    isHappyHourNow?: boolean;
    isEventToday?: boolean;
    isNewSpecial?: boolean;     // special created < 7 days ago
    isNewRestaurant?: boolean;  // restaurant added < 30 days ago
    checkinCount7d?: number;    // from buzz data
    tastelancRating?: number;
    distanceMiles?: number;
    feedItemKind?: BehavioralFeedItemKind;
  } = {}
): number {
  let boost = 0;

  const {
    currentTime,
    visitedIds7d,
    visitedIds30d,
    checkinRestaurantIds,
    dwelledRestaurantIds,
    detailViewedRestaurantIds,
    quickSkippedRestaurantIds,
    kindAffinity,
  } = context;
  const hour = currentTime.getHours();
  const dow = currentTime.getDay(); // 0=Sun, 6=Sat
  const isWeekendEvening = (dow === 5 || dow === 6) && hour >= 17 && hour < 23;
  const isBrunchTime = dow === 0 && hour >= 10 && hour < 14;
  const isLunchTime = dow >= 1 && dow <= 5 && hour >= 11 && hour < 14;

  // Content signals
  if (signals.isHappyHourNow) boost += MOVE_SCORING.HAPPY_HOUR_ACTIVE_NOW;
  if (signals.isEventToday) boost += MOVE_SCORING.EVENT_TODAY;
  if (signals.isNewSpecial) boost += MOVE_SCORING.SPECIAL_RECENT;
  if (signals.isNewRestaurant) boost += MOVE_SCORING.NEW_RESTAURANT;
  if ((signals.checkinCount7d ?? 0) >= 5) boost += MOVE_SCORING.TRENDING;
  if ((signals.tastelancRating ?? 0) >= 4.5) boost += MOVE_SCORING.HIGH_COMMUNITY_RATING;
  if (signals.distanceMiles !== undefined && signals.distanceMiles <= 0.5) {
    boost += MOVE_SCORING.PROXIMITY_REWARD;
  }

  // Occasion bonuses (time-of-day context)
  const cats = restaurantCategories.map((c) => c.toLowerCase());
  if (isBrunchTime && cats.includes('brunch')) boost += MOVE_SCORING.BRUNCH_BONUS;
  if (isLunchTime && (cats.includes('lunch') || cats.includes('cafe'))) boost += MOVE_SCORING.LUNCH_BONUS;

  // Apply weekend evening multiplier to positive boosts
  if (isWeekendEvening && boost > 0) {
    boost = Math.round(boost * MOVE_SCORING.WEEKEND_EVENING_MULT);
  }

  // Recency/novelty signals
  if (visitedIds7d.has(restaurantId)) {
    boost += MOVE_SCORING.RECENT_VISIT_7D;
  } else if (visitedIds30d.has(restaurantId)) {
    boost += MOVE_SCORING.RECENT_VISIT_30D;
  } else {
    boost += MOVE_SCORING.NEVER_VISITED_BONUS;
  }

  // Reward-loop nudge: checkin-active user who hasn't been here
  if (checkinRestaurantIds.size > 0 && !checkinRestaurantIds.has(restaurantId)) {
    boost += MOVE_SCORING.CHECKIN_ACTIVE_NEVER_HERE;
  }

  // Strongest explicit signals: user lingered on or tapped into this restaurant.
  if (dwelledRestaurantIds.has(restaurantId)) {
    boost += MOVE_SCORING.DWELL_INTEREST;
  }
  if (detailViewedRestaurantIds.has(restaurantId)) {
    boost += MOVE_SCORING.DETAIL_VIEW_INTEREST;
  }
  if (quickSkippedRestaurantIds.has(restaurantId)) {
    boost += MOVE_SCORING.QUICK_SKIP_DISINTEREST;
  }

  if (boost > 0 && signals.feedItemKind) {
    boost = Math.round(boost * (kindAffinity[signals.feedItemKind] ?? 1));
  }

  return boost;
}

// ─── Base Scoring ──────────────────────────────────────────────────────────────

// Scoring configuration
const SCORING = {
  // Cuisine match (onboarding food pref → restaurant.cuisine)
  CUISINE_MATCH: 25,

  // Category match (entertainment pref → restaurant.categories)
  CATEGORY_MATCH: 15,

  // Food search term match (name/description)
  FOOD_TERM_MATCH: 20,

  // Budget match (onboarding budget → restaurant.price_range)
  BUDGET_MATCH: 10,

  // Vibe/best_for match per tag
  VIBE_MATCH: 15,

  // Recent visit bonus: +5 per visit in last 30 days, capped at +20
  VISIT_BONUS_PER_VISIT: 5,
  VISIT_BONUS_MAX: 20,
  VISIT_DAYS_WINDOW: 30,

  // Favorite bonus
  FAVORITE_BONUS: 10,

  // Verified bonus
  VERIFIED_BONUS: 5,

  // Distance penalty: -1 per mile, capped at -15
  DISTANCE_PENALTY_PER_MILE: 1,
  DISTANCE_PENALTY_MAX: 15,
};

// Storage key for viewed restaurants (for freshness)
const VIEWED_RESTAURANTS_KEY = '@tastelanc_viewed_restaurants';

// Map entertainment preferences to categories (matches ENTERTAINMENT_OPTIONS in onboarding)
const ENTERTAINMENT_TO_CATEGORY: Record<string, RestaurantCategory[]> = {
  'Date night': ['dinner', 'rooftops'],
  'Casual hangout': ['bars', 'lunch'],
  'After work drinks': ['bars', 'nightlife'],
  'Weekend brunch': ['brunch'],
  'Late night eats': ['nightlife', 'bars'],
  'Special occasion': ['dinner', 'rooftops'],
};

// Map entertainment preferences to vibe/best_for tags for matching
const ENTERTAINMENT_TO_VIBE: Record<string, string[]> = {
  'Date night': ['date night', 'romantic', 'intimate', 'upscale'],
  'Casual hangout': ['casual', 'laid-back', 'chill', 'hangout'],
  'After work drinks': ['happy hour', 'after work', 'cocktails', 'drinks'],
  'Weekend brunch': ['brunch', 'weekend', 'mimosas'],
  'Late night eats': ['late night', 'late-night', 'night owl'],
  'Special occasion': ['special occasion', 'celebration', 'upscale', 'fine dining'],
};

// Map budget preference to price_range values
const BUDGET_TO_PRICE: Record<string, string[]> = {
  '$': ['$', '1'],
  '$$': ['$$', '2', '$'],
  '$$$': ['$$$', '3', '$$'],
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
 * Score a restaurant based on user preferences, visit history, favorites, and distance.
 * Exported so FeaturedSection can use it for reason badges.
 */
export function scoreRestaurant(
  restaurant: Restaurant,
  preferences: OnboardingData,
  favorites: string[],
  recentVisitCounts: Record<string, number> = {},
  userLocation?: { latitude: number; longitude: number }
): number {
  let score = 0;

  // Boost for verified restaurants
  if (restaurant.is_verified) {
    score += SCORING.VERIFIED_BONUS;
  }

  // 1. Cuisine match: onboarding food preference → restaurant.cuisine field
  if (restaurant.cuisine) {
    for (const foodPref of preferences.foodPreferences) {
      const cuisineType = FOOD_PREFERENCE_TO_CUISINE[foodPref] as CuisineType | undefined;
      if (cuisineType && restaurant.cuisine === cuisineType) {
        score += SCORING.CUISINE_MATCH;
        break; // One match is enough
      }
    }
  }

  // 2. Category match: entertainment preferences → restaurant categories
  const preferredCategories = getRecommendedCategories(preferences);
  const matchingCategories = restaurant.categories.filter((cat) =>
    preferredCategories.includes(cat)
  );
  score += matchingCategories.length * SCORING.CATEGORY_MATCH;

  // 3. Food search term match in name/description
  const nameAndDesc = `${restaurant.name} ${restaurant.description || ''}`.toLowerCase();
  for (const foodPref of preferences.foodPreferences) {
    const searchTerms = FOOD_SEARCH_TERMS[foodPref] || [];
    for (const term of searchTerms) {
      if (nameAndDesc.includes(term.toLowerCase())) {
        score += SCORING.FOOD_TERM_MATCH;
        break; // One match per food pref is enough
      }
    }
  }

  // 4. Budget match: onboarding budget → restaurant.price_range
  if (preferences.budgetPreferences && preferences.budgetPreferences.length > 0 && restaurant.price_range) {
    if (preferences.budgetPreferences.includes('All of the above')) {
      score += SCORING.BUDGET_MATCH;
    } else {
      const acceptablePrices: string[] = [];
      for (const bp of preferences.budgetPreferences) {
        const prices = BUDGET_TO_PRICE[bp] || [];
        for (const p of prices) {
          if (!acceptablePrices.includes(p)) acceptablePrices.push(p);
        }
      }
      if (acceptablePrices.includes(restaurant.price_range)) {
        score += SCORING.BUDGET_MATCH;
      }
    }
  }

  // 5. Vibe/best_for match: entertainment preferences → vibe_tags + best_for
  const restaurantVibes = [
    ...(restaurant.vibe_tags || []),
    ...(restaurant.best_for || []),
  ].map((v) => v.toLowerCase());

  if (restaurantVibes.length > 0) {
    for (const entPref of preferences.entertainmentPreferences) {
      const vibeTerms = ENTERTAINMENT_TO_VIBE[entPref] || [];
      for (const term of vibeTerms) {
        if (restaurantVibes.some((v) => v.includes(term))) {
          score += SCORING.VIBE_MATCH;
          break; // One match per entertainment pref
        }
      }
    }
  }

  // 6. Recent visit bonus: +5 per visit in last 30 days, capped at +20
  if (recentVisitCounts[restaurant.id]) {
    const visitBoost = Math.min(
      recentVisitCounts[restaurant.id] * SCORING.VISIT_BONUS_PER_VISIT,
      SCORING.VISIT_BONUS_MAX
    );
    score += visitBoost;
  }

  // 7. Favorite bonus
  if (favorites.includes(restaurant.id)) {
    score += SCORING.FAVORITE_BONUS;
  }

  // 8. Distance penalty: -1 per mile, capped at -15
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

  return score;
}

/**
 * Get personalized restaurant recommendations
 * @param limit - Number of recommendations to return
 * @param userId - Optional user ID for favorites-based scoring
 * @param userLocation - Optional user location for distance-based scoring
 * @param marketId - Optional market ID to scope results to a specific market
 */
export async function getRecommendations(
  limit: number = 10,
  userId?: string,
  userLocation?: { latitude: number; longitude: number },
  marketId?: string | null
): Promise<Restaurant[]> {
  try {
    const supabase = getSupabase();
    // Get user preferences
    const preferences = await getUserPreferences();

    // Get user's favorites (if userId provided)
    const favorites = userId ? await getFavorites(userId) : [];

    // Get user's recent visit counts for personalization (last 30 days)
    const { counts: recentVisitCounts } = userId
      ? await getRecentVisitCounts(userId, SCORING.VISIT_DAYS_WINDOW)
      : { counts: {} };

    // If no preferences, return active restaurants with cover images ordered by name
    if (!preferences) {
      let fallbackQuery = supabase
        .from('restaurants')
        .select('*, tiers(name)')
        .eq('is_active', true)
        .not('cover_image_url', 'is', null);

      if (marketId) {
        fallbackQuery = fallbackQuery.eq('market_id', marketId);
      }

      const { data, error } = await fallbackQuery
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

    // Fetch restaurants matching each category (include tier data for weighting)
    for (const category of recommendedCategories) {
      let catQuery = supabase
        .from('restaurants')
        .select('*, tiers(name)')
        .eq('is_active', true)
        .not('cover_image_url', 'is', null)
        .contains('categories', [category]);

      if (marketId) {
        catQuery = catQuery.eq('market_id', marketId);
      }

      const { data, error } = await catQuery.limit(30);

      if (!error && data) {
        allRestaurants = [...allRestaurants, ...data];
      }
    }

    // Also fetch some general verified restaurants for variety
    let verifiedQuery = supabase
      .from('restaurants')
      .select('*, tiers(name)')
      .eq('is_active', true)
      .not('cover_image_url', 'is', null)
      .eq('is_verified', true);

    if (marketId) {
      verifiedQuery = verifiedQuery.eq('market_id', marketId);
    }

    const { data: verifiedData } = await verifiedQuery.limit(10);

    if (verifiedData) {
      allRestaurants = [...allRestaurants, ...verifiedData];
    }

    // Remove duplicates
    const uniqueRestaurants = Array.from(
      new Map(allRestaurants.map((r) => [r.id, r])).values()
    );

    // Score and sort restaurants (including visit-based personalization, distance, and tier weight)
    const scoredRestaurants = uniqueRestaurants.map((restaurant) => {
      const baseScore = scoreRestaurant(restaurant, preferences, favorites, recentVisitCounts, userLocation);
      const tierName = (restaurant as any).tiers?.name || 'basic';
      return {
        restaurant,
        score: baseScore * getTierWeight(tierName),
      };
    });

    scoredRestaurants.sort((a, b) => b.score - a.score);

    // Return top recommendations
    return scoredRestaurants.slice(0, limit).map((item) => item.restaurant);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
}

/**
 * Get a personalized greeting based on time and preferences.
 * Uses actual onboarding ENTERTAINMENT_OPTIONS labels.
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

  // Time-aware personalization using actual onboarding option labels
  if (preferences.entertainmentPreferences.includes('Weekend brunch') && hour < 14) {
    return `${timeGreeting}! Ready for brunch? Check out these spots.`;
  }

  if (preferences.entertainmentPreferences.includes('Late night eats') && hour >= 20) {
    return `${timeGreeting}! Looking for late-night eats? We've got you.`;
  }

  if (preferences.entertainmentPreferences.includes('After work drinks') && hour >= 16 && hour < 20) {
    return `${timeGreeting}! Time for after-work drinks? Here are our picks.`;
  }

  if (preferences.entertainmentPreferences.includes('Date night') && hour >= 17) {
    return `${timeGreeting}! Planning a date night? These spots are perfect.`;
  }

  if (preferences.name) {
    return `${timeGreeting}, ${preferences.name}! Here are your picks.`;
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
 * Get featured restaurants for homepage — PAID ONLY.
 * Elite restaurants appear first (guaranteed block), Premium shuffled after.
 * Uses epoch-based seeded shuffle for consistent ordering within 30-minute windows.
 * @param limit - Number of restaurants to return (default 24)
 */
export async function getFeaturedRestaurants(limit: number = 24, marketId: string | null = null): Promise<Restaurant[]> {
  try {
    const supabase = getSupabase();
    // Fetch ALL premium/elite restaurants with cover images only
    let featuredQuery = supabase
      .from('restaurants')
      .select('*, tiers!inner(name)')
      .eq('is_active', true)
      .not('cover_image_url', 'is', null)
      .in('tiers.name', ['premium', 'elite']);

    if (marketId) {
      featuredQuery = featuredQuery.eq('market_id', marketId);
    }

    const { data: paidRestaurants, error } = await featuredQuery;

    if (error) {
      console.error('Error fetching paid restaurants:', error);
      return [];
    }

    const paid = paidRestaurants || [];
    const seed = getEpochSeed();

    // Separate elite and premium, shuffle each with epoch seed
    const elite = paid.filter((r: any) => r.tiers?.name === 'elite');
    const premium = paid.filter((r: any) => r.tiers?.name === 'premium');

    const result: any[] = [
      ...seededShuffle(elite, seed),
      ...seededShuffle(premium, seed + 1),
    ];

    // If no paid-tier restaurants exist in this market (e.g. new market launch),
    // fall back to a shuffled selection of all active restaurants with cover images.
    // This ensures "For You" is never empty just because no paid tiers are set up yet.
    if (result.length === 0) {
      let basicQuery = supabase
        .from('restaurants')
        .select('*, tiers(name)')
        .eq('is_active', true)
        .not('cover_image_url', 'is', null);

      if (marketId) {
        basicQuery = basicQuery.eq('market_id', marketId);
      }

      const { data: basicData } = await basicQuery;
      const shuffled = seededShuffle(basicData || [], seed);
      return shuffled.slice(0, limit) as Restaurant[];
    }

    // After paid tiers, fill remaining slots with event participants (e.g. Coffee & Chocolate Trail).
    // Event participants get NO fake tier badges — their event starburst badge is their indicator.
    // No basic/free restaurants are promoted in the featured section.
    if (result.length < limit && marketId) {
      const paidIds = new Set(result.map((r: any) => r.id));

      const { data: trailRows } = await supabase
        .from('holiday_specials')
        .select('restaurant:restaurants!inner(*, tiers(name))')
        .eq('holiday_tag', 'coffee-chocolate-trail-2026')
        .eq('is_active', true)
        .eq('restaurant.market_id', marketId)
        .eq('restaurant.is_active', true);

      const trailRestaurants = ((trailRows || []) as any[])
        .map((row: any) => row.restaurant)
        .filter(Boolean);

      // Deduplicate by restaurant id and exclude already-included paid restaurants
      const seen = new Set<string>();
      const uniqueTrail = trailRestaurants.filter((r: any) => {
        if (paidIds.has(r.id) || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

      const shuffledTrail = seededShuffle(uniqueTrail, seed + 2).slice(0, limit - result.length);
      result.push(...shuffledTrail);
    }

    return result.slice(0, limit) as Restaurant[];
  } catch (error) {
    console.error('Error getting featured restaurants:', error);
    return [];
  }
}

/**
 * Get "Other Places Nearby" restaurants — BASIC (free) ONLY.
 * Personalized: scores restaurants by user preferences, then sorts.
 * Falls back to epoch-based fair rotation if no preferences exist.
 * Serves as an upsell funnel: basic restaurants see paid ones above them.
 */
export async function getOtherRestaurants(
  excludeIds: string[],
  page: number = 0,
  pageSize: number = 10,
  marketId: string | null = null
): Promise<{ restaurants: Restaurant[]; hasMore: boolean }> {
  try {
    const supabase = getSupabase();
    // Fetch all active basic restaurants with cover images (no tier or basic tier)
    let query = supabase
      .from('restaurants')
      .select('*, tiers(name)', { count: 'exact' })
      .eq('is_active', true)
      .not('cover_image_url', 'is', null);

    if (marketId) {
      query = query.eq('market_id', marketId);
    }

    // Exclude featured restaurants if provided
    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter to basic-only (no tier or tier name is 'basic')
    const basicOnly = (data || []).filter(
      (r: any) => !r.tiers?.name || r.tiers.name === 'basic'
    );

    // Try preference-based scoring; fall back to fair rotation
    const preferences = await getUserPreferences();
    let sorted: Restaurant[];

    if (preferences) {
      // Score and sort by preference match (basic = free, no fairness obligation)
      const scored = basicOnly.map((r) => ({
        restaurant: r as Restaurant,
        score: scoreRestaurant(r as Restaurant, preferences, []),
      }));
      scored.sort((a, b) => b.score - a.score);
      sorted = scored.map((s) => s.restaurant);
    } else {
      // No preferences — use epoch-based fair rotation
      sorted = basicFairRotate(basicOnly) as Restaurant[];
    }

    // Paginate the sorted results
    const offset = page * pageSize;
    const pageData = sorted.slice(offset, offset + pageSize);
    const hasMore = offset + pageSize < sorted.length;

    return {
      restaurants: pageData,
      hasMore,
    };
  } catch (error) {
    console.error('Error getting other restaurants:', error);
    return { restaurants: [], hasMore: false };
  }
}

/**
 * Get suggestion text for why a restaurant is recommended.
 *
 * Trust hierarchy — only claims backed by real evidence:
 * 1. Google review highlights (real reviewers said this)
 * 2. Google rating (crowd-validated score)
 * 3. Community user ratings (our own community sentiment)
 * 4. Signature dishes (curated enrichment)
 * 5. Vibe/occasion match (safe: describes atmosphere, not food quality)
 * 6. Verified fallback
 *
 * Deliberately avoids "Great [cuisine]" claims — cuisine field only means
 * they serve it, not that they're good at it.
 */
export function getRecommendationReason(
  restaurant: Restaurant,
  preferences: OnboardingData | null
): string | null {
  // 1. Google review highlight (strongest signal — real reviewers said this)
  if (
    restaurant.google_review_highlights &&
    restaurant.google_review_highlights.length > 0
  ) {
    return restaurant.google_review_highlights[0];
  }

  // 2. Google rating (crowd-validated from Google)
  if (
    restaurant.google_rating &&
    restaurant.google_rating >= 4.2 &&
    restaurant.google_review_count >= 10
  ) {
    return `${restaurant.google_rating.toFixed(1)}★ on Google`;
  }

  // 3. Community user ratings (our own community)
  if (
    restaurant.tastelancrating &&
    restaurant.tastelancrating >= 4.0 &&
    restaurant.tastelancrating_count >= 3
  ) {
    return `Highly rated (${restaurant.tastelancrating.toFixed(1)}★)`;
  }

  // 4. Signature dishes (curated enrichment — verifiable claims)
  if (restaurant.signature_dishes && restaurant.signature_dishes.length > 0) {
    return `Known for ${restaurant.signature_dishes[0]}`;
  }

  // 5. Vibe/occasion match (safe: describes atmosphere, not food quality)
  if (preferences) {
    const restaurantVibes = [
      ...(restaurant.vibe_tags || []),
      ...(restaurant.best_for || []),
    ].map((v) => v.toLowerCase());

    if (restaurantVibes.length > 0) {
      for (const entPref of preferences.entertainmentPreferences) {
        const vibeTerms = ENTERTAINMENT_TO_VIBE[entPref] || [];
        for (const term of vibeTerms) {
          if (restaurantVibes.some((v) => v.includes(term))) {
            return `Great for ${entPref.toLowerCase()}`;
          }
        }
      }
    }
  }

  // 6. Verified fallback
  if (restaurant.is_verified) {
    const brand = getBrand();
    return brand.verifiedLabel;
  }

  return null;
}
