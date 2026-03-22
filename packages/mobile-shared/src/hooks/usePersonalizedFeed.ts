import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../config/theme';
import { getUserPreferences } from '../lib/recommendations';
import { getFavorites } from '../lib/favorites';
import type { MoveContext } from '../lib/recommendations';
import type { OnboardingData } from '../types/onboarding';
import type { BehavioralFeedItemKind } from '../lib/userEvents';

export interface PersonalizedFeedSignals {
  context: MoveContext;
  preferences: OnboardingData | null;
  favorites: string[];
}

const USER_EVENT_LOOKBACK_DAYS = 45;

function buildKindAffinity(
  events: Array<{
    event_type: 'dwell' | 'detail_view' | 'quick_skip';
    feed_item_kind: BehavioralFeedItemKind | null;
    value_ms: number | null;
  }>
): Partial<Record<BehavioralFeedItemKind, number>> {
  const kindScores = new Map<BehavioralFeedItemKind, number>();

  for (const event of events) {
    if (!event.feed_item_kind) continue;

    const current = kindScores.get(event.feed_item_kind) ?? 0;
    const increment = event.event_type === 'dwell'
      ? Math.min((event.value_ms ?? 0) / 4000, 3)
      : event.event_type === 'detail_view'
        ? 1.5
        : -1;

    kindScores.set(event.feed_item_kind, current + increment);
  }

  if (kindScores.size === 0) return {};

  const scores = Array.from(kindScores.values());
  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const affinity: Partial<Record<BehavioralFeedItemKind, number>> = {};

  for (const [kind, score] of kindScores.entries()) {
    affinity[kind] = Math.max(0.7, Math.min(1.35, Number((score / Math.max(avg, 0.1)).toFixed(2))));
  }

  return affinity;
}

function buildQuickSkippedRestaurantIds(
  events: Array<{
    restaurant_id: string | null;
    event_type: 'dwell' | 'detail_view' | 'quick_skip';
  }>
): Set<string> {
  const restaurantScores = new Map<string, number>();

  for (const event of events) {
    if (!event.restaurant_id) continue;

    const current = restaurantScores.get(event.restaurant_id) ?? 0;
    const delta = event.event_type === 'dwell'
      ? 3
      : event.event_type === 'detail_view'
        ? 2
        : -1;

    restaurantScores.set(event.restaurant_id, current + delta);
  }

  const quickSkippedRestaurantIds = new Set<string>();

  for (const [restaurantId, score] of restaurantScores.entries()) {
    if (score <= -2) {
      quickSkippedRestaurantIds.add(restaurantId);
    }
  }

  return quickSkippedRestaurantIds;
}

/**
 * Fetches all personalization signals needed by the Move tab algorithm.
 * Runs in parallel — non-blocking. Falls back gracefully for unauthenticated users.
 *
 * Returns:
 *  - context:     MoveContext with visit/checkin/user-event sets for applyContextBoosts()
 *  - preferences: Onboarding data (food, budget, entertainment prefs)
 *  - favorites:   Array of favorited restaurant IDs
 */
export function usePersonalizedFeed(userId?: string): {
  signals: PersonalizedFeedSignals | null;
  isLoading: boolean;
} {
  const { data: signals, isLoading } = useQuery({
    queryKey: ['personalizedFeedSignals', userId ?? 'anonymous'],
    queryFn: async (): Promise<PersonalizedFeedSignals> => {
      const supabase = getSupabase();
      const now = new Date();

      // Parallel fetch: preferences + favorites (AsyncStorage) and behavioral signals (Supabase)
      const [preferences, favorites, visitsResult, checkinsResult, userEventsResult] = await Promise.all([
        // User onboarding preferences from AsyncStorage
        getUserPreferences(),

        // Favorites from AsyncStorage
        userId ? getFavorites(userId) : Promise.resolve([]),

        // Visit history (last 30 days) — market-scoped via restaurant join not needed here
        // visits table has user_id + restaurant_id + visited_at
        userId
          ? supabase
              .from('visits')
              .select('restaurant_id, visited_at')
              .eq('user_id', userId)
              .gte('visited_at', new Date(Date.now() - 30 * 86400000).toISOString())
              .order('visited_at', { ascending: false })
              .limit(200)
          : Promise.resolve({ data: [], error: null }),

        // Checkin history (all time) — just need the restaurant IDs
        userId
          ? supabase
              .from('checkins')
              .select('restaurant_id')
              .eq('user_id', userId)
              .limit(500)
          : Promise.resolve({ data: [], error: null }),

        // Recent Move feed behavior — used for explicit-interest boosts and content-type affinity.
        userId
          ? supabase
              .from('user_events')
              .select('restaurant_id, event_type, feed_item_kind, value_ms, created_at')
              .eq('user_id', userId)
              .gte('created_at', new Date(Date.now() - USER_EVENT_LOOKBACK_DAYS * 86400000).toISOString())
              .order('created_at', { ascending: false })
              .limit(500)
          : Promise.resolve({ data: [], error: null }),
      ]);

      // Build 7-day and 30-day visit sets for suppression logic
      const sevenDaysAgo = Date.now() - 7 * 86400000;
      const visitedIds7d = new Set<string>();
      const visitedIds30d = new Set<string>();

      for (const visit of (visitsResult.data || [])) {
        visitedIds30d.add(visit.restaurant_id);
        if (new Date(visit.visited_at).getTime() >= sevenDaysAgo) {
          visitedIds7d.add(visit.restaurant_id);
        }
      }

      // Build checkin set for reward-loop nudge
      const checkinRestaurantIds = new Set<string>(
        (checkinsResult.data || []).map((c: any) => c.restaurant_id)
      );

      const userEvents = ((userEventsResult.data || []) as Array<{
        restaurant_id: string | null;
        event_type: 'dwell' | 'detail_view' | 'quick_skip';
        feed_item_kind: BehavioralFeedItemKind | null;
        value_ms: number | null;
      }>);
      const dwelledRestaurantIds = new Set<string>();
      const detailViewedRestaurantIds = new Set<string>();

      for (const event of userEvents) {
        if (!event.restaurant_id) continue;
        if (event.event_type === 'dwell') {
          dwelledRestaurantIds.add(event.restaurant_id);
        } else if (event.event_type === 'detail_view') {
          detailViewedRestaurantIds.add(event.restaurant_id);
        }
      }

      return {
        context: {
          currentTime: now,
          visitedIds7d,
          visitedIds30d,
          checkinRestaurantIds,
          dwelledRestaurantIds,
          detailViewedRestaurantIds,
          quickSkippedRestaurantIds: buildQuickSkippedRestaurantIds(userEvents),
          kindAffinity: buildKindAffinity(userEvents),
        },
        preferences,
        favorites,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — signals don't change often
    gcTime: 10 * 60 * 1000,
  });

  return { signals: signals ?? null, isLoading };
}
