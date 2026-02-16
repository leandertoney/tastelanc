/**
 * Client-side itinerary generation algorithm
 * Builds a time-sequenced day plan using existing restaurant, event, and happy hour data
 */

import { calculateDistance } from '../hooks/useUserLocation';
import type { Restaurant, RestaurantHours, HappyHour, DayOfWeek, RestaurantCategory, CuisineType } from '../types/database';
import { CUISINE_LABELS } from '../types/database';
import type { ApiEvent } from './events';
import type { OnboardingData } from '../types/onboarding';
import { FOOD_PREFERENCE_TO_CUISINE } from '../types/onboarding';
import type {
  TimeSlot,
  ItineraryItemWithReason,
  ItineraryMood,
} from '../types/itinerary';
import { ALL_TIME_SLOTS, TIME_SLOT_CONFIG } from '../types/itinerary';

// ─── Input types ────────────────────────────────────────────────

export interface GenerateItineraryParams {
  date: string; // ISO date string (YYYY-MM-DD)
  mood: ItineraryMood | null;
  preferences: OnboardingData | null;
  userLocation: { latitude: number; longitude: number } | null;
  favorites: string[];
  restaurants: Restaurant[];
  allHours: Record<string, RestaurantHours[]>; // keyed by restaurant_id
  allHappyHours: HappyHour[];
  allEvents: ApiEvent[];
}

export interface GenerateResult {
  items: ItineraryItemWithReason[];
  skippedSlots: TimeSlot[];
}

// ─── Day mapping ────────────────────────────────────────────────

