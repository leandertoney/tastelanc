/**
 * Smart Itinerary Generator v2
 *
 * Generates a focused 3-stop plan instead of 7 rigid slots.
 * Improvements over v1:
 *  - Mood-driven chapter selection (3 slots instead of 7)
 *  - Geographic clustering: stops 2 & 3 prefer locations near stop 1
 *  - Vote-based scoring: community votes boost ranking
 *  - Richer reason text: uses best_for, event names, HH descriptions
 *  - Walk-time connectors between stops
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
import { TIME_SLOT_CONFIG } from '../types/itinerary';
import { BRAND } from '../config/brand';

// ─── Input types ─────────────────────────────────────────────────────────────

export interface GenerateItineraryParams {
  date: string;
  mood: ItineraryMood | null;
  preferences: OnboardingData | null;
  userLocation: { latitude: number; longitude: number } | null;
  favorites: string[];
  restaurants: Restaurant[];
  allHours: Record<string, RestaurantHours[]>;
  allHappyHours: HappyHour[];
  allEvents: ApiEvent[];
  /** Optional: map of restaurantId → total vote count this month */
  restaurantVoteCounts?: Map<string, number>;
  /** Number of stops to generate (default 3). 2-stop mode uses first + last chapter. */
  stopCount?: 2 | 3;
}

export interface GenerateResult {
  items: ItineraryItemWithReason[];
  skippedSlots: TimeSlot[];
  /** Walk time in minutes between consecutive stops (parallel array to items) */
  walkMinutes: (number | null)[];
}

// ─── Chapter definitions by mood ─────────────────────────────────────────────

/**
 * Each mood maps to exactly 3 time slots ("chapters").
 * The generator fills only these slots — no more 7-slot overwhelm.
 */
const MOOD_CHAPTERS: Record<ItineraryMood, [TimeSlot, TimeSlot, TimeSlot]> = {
  date_night:      ['happy_hour', 'dinner',  'evening'],
  bar_crawl:       ['happy_hour', 'dinner',  'evening'],
  foodie_tour:     ['lunch',      'happy_hour', 'dinner'],
  brunch_lover:    ['morning',    'lunch',    'afternoon'],
  family_day:      ['lunch',      'afternoon', 'dinner'],
  budget_friendly: ['lunch',      'happy_hour', 'dinner'],
};

/** Fallback chapters when no mood is selected */
const DEFAULT_CHAPTERS: [TimeSlot, TimeSlot, TimeSlot] = ['lunch', 'happy_hour', 'dinner'];

// ─── Day / time helpers ───────────────────────────────────────────────────────

const DAY_INDEX_TO_NAME: DayOfWeek[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

function getDayOfWeek(dateStr: string): DayOfWeek {
  const d = new Date(dateStr + 'T12:00:00');
  return DAY_INDEX_TO_NAME[d.getDay()];
}

function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
}

function isOpenDuringRange(
  hours: RestaurantHours[],
  dayOfWeek: DayOfWeek,
  rangeStartMin: number,
  rangeEndMin: number,
): boolean {
  const dayHours = hours.find(h => h.day_of_week === dayOfWeek);
  if (!dayHours || dayHours.is_closed || !dayHours.open_time || !dayHours.close_time) return false;
  const openMin = parseTimeToMinutes(dayHours.open_time);
  let closeMin = parseTimeToMinutes(dayHours.close_time);
  if (closeMin < openMin) closeMin += 24 * 60;
  return openMin <= rangeEndMin && closeMin >= rangeStartMin;
}

// ─── Slot time ranges ─────────────────────────────────────────────────────────

const SLOT_TIME_RANGES: Record<TimeSlot, { start: number; end: number }> = {
  breakfast:  { start: 7 * 60,       end: 10 * 60 },
  morning:    { start: 10 * 60,      end: 11 * 60 + 30 },
  lunch:      { start: 11 * 60 + 30, end: 14 * 60 },
  afternoon:  { start: 14 * 60,      end: 16 * 60 },
  happy_hour: { start: 16 * 60,      end: 18 * 60 },
  dinner:     { start: 17 * 60 + 30, end: 21 * 60 },
  evening:    { start: 20 * 60,      end: 24 * 60 },
};

// ─── Fitness tests (hard gate) ────────────────────────────────────────────────

