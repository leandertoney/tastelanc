import { supabase } from './supabase';

export type VisitSource = 'radar' | 'manual' | 'checkin';

export interface Visit {
  id: string;
  user_id: string;
  restaurant_id: string;
  source: VisitSource;
  visited_at: string;
  created_at: string;
}

/**
 * Record a passive visit (NO rewards, NO points)
 * This is for personalization only - completely separate from the rewards system
 */
export async function recordPassiveVisit(
  userId: string,
  restaurantId: string,
  source: VisitSource = 'radar'
): Promise<{ error: Error | null; alreadyRecorded?: boolean; visitId?: string }> {
  try {
    // Check if already visited today (prevent spam from rapid geofence triggers)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existing } = await supabase
      .from('visits')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .gte('visited_at', today.toISOString())
      .maybeSingle();

    if (existing) {
      console.log('[Visits] Already recorded visit today for restaurant:', restaurantId);
      return { error: null, alreadyRecorded: true, visitId: existing.id };
    }

    // Record the new visit and return the ID
    const { data, error } = await supabase
      .from('visits')
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
        source,
        visited_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Visits] Error recording visit:', error);
      return { error: error as Error };
    }

    console.log('[Visits] Recorded visit for restaurant:', restaurantId, 'visitId:', data?.id);
    return { error: null, visitId: data?.id };
  } catch (error) {
    console.error('[Visits] Exception recording visit:', error);
    return { error: error as Error };
  }
}

/**
 * Get user's visited restaurants (for personalization)
 */
export async function getVisitedRestaurants(
  userId: string,
  limit: number = 50
): Promise<{ data: Array<{ restaurant_id: string; visited_at: string }> | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('visits')
      .select('restaurant_id, visited_at')
      .eq('user_id', userId)
      .order('visited_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: error as Error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get visit count per restaurant (for "Places You've Been" scoring)
 */
export async function getVisitCounts(
  userId: string
): Promise<{ counts: Record<string, number>; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('visits')
      .select('restaurant_id')
      .eq('user_id', userId);

    if (error || !data) {
      return { counts: {}, error: error as Error | null };
    }

    // Count visits per restaurant
    const counts: Record<string, number> = {};
    data.forEach((v) => {
      counts[v.restaurant_id] = (counts[v.restaurant_id] || 0) + 1;
    });

    return { counts, error: null };
  } catch (error) {
    return { counts: {}, error: error as Error };
  }
}

/**
 * Get recently visited restaurant IDs (last 30 days)
 * Useful for "Recently Visited" section
 */
export async function getRecentVisits(
  userId: string,
  days: number = 30
): Promise<{ restaurantIds: string[]; error: Error | null }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('visits')
      .select('restaurant_id')
      .eq('user_id', userId)
      .gte('visited_at', cutoffDate.toISOString())
      .order('visited_at', { ascending: false });

    if (error || !data) {
      return { restaurantIds: [], error: error as Error | null };
    }

    // Get unique restaurant IDs while preserving order
    const seen = new Set<string>();
    const restaurantIds: string[] = [];

    for (const visit of data) {
      if (!seen.has(visit.restaurant_id)) {
        seen.add(visit.restaurant_id);
        restaurantIds.push(visit.restaurant_id);
      }
    }

    return { restaurantIds, error: null };
  } catch (error) {
    return { restaurantIds: [], error: error as Error };
  }
}

/**
 * Get visit counts per restaurant in the last N days (for recommendation scoring)
 */
export async function getRecentVisitCounts(
  userId: string,
  days: number = 30
): Promise<{ counts: Record<string, number>; error: Error | null }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('visits')
      .select('restaurant_id')
      .eq('user_id', userId)
      .gte('visited_at', cutoffDate.toISOString());

    if (error || !data) {
      return { counts: {}, error: error as Error | null };
    }

    // Count visits per restaurant
    const counts: Record<string, number> = {};
    data.forEach((v) => {
      counts[v.restaurant_id] = (counts[v.restaurant_id] || 0) + 1;
    });

    return { counts, error: null };
  } catch (error) {
    return { counts: {}, error: error as Error };
  }
}

/**
 * Get total visit count for a user (for profile stats)
 */
export async function getTotalVisitCount(userId: string): Promise<{ count: number; error: Error | null }> {
  try {
    const { count, error } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      return { count: 0, error: error as Error };
    }

    return { count: count || 0, error: null };
  } catch (error) {
    return { count: 0, error: error as Error };
  }
}
