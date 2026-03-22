import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '../config/theme';
import { getUserPreferences } from '../lib/recommendations';
import { getFavorites } from '../lib/favorites';
import { ONBOARDING_DATA_KEY } from '../types/onboarding';
import type { MoveContext } from '../lib/recommendations';
import type { OnboardingData } from '../types/onboarding';

export interface PersonalizedFeedSignals {
  context: MoveContext;
  preferences: OnboardingData | null;
  favorites: string[];
}

/**
 * Fetches all personalization signals needed by the Move tab algorithm.
 * Runs in parallel — non-blocking. Falls back gracefully for unauthenticated users.
 *
 * Returns:
 *  - context:     MoveContext with visit/checkin sets for applyContextBoosts()
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
      const [preferences, favorites, visitsResult, checkinsResult] = await Promise.all([
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

      return {
        context: {
          currentTime: now,
          visitedIds7d,
          visitedIds30d,
          checkinRestaurantIds,
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