const DAY_INDEX_TO_NAME: DayOfWeek[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

function getDayOfWeek(dateStr: string): DayOfWeek {
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid timezone edge cases
  return DAY_INDEX_TO_NAME[d.getDay()];
}

// ─── Time helpers ───────────────────────────────────────────────

function parseTimeToMinutes(timeStr: string): number {
  // Handle formats like "17:00", "17:00:00", "5:00 PM"
  const cleaned = timeStr.trim();
  const parts = cleaned.split(':');
  const hours = parseInt(parts[0], 10);
  const mins = parseInt(parts[1] || '0', 10);
  return hours * 60 + mins;
}

function isOpenDuringRange(
  hours: RestaurantHours[],
  dayOfWeek: DayOfWeek,
  rangeStartMin: number,
  rangeEndMin: number,
): boolean {
  const dayHours = hours.find(h => h.day_of_week === dayOfWeek);
  if (!dayHours || dayHours.is_closed || !dayHours.open_time || !dayHours.close_time) {
    return false;
  }
  const openMin = parseTimeToMinutes(dayHours.open_time);
  let closeMin = parseTimeToMinutes(dayHours.close_time);
  // Handle overnight closing (e.g., closes at 2am)
  if (closeMin < openMin) closeMin += 24 * 60;
  // Restaurant is open during range if it opens before the range ends and closes after range starts
  return openMin <= rangeEndMin && closeMin >= rangeStartMin;
}

// ─── Slot time ranges (in minutes from midnight) ────────────────

const SLOT_TIME_RANGES: Record<TimeSlot, { start: number; end: number }> = {
  breakfast:  { start: 7 * 60,       end: 10 * 60 },       // 7:00 - 10:00
  morning:    { start: 10 * 60,      end: 11 * 60 + 30 },  // 10:00 - 11:30
  lunch:      { start: 11 * 60 + 30, end: 14 * 60 },       // 11:30 - 14:00
  afternoon:  { start: 14 * 60,      end: 16 * 60 },       // 14:00 - 16:00
  happy_hour: { start: 16 * 60,      end: 18 * 60 },       // 16:00 - 18:00
  dinner:     { start: 17 * 60 + 30, end: 21 * 60 },       // 17:30 - 21:00
  evening:    { start: 20 * 60,      end: 24 * 60 },       // 20:00 - 24:00
};

// ─── Category/cuisine mappings for slots ────────────────────────

const SLOT_PREFERRED_CATEGORIES: Record<TimeSlot, RestaurantCategory[]> = {
  breakfast:  ['brunch'],
  morning:    ['brunch'],
  lunch:      ['lunch'],
  afternoon:  ['outdoor_dining', 'rooftops'],
  happy_hour: ['bars', 'rooftops'],
  dinner:     ['dinner'],
  evening:    ['bars', 'nightlife', 'rooftops'],
};

const SLOT_PREFERRED_CUISINES: Record<TimeSlot, CuisineType[]> = {
  breakfast:  ['cafe', 'american_contemporary'],
  morning:    ['cafe'],
  lunch:      ['american_contemporary', 'italian', 'asian', 'latin', 'mediterranean', 'pub_fare'],
  afternoon:  ['cafe'],
  happy_hour: ['pub_fare', 'american_contemporary'],
  dinner:     ['italian', 'mediterranean', 'steakhouse', 'seafood', 'asian', 'latin', 'american_contemporary'],
  evening:    ['pub_fare', 'american_contemporary'],
};

// ─── Fitness test: mandatory slot eligibility ───────────────────

/**
 * Required category match for slot eligibility.
 * A restaurant must have AT LEAST ONE of these categories to be considered.
 * null = no category restriction for this slot.
 */
const SLOT_FITNESS_CATEGORIES: Record<TimeSlot, RestaurantCategory[] | null> = {
  breakfast:  ['brunch'],
  morning:    ['brunch'],
  lunch:      ['lunch', 'brunch'],
  afternoon:  null,                             // activity slot — any venue is fine
  happy_hour: ['bars', 'rooftops'],
  dinner:     ['dinner'],
  evening:    ['bars', 'nightlife', 'rooftops'],
};

/**
 * Alternative cuisine match for slot eligibility.
 * If a restaurant's cuisine is in this list, it passes even without a category match.
 * null = cuisine alone cannot qualify a restaurant for this slot.
 */
const SLOT_FITNESS_CUISINES: Record<TimeSlot, CuisineType[] | null> = {
  breakfast:  ['cafe'],
  morning:    ['cafe'],
  lunch:      ['cafe'],
  afternoon:  ['cafe'],
  happy_hour: null,
  dinner:     null,
  evening:    null,
};

/**
 * Determines if a restaurant is categorically eligible for a given time slot.
 * This is a hard gate — restaurants that fail are never scored.
 */
function passesFitnessTest(
  restaurant: Restaurant,
  slot: TimeSlot,
  hasHappyHour: boolean,
  hasEvent: boolean,
): boolean {
  const fitnessCategories = SLOT_FITNESS_CATEGORIES[slot];
  const fitnessCuisines = SLOT_FITNESS_CUISINES[slot];

  // If no fitness criteria are defined for this slot, always pass
  if (fitnessCategories === null && fitnessCuisines === null) {
    return true;
  }

  // Check 1: Category match
  if (fitnessCategories !== null) {
    const hasMatchingCategory = restaurant.categories.some(
      cat => fitnessCategories.includes(cat),
    );
    if (hasMatchingCategory) return true;
  }

  // Check 2: Cuisine match (alternative path)
  if (fitnessCuisines !== null) {
    if (restaurant.cuisine && fitnessCuisines.includes(restaurant.cuisine)) {
      return true;
    }
  }

  // Check 3: Special case — happy_hour slot passes if restaurant has HH data today
  if (slot === 'happy_hour' && hasHappyHour) {
    return true;
  }

  // Check 4: Special case — evening slot passes if restaurant has event today
  if (slot === 'evening' && hasEvent) {
    return true;
  }

  // All checks failed
  return false;
}

// ─── Slot penalty categories (deprioritize mismatched venues) ───

/**
 * Categories that make a restaurant a poor fit for a slot even if it passes the fitness test.
 * E.g., a brewery tagged ['bars', 'brunch'] passes the breakfast fitness test via 'brunch',
 * but 'bars' signals it's primarily a bar — not where you'd go for breakfast.
 */
const SLOT_PENALTY_CATEGORIES: Record<TimeSlot, { categories: RestaurantCategory[]; penalty: number } | null> = {
  breakfast:  { categories: ['bars', 'nightlife'], penalty: -25 },
  morning:    { categories: ['bars', 'nightlife'], penalty: -25 },
  lunch:      { categories: ['nightlife'], penalty: -10 },
  afternoon:  null,
  happy_hour: null,
  dinner:     null,
  evening:    null,
};

/**
 * Cuisines that are poor fits for a slot even if the restaurant passes the fitness test.
 * E.g., a Chinese restaurant tagged ['brunch', 'lunch', 'dinner'] passes breakfast fitness
 * via 'brunch', but 'asian' cuisine signals it's not a typical breakfast destination.
 */
const SLOT_PENALTY_CUISINES: Record<TimeSlot, { cuisines: CuisineType[]; penalty: number } | null> = {
  breakfast:  { cuisines: ['asian', 'seafood', 'steakhouse', 'latin'], penalty: -15 },
  morning:    { cuisines: ['asian', 'seafood', 'steakhouse', 'latin'], penalty: -15 },
  lunch:      null,
  afternoon:  null,
  happy_hour: null,
  dinner:     null,
  evening:    null,
};

// ─── Mood scoring boosts ────────────────────────────────────────

const MOOD_CATEGORY_BOOSTS: Record<ItineraryMood, Partial<Record<RestaurantCategory, number>>> = {
  foodie_tour:     { dinner: 10, lunch: 10, brunch: 10 },
  date_night:      { rooftops: 15, dinner: 10, bars: 5 },
  brunch_lover:    { brunch: 20 },
  family_day:      { lunch: 10, dinner: 10, outdoor_dining: 10 },
  bar_crawl:       { bars: 20, nightlife: 15, rooftops: 10 },
  budget_friendly: { lunch: 5, brunch: 5 },
};

const MOOD_CUISINE_BOOSTS: Record<ItineraryMood, Partial<Record<CuisineType, number>>> = {
  foodie_tour:     { italian: 5, mediterranean: 5, seafood: 5, steakhouse: 5, asian: 5 },
  date_night:      { italian: 10, mediterranean: 10, steakhouse: 10, seafood: 5 },
  brunch_lover:    { cafe: 10, american_contemporary: 5 },
  family_day:      { american_contemporary: 10, italian: 5, pub_fare: 5 },
  bar_crawl:       { pub_fare: 10 },
  budget_friendly: { pub_fare: 10, american_contemporary: 5, cafe: 5 },
};

// Slots to skip based on mood
const MOOD_SKIP_SLOTS: Partial<Record<ItineraryMood, TimeSlot[]>> = {
  date_night:   ['breakfast', 'morning', 'lunch', 'afternoon'],
  bar_crawl:    ['breakfast', 'morning', 'lunch'],
  brunch_lover: ['evening'],
};

// ─── Scoring ────────────────────────────────────────────────────

interface ScoredCandidate {
  restaurant: Restaurant;
  score: number;
  reason: string;
}

function scoreCandidate(
  restaurant: Restaurant,
  slot: TimeSlot,
  mood: ItineraryMood | null,
  preferences: OnboardingData | null,
  favorites: string[],
  previousLocation: { latitude: number; longitude: number } | null,
  hasHappyHour: boolean,
  hasEvent: boolean,
  hasSpecialOnDay: boolean,
): ScoredCandidate {
  let score = 0;
  let reason = '';

  // 1. Slot category match
  const slotCategories = SLOT_PREFERRED_CATEGORIES[slot];
  const matchingSlotCats = restaurant.categories.filter(c => slotCategories.includes(c));
  if (matchingSlotCats.length > 0) {
    score += 15;
    reason = `Great for ${TIME_SLOT_CONFIG[slot].label.toLowerCase()}`;
  }

  // 1b. Slot category penalty — deprioritize venues whose primary identity clashes with the slot
  const penaltyConfig = SLOT_PENALTY_CATEGORIES[slot];
  if (penaltyConfig) {
    const hasPenaltyCategory = restaurant.categories.some(
      cat => penaltyConfig.categories.includes(cat),
    );
    if (hasPenaltyCategory) {
      score += penaltyConfig.penalty;
    }
  }

  // 1c. Slot cuisine penalty — deprioritize cuisines that don't fit the slot
  const cuisinePenaltyConfig = SLOT_PENALTY_CUISINES[slot];
  if (cuisinePenaltyConfig && restaurant.cuisine) {
    if (cuisinePenaltyConfig.cuisines.includes(restaurant.cuisine)) {
      score += cuisinePenaltyConfig.penalty;
    }
  }

  // 2. Slot cuisine match
  const slotCuisines = SLOT_PREFERRED_CUISINES[slot];
  if (restaurant.cuisine && slotCuisines.includes(restaurant.cuisine)) {
    score += 10;
  }

  // 3. Mood boosts
  if (mood) {
    const catBoosts = MOOD_CATEGORY_BOOSTS[mood];
    for (const cat of restaurant.categories) {
      if (catBoosts[cat]) {
        score += catBoosts[cat]!;
      }
    }
    const cuisineBoosts = MOOD_CUISINE_BOOSTS[mood];
    if (restaurant.cuisine && cuisineBoosts[restaurant.cuisine]) {
      score += cuisineBoosts[restaurant.cuisine]!;
    }
  }

  // 4. User preference match (onboarding food preferences)
  if (preferences) {
    for (const foodPref of preferences.foodPreferences) {
      const cuisineType = FOOD_PREFERENCE_TO_CUISINE[foodPref];
      if (cuisineType && restaurant.cuisine === cuisineType) {
        score += 15;
        if (!reason) reason = `Matches your love of ${foodPref.toLowerCase()}`;
      }
    }
  }

  // 5. Proximity to previous stop
  if (previousLocation && restaurant.latitude && restaurant.longitude) {
    const dist = calculateDistance(
      previousLocation.latitude,
      previousLocation.longitude,
      restaurant.latitude,
      restaurant.longitude,
    );
    if (dist < 0.3) {
      score += 15;
      reason = reason || `Just a short walk from your last stop`;
    } else if (dist < 0.5) {
      score += 12;
      reason = reason || `Nearby, ${dist.toFixed(1)} mi away`;
    } else if (dist < 1) {
      score += 8;
    } else if (dist < 2) {
      score += 4;
    }
    // Penalize far distances
    if (dist > 3) {
      score -= 5;
    }
  }

  // 6. Favorites boost
  if (favorites.includes(restaurant.id)) {
    score += 10;
    reason = reason || 'One of your favorites';
  }

  // 7. Verified/premium boost
  if (restaurant.is_verified) {
    score += 5;
  }

  // 8. Happy hour data for happy_hour slot
  if (slot === 'happy_hour' && hasHappyHour) {
    score += 20;
    reason = 'Has happy hour specials today';
  }

  // 9. Event happening for evening slot
  if (slot === 'evening' && hasEvent) {
    score += 20;
    reason = 'Has live entertainment tonight';
  }

  // 10. Special on this day
  if (hasSpecialOnDay) {
    score += 5;
    reason = reason || 'Has a special running today';
  }

  // 11. Random factor for variety
  score += Math.random() * 3;

  // Default reason
  if (!reason) {
    if (restaurant.cuisine) {
      reason = CUISINE_LABELS[restaurant.cuisine] || 'Local favorite';
    } else {
      reason = 'Local favorite';
    }
  }

  return { restaurant, score, reason };
}

// ─── Main generator ─────────────────────────────────────────────

export function generateItinerary(params: GenerateItineraryParams): GenerateResult {
  const {
    date,
    mood,
    preferences,
    userLocation,
    favorites,
    restaurants,
    allHours,
    allHappyHours,
    allEvents,
  } = params;

  const dayOfWeek = getDayOfWeek(date);
  const usedRestaurantIds = new Set<string>();
  const items: ItineraryItemWithReason[] = [];
  const skippedSlots: TimeSlot[] = [];

  // Pre-index happy hours by restaurant for this day
  const happyHoursByRestaurant = new Map<string, HappyHour>();
  for (const hh of allHappyHours) {
    if (hh.days_of_week.includes(dayOfWeek)) {
      happyHoursByRestaurant.set(hh.restaurant_id, hh);
    }
  }

  // Pre-index events by restaurant for this day
  const eventsByRestaurant = new Map<string, ApiEvent>();
  for (const event of allEvents) {
    const restaurantId = event.restaurant?.id;
    if (!restaurantId) continue;

    // Check if event is on this day (recurring or specific date)
    const isOnDay = event.is_recurring
      ? event.days_of_week.includes(dayOfWeek)
      : event.event_date === date;

    if (isOnDay) {
      eventsByRestaurant.set(restaurantId, event);
    }
  }

  // Determine which slots to fill
  const slotsToFill = mood && MOOD_SKIP_SLOTS[mood]
    ? ALL_TIME_SLOTS.filter(s => !MOOD_SKIP_SLOTS[mood]!.includes(s))
    : ALL_TIME_SLOTS;

  // Track last location for proximity chaining
  let lastLocation = userLocation;

  for (const slot of slotsToFill) {
    const timeRange = SLOT_TIME_RANGES[slot];

    // Filter to restaurants that are appropriate AND open during this slot
    const candidates = restaurants.filter(r => {
      if (!r.is_active) return false;
      if (usedRestaurantIds.has(r.id)) return false;

      // Fitness test: restaurant must be categorically appropriate for this slot
      if (!passesFitnessTest(
        r,
        slot,
        happyHoursByRestaurant.has(r.id),
        eventsByRestaurant.has(r.id),
      )) {
        return false;
      }

      const hours = allHours[r.id];
      if (!hours || hours.length === 0) {
        // If we don't have hours data, still include (might just not have been entered)
        return true;
      }
      return isOpenDuringRange(hours, dayOfWeek, timeRange.start, timeRange.end);
    });

    if (candidates.length === 0) {
      skippedSlots.push(slot);
      continue;
    }

    // Score all candidates
    const scored = candidates.map(r => scoreCandidate(
      r,
      slot,
      mood,
      preferences,
      favorites,
      lastLocation,
      happyHoursByRestaurant.has(r.id),
      eventsByRestaurant.has(r.id),
      false, // TODO: check specials when data is available
    ));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Pick the top scorer
    const winner = scored[0];
    if (!winner) {
      skippedSlots.push(slot);
      continue;
    }

    usedRestaurantIds.add(winner.restaurant.id);

    // Calculate distance from previous stop
    let distanceFromPrev: string | null = null;
    if (lastLocation && winner.restaurant.latitude && winner.restaurant.longitude) {
      const dist = calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        winner.restaurant.latitude,
        winner.restaurant.longitude,
      );
      if (dist < 0.1) {
        distanceFromPrev = 'Nearby';
      } else if (dist < 1) {
        distanceFromPrev = `${(dist * 5280).toFixed(0)} ft`;
      } else {
        distanceFromPrev = `${dist.toFixed(1)} mi`;
      }
    }

    // Build the item
    const item: ItineraryItemWithReason = {
      id: `gen_${slot}_${Date.now()}`,
      itinerary_id: '',
      sort_order: TIME_SLOT_CONFIG[slot].sortOrder,
      time_slot: slot,
      start_time: null,
      end_time: null,
      item_type: slot === 'happy_hour' && happyHoursByRestaurant.has(winner.restaurant.id)
        ? 'happy_hour'
        : slot === 'evening' && eventsByRestaurant.has(winner.restaurant.id)
        ? 'event'
        : 'restaurant',
      restaurant_id: winner.restaurant.id,
      event_id: eventsByRestaurant.get(winner.restaurant.id)?.id || null,
      happy_hour_id: happyHoursByRestaurant.get(winner.restaurant.id)?.id || null,
      custom_title: null,
      custom_notes: null,
      display_name: winner.restaurant.name,
      display_address: winner.restaurant.address,
      display_latitude: winner.restaurant.latitude,
      display_longitude: winner.restaurant.longitude,
      display_image_url: winner.restaurant.cover_image_url || winner.restaurant.logo_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reason: distanceFromPrev
        ? `${winner.reason} · ${distanceFromPrev} from last stop`
        : winner.reason,
    };

    items.push(item);

    // Update last location for proximity chaining
    if (winner.restaurant.latitude && winner.restaurant.longitude) {
      lastLocation = {
        latitude: winner.restaurant.latitude,
        longitude: winner.restaurant.longitude,
      };
    }
  }

  return { items, skippedSlots };
}