const SLOT_FITNESS_CATEGORIES: Record<TimeSlot, RestaurantCategory[] | null> = {
  breakfast:  ['brunch'],
  morning:    ['brunch'],
  lunch:      ['lunch', 'brunch'],
  afternoon:  null,
  happy_hour: ['bars', 'rooftops'],
  dinner:     ['dinner'],
  evening:    ['bars', 'nightlife', 'rooftops'],
};

const SLOT_FITNESS_CUISINES: Record<TimeSlot, CuisineType[] | null> = {
  breakfast:  ['cafe'],
  morning:    ['cafe'],
  lunch:      ['cafe'],
  afternoon:  ['cafe'],
  happy_hour: null,
  dinner:     null,
  evening:    null,
};

function passesFitnessTest(
  restaurant: Restaurant,
  slot: TimeSlot,
  hasHappyHour: boolean,
  hasEvent: boolean,
): boolean {
  const fitnessCategories = SLOT_FITNESS_CATEGORIES[slot];
  const fitnessCuisines = SLOT_FITNESS_CUISINES[slot];

  if (fitnessCategories === null && fitnessCuisines === null) return true;
  if (fitnessCategories !== null && restaurant.categories.some(cat => fitnessCategories.includes(cat))) return true;
  if (fitnessCuisines !== null && restaurant.cuisine && fitnessCuisines.includes(restaurant.cuisine)) return true;
  if (slot === 'happy_hour' && hasHappyHour) return true;
  if (slot === 'evening' && hasEvent) return true;
  return false;
}

// ─── Mood-specific vibe filters ───────────────────────────────────────────────

/**
 * Certain mood+slot combos should exclude category clashes.
 * E.g. date_night dinner shouldn't pick a dive bar.
 */
const MOOD_EXCLUDE_CATEGORIES: Partial<Record<ItineraryMood, Partial<Record<TimeSlot, RestaurantCategory[]>>>> = {
  date_night: {
    dinner:  ['bars', 'nightlife'],
  },
  bar_crawl: {
    dinner:  ['breakfast', 'brunch', 'desserts'],
    evening: ['breakfast', 'brunch', 'desserts'],
  },
};

function passesVibeFilter(
  restaurant: Restaurant,
  slot: TimeSlot,
  mood: ItineraryMood | null,
): boolean {
  if (!mood) return true;
  const excludeForMood = MOOD_EXCLUDE_CATEGORIES[mood];
  if (!excludeForMood) return true;
  const excludeCats = excludeForMood[slot];
  if (!excludeCats) return true;
  const nonExcluded = restaurant.categories.filter(c => !excludeCats.includes(c));
  return nonExcluded.length > 0;
}

// ─── Mood boosts ──────────────────────────────────────────────────────────────

const MOOD_CATEGORY_BOOSTS: Record<ItineraryMood, Partial<Record<RestaurantCategory, number>>> = {
  foodie_tour:     { dinner: 10, lunch: 10, brunch: 10 },
  date_night:      { rooftops: 20, dinner: 15, bars: 5 },
  brunch_lover:    { brunch: 25 },
  family_day:      { lunch: 10, dinner: 10, outdoor_dining: 15 },
  bar_crawl:       { bars: 40, nightlife: 35, rooftops: 25 },
  budget_friendly: { lunch: 5, brunch: 5 },
};

const MOOD_CUISINE_BOOSTS: Record<ItineraryMood, Partial<Record<CuisineType, number>>> = {
  foodie_tour:     { italian: 8, mediterranean: 8, seafood: 8, steakhouse: 8, asian: 5 },
  date_night:      { italian: 15, mediterranean: 12, steakhouse: 12, seafood: 8 },
  brunch_lover:    { cafe: 12, american_contemporary: 6 },
  family_day:      { american_contemporary: 12, italian: 8, pub_fare: 5 },
  bar_crawl:       { pub_fare: 12 },
  budget_friendly: { pub_fare: 10, american_contemporary: 6, cafe: 5 },
};

// ─── Rich reason text ─────────────────────────────────────────────────────────

/**
 * Format a 24h time string (e.g. "16:00") into a display string (e.g. "4 PM")
 */
