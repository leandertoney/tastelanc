import { createServiceRoleClient } from '@/lib/supabase/server';
import { MARKET_SLUG } from '@/config/market';
import { type SwipeQuestion } from './types';
import {
  generateHappyHourQuestions,
  generateSpecialQuestions,
  generateEventQuestions,
  generateVibeQuestions,
  type HappyHourRow,
  type SpecialRow,
  type EventRow,
  type RestaurantRow,
  type RestaurantImageMap,
} from './templates';

const QUESTIONS_PER_GAME = 10;
const MAX_PER_CATEGORY = 3;
const MAX_PER_RESTAURANT = 2;
const FETCH_LIMIT = 80;

export async function generateQuestions(): Promise<SwipeQuestion[]> {
  const supabase = createServiceRoleClient();

  // Resolve market UUID from slug
  const { data: market } = await supabase
    .from('markets')
    .select('id')
    .eq('slug', MARKET_SLUG)
    .single();

  if (!market) {
    throw new Error(`Market not found: ${MARKET_SLUG}`);
  }

  const marketId = market.id;

  // Fetch data in parallel, all market-scoped
  const [happyHoursResult, specialsResult, eventsResult, restaurantsResult] = await Promise.all([
    supabase
      .from('happy_hours')
      .select('id, name, days_of_week, start_time, end_time, restaurant:restaurants!inner(id, name, market_id, cover_image_url), happy_hour_items(name, discounted_price, original_price, discount_description)')
      .eq('restaurant.market_id', marketId)
      .eq('is_active', true)
      .limit(FETCH_LIMIT),

    supabase
      .from('specials')
      .select('id, name, days_of_week, special_price, original_price, discount_description, restaurant:restaurants!inner(id, name, market_id, cover_image_url)')
      .eq('restaurant.market_id', marketId)
      .eq('is_active', true)
      .limit(FETCH_LIMIT),

    supabase
      .from('events')
      .select('id, name, event_type, days_of_week, performer_name, cover_charge, restaurant:restaurants!inner(id, name, cover_image_url)')
      .eq('market_id', marketId)
      .eq('is_active', true)
      .limit(FETCH_LIMIT),

    supabase
      .from('restaurants')
      .select('id, name, categories, vibe_tags, best_for, neighborhood, cover_image_url')
      .eq('market_id', marketId)
      .eq('is_active', true)
      .limit(FETCH_LIMIT),
  ]);

  const happyHours = (happyHoursResult.data || []) as unknown as HappyHourRow[];
  const specials = (specialsResult.data || []) as unknown as SpecialRow[];
  const events = (eventsResult.data || []) as unknown as EventRow[];
  const restaurants = (restaurantsResult.data || []) as unknown as RestaurantRow[];

  const allRestaurantNames = restaurants.map((r) => r.name);

  // Build restaurant ID → cover image URL map
  const imageMap: RestaurantImageMap = {};
  for (const r of restaurants) {
    imageMap[r.id] = r.cover_image_url || null;
  }
  // Also capture images from happy hour / special / event restaurant joins
  for (const hh of happyHours) {
    const rest = hh.restaurant as { id: string; name: string; cover_image_url?: string };
    if (rest.cover_image_url) imageMap[rest.id] = rest.cover_image_url;
  }
  for (const sp of specials) {
    const rest = sp.restaurant as { id: string; name: string; cover_image_url?: string };
    if (rest.cover_image_url) imageMap[rest.id] = rest.cover_image_url;
  }
  for (const ev of events) {
    if (ev.restaurant) {
      const rest = ev.restaurant as { id: string; name: string; cover_image_url?: string };
      if (rest.cover_image_url) imageMap[rest.id] = rest.cover_image_url;
    }
  }

  // Generate candidate questions from all templates
  const candidates = [
    ...generateHappyHourQuestions(happyHours, allRestaurantNames, imageMap),
    ...generateSpecialQuestions(specials, allRestaurantNames, imageMap),
    ...generateEventQuestions(events, imageMap),
    ...generateVibeQuestions(restaurants),
  ];

  // Prioritize candidates with images, then shuffle within each group
  const withImages = candidates.filter((c) => c.imageUrl).sort(() => Math.random() - 0.5);
  const withoutImages = candidates.filter((c) => !c.imageUrl).sort(() => Math.random() - 0.5);
  const shuffled = [...withImages, ...withoutImages];

  // Pick questions with diversity constraints
  const selected: SwipeQuestion[] = [];
  const restaurantCount: Record<string, number> = {};
  const categoryCount: Record<string, number> = {};
  let idCounter = 0;

  for (const candidate of shuffled) {
    if (selected.length >= QUESTIONS_PER_GAME) break;

    const rCount = restaurantCount[candidate.restaurantName] || 0;
    const cCount = categoryCount[candidate.category] || 0;

    if (rCount >= MAX_PER_RESTAURANT) continue;
    if (cCount >= MAX_PER_CATEGORY) continue;

    selected.push({
      id: `q_${++idCounter}`,
      ...candidate,
    });

    restaurantCount[candidate.restaurantName] = rCount + 1;
    categoryCount[candidate.category] = cCount + 1;
  }

  // If we didn't get enough (thin data), relax constraints and fill
  if (selected.length < QUESTIONS_PER_GAME) {
    for (const candidate of shuffled) {
      if (selected.length >= QUESTIONS_PER_GAME) break;
      if (selected.some((s) => s.statement === candidate.statement)) continue;

      selected.push({
        id: `q_${++idCounter}`,
        ...candidate,
      });
    }
  }

  // Ensure a roughly even true/false split — reshuffle to avoid all-true or all-false runs
  return selected.sort(() => Math.random() - 0.5);
}
