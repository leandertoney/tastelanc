/**
 * Area Visits Service for TasteLanc
 * Handles recording and tracking visits to geographic areas (neighborhoods)
 * Used for first-visit notifications and analytics
 */

import { supabase } from './supabase';

export interface AreaVisitResult {
  error: Error | null;
  isFirstVisit: boolean;
  areaId?: string;
  visitCount?: number;
}

export interface Area {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  latitude: number;
  longitude: number;
  radius: number;
  is_active: boolean;
}

/**
 * Record an area visit and check if it's the first visit
 * Uses upsert to atomically insert or update
 * Returns isFirstVisit: true if this is the user's first time in this area
 */
export async function recordAreaVisit(
  userId: string,
  areaId: string
): Promise<AreaVisitResult> {
  try {
    // First, check if the user has already visited this area
    const { data: existing } = await supabase
      .from('area_visits')
      .select('id, visit_count')
      .eq('user_id', userId)
      .eq('area_id', areaId)
      .maybeSingle();

    if (existing) {
      // Existing visit - increment count
      const { error: updateError } = await supabase
        .from('area_visits')
        .update({
          visit_count: existing.visit_count + 1,
          last_visited_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[AreaVisits] Error updating visit count:', updateError);
        return { error: updateError as Error, isFirstVisit: false };
      }

      console.log('[AreaVisits] Updated visit count for area:', areaId);
      return { error: null, isFirstVisit: false, areaId, visitCount: existing.visit_count + 1 };
    }

    // First visit - insert new record
    const { data, error } = await supabase
      .from('area_visits')
      .insert({
        user_id: userId,
        area_id: areaId,
        first_visited_at: new Date().toISOString(),
        last_visited_at: new Date().toISOString(),
        visit_count: 1,
        notification_sent: false,
      })
      .select('id')
      .single();

    if (error) {
      // Handle race condition - if another request inserted first
      if (error.code === '23505') {
        // Unique constraint violation - treat as not first visit
        console.log('[AreaVisits] Race condition detected, treating as not first visit');
        return { error: null, isFirstVisit: false, areaId };
      }
      console.error('[AreaVisits] Error recording area visit:', error);
      return { error: error as Error, isFirstVisit: false };
    }

    console.log('[AreaVisits] First visit recorded for area:', areaId);
    return { error: null, isFirstVisit: true, areaId, visitCount: 1 };
  } catch (error) {
    console.error('[AreaVisits] Exception recording area visit:', error);
    return { error: error as Error, isFirstVisit: false };
  }
}

/**
 * Mark that notification was sent for a first-visit
 * Prevents duplicate notifications if events fire multiple times
 */
export async function markNotificationSent(
  userId: string,
  areaId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('area_visits')
      .update({ notification_sent: true })
      .eq('user_id', userId)
      .eq('area_id', areaId);

    if (error) {
      console.error('[AreaVisits] Error marking notification sent:', error);
      return { error: error as Error };
    }

    return { error: null };
  } catch (error) {
    console.error('[AreaVisits] Exception marking notification sent:', error);
    return { error: error as Error };
  }
}

/**
 * Get count of restaurants in an area
 * Uses the neighborhood field on restaurants to approximate area membership
 */
export async function getRestaurantCountInArea(areaId: string): Promise<number> {
  try {
    // First get the area name
    const { data: area, error: areaError } = await supabase
      .from('areas')
      .select('name')
      .eq('id', areaId)
      .single();

    if (areaError || !area) {
      console.error('[AreaVisits] Error fetching area:', areaError);
      return 0;
    }

    // Count active restaurants that match this area's neighborhood
    // Use ilike for flexible matching
    const { count, error: countError } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .or(`neighborhood.ilike.%${area.name}%,neighborhood.ilike.%${area.name.replace(' Lancaster', '').replace('Lancaster ', '')}%`);

    if (countError) {
      console.error('[AreaVisits] Error counting restaurants:', countError);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('[AreaVisits] Exception counting restaurants:', error);
    return 0;
  }
}

/**
 * Get area details by ID
 */
export async function getAreaById(areaId: string): Promise<{ data: Area | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('id', areaId)
      .eq('is_active', true)
      .single();

    if (error) {
      return { data: null, error: error as Error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get user's area visit history
 */
export async function getUserAreaVisits(
  userId: string
): Promise<{ data: Array<{ area_id: string; visit_count: number; first_visited_at: string; last_visited_at: string }> | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('area_visits')
      .select('area_id, visit_count, first_visited_at, last_visited_at')
      .eq('user_id', userId)
      .order('last_visited_at', { ascending: false });

    if (error) {
      return { data: null, error: error as Error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get all active areas
 */
export async function getAllAreas(): Promise<{ data: Area[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      return { data: null, error: error as Error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