function formatTimeDisplay(time24: string): string {
  const parts = time24.trim().split(':');
  let hour = parseInt(parts[0], 10);
  const min = parseInt(parts[1] || '0', 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return min > 0 ? `${hour}:${min.toString().padStart(2, '0')} ${ampm}` : `${hour} ${ampm}`;
}

function buildReason(
  restaurant: Restaurant,
  slot: TimeSlot,
  mood: ItineraryMood | null,
  hasHappyHour: boolean,
  happyHour: HappyHour | undefined,
  hasEvent: boolean,
  event: ApiEvent | undefined,
  isFavorite: boolean,
  votesThisMonth: number,
): string {
  const parts: string[] = [];

  // 1. Event details — most compelling signal (show for ANY slot, not just evening)
  if (hasEvent && event?.name) {
    let eventStr = event.name;
    if (event.performer_name) {
      eventStr += ` with ${event.performer_name}`;
    }
    if (event.start_time) {
      eventStr += ` \u00B7 ${formatTimeDisplay(event.start_time)}`;
    }
    parts.push(eventStr);
  }

  // 2. Happy hour details — show for ANY slot (not just happy_hour)
  if (hasHappyHour && happyHour) {
    let hhStr = 'Happy Hour';
    if (happyHour.start_time && happyHour.end_time) {
      hhStr += ` ${formatTimeDisplay(happyHour.start_time)}\u2013${formatTimeDisplay(happyHour.end_time)}`;
    }
    if (happyHour.description) {
      hhStr += ` \u00B7 ${happyHour.description}`;
    }
    parts.push(hhStr);
  }

  // 3. Best-for tag (specific context about the restaurant)
  if (parts.length === 0) {
    const bestFor = (restaurant as any).best_for as string[] | null | undefined;
    if (bestFor?.length) {
      const tag = bestFor[0];
      parts.push(tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());
    }
  }

  // 4. Fallback signals — only if we don't already have event/HH info
  if (parts.length === 0) {
    if (votesThisMonth >= 3) {
      parts.push(`${votesThisMonth} community votes this month`);
    } else if (isFavorite) {
      parts.push('One of your spots');
    } else if (restaurant.cuisine && CUISINE_LABELS[restaurant.cuisine]) {
      parts.push(CUISINE_LABELS[restaurant.cuisine]);
    }
  }

  return parts.slice(0, 2).join(' \u00B7 ') || `Local ${BRAND.cityName} pick`;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreCandidate(
  restaurant: Restaurant,
  slot: TimeSlot,
  mood: ItineraryMood | null,
  preferences: OnboardingData | null,
  favorites: string[],
  clusterCenter: { latitude: number; longitude: number } | null,
  hasHappyHour: boolean,
  hasEvent: boolean,
  votesThisMonth: number,
): number {
  let score = 0;

  // 1. Slot category match
  const slotCatMap: Record<TimeSlot, string[]> = {
    breakfast:  ['brunch'],
    morning:    ['brunch'],
    lunch:      ['lunch', 'brunch'],
    afternoon:  ['outdoor_dining', 'rooftops'],
    happy_hour: ['bars', 'rooftops'],
    dinner:     ['dinner'],
    evening:    ['bars', 'nightlife', 'rooftops'],
  };
  if (restaurant.categories.some(c => slotCatMap[slot].includes(c))) score += 15;

  // 2. Mood boosts
  if (mood) {
    for (const cat of restaurant.categories) {
      score += (MOOD_CATEGORY_BOOSTS[mood] as any)[cat] || 0;
    }
    if (restaurant.cuisine) {
      score += (MOOD_CUISINE_BOOSTS[mood] as any)[restaurant.cuisine] || 0;
    }
  }

  // 3. User food preferences from onboarding
  if (preferences) {
    for (const foodPref of preferences.foodPreferences) {
      const cuisineType = FOOD_PREFERENCE_TO_CUISINE[foodPref];
      if (cuisineType && restaurant.cuisine === cuisineType) score += 15;
    }
  }

  // 4. Geographic clustering — strongest signal, keeps all stops walkable
  if (clusterCenter && restaurant.latitude && restaurant.longitude) {
    const dist = calculateDistance(
      clusterCenter.latitude, clusterCenter.longitude,
      restaurant.latitude, restaurant.longitude,
    );
    if (dist < 0.15)      score += 40;  // <800ft — same block
    else if (dist < 0.3)  score += 30;  // 5–6 min walk
    else if (dist < 0.5)  score += 20;  // 10 min walk
    else if (dist < 1.0)  score += 10;
    else if (dist > 2.0)  score -= 15;  // Too far
  }

  // 5. Community votes (the best signal we have for quality)
  if (votesThisMonth >= 5)       score += 25;
  else if (votesThisMonth >= 3)  score += 18;
  else if (votesThisMonth >= 1)  score += 10;

  // 6. Personal favorites
  if (favorites.includes(restaurant.id)) score += 12;

  // 7. Quality signal
  if (restaurant.is_verified) score += 5;

  // 8. Live data for the slot
  if (slot === 'happy_hour' && hasHappyHour) score += 22;
  if (slot === 'evening' && hasEvent) score += 22;

  // 9. Small random jitter for variety
  score += Math.random() * 4;

  return score;
}

// ─── Walk time label ──────────────────────────────────────────────────────────

function getWalkStr(
  from: { latitude: number; longitude: number } | null,
  to: { latitude: number | null; longitude: number | null },
): { label: string | null; minutes: number | null } {
  if (!from || !to.latitude || !to.longitude) return { label: null, minutes: null };
  const dist = calculateDistance(from.latitude, from.longitude, to.latitude, to.longitude);
  const minutes = Math.round(dist * 20); // 3 mph = 20 min/mile
  if (minutes < 2 || minutes > 25) return { label: null, minutes: null };
  return { label: `${minutes} min`, minutes };
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateItinerary(params: GenerateItineraryParams): GenerateResult {
  const {
    date, mood, preferences, userLocation, favorites,
    restaurants, allHours, allHappyHours, allEvents,
    restaurantVoteCounts = new Map(),
  } = params;

  const dayOfWeek = getDayOfWeek(date);
  const usedRestaurantIds = new Set<string>();
  const items: ItineraryItemWithReason[] = [];
  const skippedSlots: TimeSlot[] = [];
  const walkMinutes: (number | null)[] = [];

  // Pre-index happy hours and events by restaurant
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

  // Determine chapters based on mood and stop count
  const allChapters: TimeSlot[] = mood ? [...MOOD_CHAPTERS[mood]] : [...DEFAULT_CHAPTERS];
  const requestedStops = params.stopCount ?? 3;
  // For 2 stops: first + last chapter (skip middle)
  const chapters: TimeSlot[] = requestedStops === 2
    ? [allChapters[0], allChapters[2]]
    : allChapters;

  // Cluster center: set after the first stop is picked to keep subsequent stops walkable
  let clusterCenter: { latitude: number; longitude: number } | null = userLocation;
  let previousLocation: { latitude: number; longitude: number } | null = userLocation;

  for (const slot of chapters) {
    const timeRange = SLOT_TIME_RANGES[slot];

    const candidates = restaurants.filter(r => {
      if (!r.is_active || usedRestaurantIds.has(r.id)) return false;
      if (!passesFitnessTest(r, slot, happyHoursByRestaurant.has(r.id), eventsByRestaurant.has(r.id))) return false;
      if (!passesVibeFilter(r, slot, mood)) return false;
      const hours = allHours[r.id];
      if (!hours || hours.length === 0) return true;
      return isOpenDuringRange(hours, dayOfWeek, timeRange.start, timeRange.end);
    });

    if (candidates.length === 0) {
      skippedSlots.push(slot);
      walkMinutes.push(null);
      continue;
    }

    const scored = candidates.map(r => ({
      restaurant: r,
      score: scoreCandidate(
        r, slot, mood, preferences, favorites, clusterCenter,
        happyHoursByRestaurant.has(r.id), eventsByRestaurant.has(r.id),
        restaurantVoteCounts.get(r.id) || 0,
      ),
      happyHour: happyHoursByRestaurant.get(r.id),
      event: eventsByRestaurant.get(r.id),
    }));

    scored.sort((a, b) => b.score - a.score);
    const winner = scored[0];
    if (!winner) {
      skippedSlots.push(slot);
      walkMinutes.push(null);
      continue;
    }

    usedRestaurantIds.add(winner.restaurant.id);

    // Walk time from previous stop
    const walk = getWalkStr(previousLocation, {
      latitude: winner.restaurant.latitude,
      longitude: winner.restaurant.longitude,
    });
    walkMinutes.push(walk.minutes);

    const reason = buildReason(
      winner.restaurant, slot, mood,
      happyHoursByRestaurant.has(winner.restaurant.id), winner.happyHour,
      eventsByRestaurant.has(winner.restaurant.id), winner.event,
      favorites.includes(winner.restaurant.id),
      restaurantVoteCounts.get(winner.restaurant.id) || 0,
    );

    items.push({
      id: `gen_${slot}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      itinerary_id: '',
      sort_order: TIME_SLOT_CONFIG[slot].sortOrder,
      time_slot: slot,
      start_time: null,
      end_time: null,
      item_type: slot === 'happy_hour' && winner.happyHour ? 'happy_hour'
        : slot === 'evening' && winner.event ? 'event'
        : 'restaurant',
      restaurant_id: winner.restaurant.id,
      event_id: winner.event?.id || null,
      happy_hour_id: winner.happyHour?.id || null,
      custom_title: null,
      custom_notes: null,
      display_name: winner.restaurant.name,
      display_address: winner.restaurant.address,
      display_latitude: winner.restaurant.latitude,
      display_longitude: winner.restaurant.longitude,
      display_image_url: winner.restaurant.cover_image_url || winner.restaurant.logo_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reason,
    });

    // Set cluster center from first stop so stops 2+3 stay nearby
    if (items.length === 1 && winner.restaurant.latitude && winner.restaurant.longitude) {
      clusterCenter = { latitude: winner.restaurant.latitude, longitude: winner.restaurant.longitude };
    }
    if (winner.restaurant.latitude && winner.restaurant.longitude) {
      previousLocation = { latitude: winner.restaurant.latitude, longitude: winner.restaurant.longitude };
    }
  }

  return { items, skippedSlots, walkMinutes };
}

// ─── Alternatives for swap ────────────────────────────────────────────────────

export interface ScoredCandidate {
  restaurant: Restaurant;
  score: number;
  reason: string;
}

export function getAlternativesForSlot(
  params: GenerateItineraryParams,
  slot: TimeSlot,
  excludeIds: Set<string>,
  limit = 3,
): ScoredCandidate[] {
  const { date, mood, preferences, userLocation, favorites, restaurants, allHours, allHappyHours, allEvents, restaurantVoteCounts = new Map() } = params;
  const dayOfWeek = getDayOfWeek(date);
  const timeRange = SLOT_TIME_RANGES[slot];

  const happyHoursByRestaurant = new Map<string, HappyHour>();
  for (const hh of allHappyHours) {
    if (hh.days_of_week.includes(dayOfWeek)) happyHoursByRestaurant.set(hh.restaurant_id, hh);
  }
  const eventsByRestaurant = new Map<string, ApiEvent>();
  for (const event of allEvents) {
    const rid = event.restaurant?.id;
    if (!rid) continue;
    const isOnDay = event.is_recurring ? event.days_of_week.includes(dayOfWeek) : event.event_date === date;
    if (isOnDay) eventsByRestaurant.set(rid, event);
  }

  const candidates = restaurants.filter(r => {
    if (!r.is_active || excludeIds.has(r.id)) return false;
    if (!passesFitnessTest(r, slot, happyHoursByRestaurant.has(r.id), eventsByRestaurant.has(r.id))) return false;
    if (!passesVibeFilter(r, slot, mood)) return false;
    const hours = allHours[r.id];
    if (!hours || hours.length === 0) return true;
    return isOpenDuringRange(hours, dayOfWeek, timeRange.start, timeRange.end);
  });

  return candidates
    .map(r => {
      const votes = restaurantVoteCounts.get(r.id) || 0;
      const score = scoreCandidate(r, slot, mood, preferences, favorites, userLocation, happyHoursByRestaurant.has(r.id), eventsByRestaurant.has(r.id), votes);
      const reason = buildReason(
        r, slot, mood,
        happyHoursByRestaurant.has(r.id), happyHoursByRestaurant.get(r.id),
        eventsByRestaurant.has(r.id), eventsByRestaurant.get(r.id),
        favorites.includes(r.id), votes,
      );
      return { restaurant: r, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