/**
 * Get alternative suggestions for a given slot (for swap feature)
 * Returns the next best candidates that weren't picked
 */
export function getAlternativesForSlot(
  params: GenerateItineraryParams,
  slot: TimeSlot,
  excludeIds: Set<string>,
  limit: number = 3,
): ScoredCandidate[] {
  const { date, mood, preferences, userLocation, favorites, restaurants, allHours, allHappyHours, allEvents } = params;
  const dayOfWeek = getDayOfWeek(date);
  const timeRange = SLOT_TIME_RANGES[slot];

  // Pre-index
  const happyHoursByRestaurant = new Map<string, HappyHour>();
  for (const hh of allHappyHours) {
    if (hh.days_of_week.includes(dayOfWeek)) {
      happyHoursByRestaurant.set(hh.restaurant_id, hh);
    }
  }
  const eventsByRestaurant = new Map<string, ApiEvent>();
  for (const event of allEvents) {
    const restaurantId = event.restaurant?.id;
    if (!restaurantId) continue;
    const isOnDay = event.is_recurring
      ? event.days_of_week.includes(dayOfWeek)
      : event.event_date === date;
    if (isOnDay) eventsByRestaurant.set(restaurantId, event);
  }

  const candidates = restaurants.filter(r => {
    if (!r.is_active || excludeIds.has(r.id)) return false;

    // Fitness test: restaurant must be categorically appropriate for this slot
    if (!passesFitnessTest(
      r,
      slot,
      happyHoursByRestaurant.has(r.id),
      eventsByRestaurant.has(r.id),
    )) {
      return false;
    }

    const hours = allHours[r.id];
    if (!hours || hours.length === 0) return true;
    return isOpenDuringRange(hours, dayOfWeek, timeRange.start, timeRange.end);
  });

  const scored = candidates.map(r => scoreCandidate(
    r, slot, mood, preferences, favorites, userLocation,
    happyHoursByRestaurant.has(r.id), eventsByRestaurant.has(r.id), false,
  ));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
