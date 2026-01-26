/**
 * Itinerary persistence layer
 * AsyncStorage for fast local access + Supabase for cloud backup
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { Itinerary, ItineraryItem, ItineraryWithItems } from '../types/itinerary';

const STORAGE_KEY = '@tastelanc_itineraries';
const MAX_ITINERARIES = 10;

// Simple UUID generator (avoids dependency on crypto.randomUUID which may not be available in all RN environments)
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}-${Math.random().toString(36).substring(2, 6)}`;
}

// ─── Storage key helpers ────────────────────────────────────────

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY}_${userId}`;
}

// ─── Local (AsyncStorage) operations ────────────────────────────

async function getLocalItineraries(userId: string): Promise<ItineraryWithItems[]> {
  try {
    const data = await AsyncStorage.getItem(getStorageKey(userId));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading local itineraries:', error);
    return [];
  }
}

async function setLocalItineraries(userId: string, itineraries: ItineraryWithItems[]): Promise<void> {
  try {
    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(itineraries));
  } catch (error) {
    console.error('Error saving local itineraries:', error);
  }
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Get all itineraries for a user
 * Reads from local storage first, falls back to Supabase
 */
export async function getItineraries(userId: string): Promise<ItineraryWithItems[]> {
  // Try local first for speed
  const local = await getLocalItineraries(userId);
  if (local.length > 0) {
    return local;
  }

  // Fall back to Supabase
  try {
    const { data: itineraries, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!itineraries || itineraries.length === 0) return [];

    // Fetch items for each itinerary
    const result: ItineraryWithItems[] = [];
    for (const itin of itineraries) {
      const { data: items, error: itemsError } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('itinerary_id', itin.id)
        .order('sort_order', { ascending: true });

      if (itemsError) throw itemsError;
      result.push({ ...itin, items: items || [] });
    }

    // Cache locally
    await setLocalItineraries(userId, result);
    return result;
  } catch (error) {
    console.error('Error fetching itineraries from Supabase:', error);
    return [];
  }
}

/**
 * Get a single itinerary by ID
 */
export async function getItinerary(id: string, userId: string): Promise<ItineraryWithItems | null> {
  // Check local first
  const local = await getLocalItineraries(userId);
  const found = local.find(i => i.id === id);
  if (found) return found;

  // Fall back to Supabase
  try {
    const { data: itin, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!itin) return null;

    const { data: items, error: itemsError } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('itinerary_id', id)
      .order('sort_order', { ascending: true });

    if (itemsError) throw itemsError;
    return { ...itin, items: items || [] };
  } catch (error) {
    console.error('Error fetching itinerary:', error);
    return null;
  }
}

/**
 * Save an itinerary with its items
 * Writes to local storage immediately, syncs to Supabase in background
 */
export async function saveItinerary(
  itinerary: Partial<Itinerary>,
  items: Partial<ItineraryItem>[],
  userId: string,
): Promise<ItineraryWithItems> {
  const now = new Date().toISOString();
  const isNew = !itinerary.id;

  // Build the full itinerary object
  const fullItinerary: Itinerary = {
    id: itinerary.id || generateId(),
    user_id: userId,
    title: itinerary.title || 'My Lancaster Day',
    date: itinerary.date || new Date().toISOString().split('T')[0],
    notes: itinerary.notes || null,
    is_generated: itinerary.is_generated || false,
    created_at: itinerary.created_at || now,
    updated_at: now,
  };

  // Build full item objects
  const fullItems: ItineraryItem[] = items.map((item, index) => ({
    id: item.id || generateId(),
    itinerary_id: fullItinerary.id,
    sort_order: item.sort_order ?? index,
    time_slot: item.time_slot || 'lunch',
    start_time: item.start_time || null,
    end_time: item.end_time || null,
    item_type: item.item_type || 'restaurant',
    restaurant_id: item.restaurant_id || null,
    event_id: item.event_id || null,
    happy_hour_id: item.happy_hour_id || null,
    custom_title: item.custom_title || null,
    custom_notes: item.custom_notes || null,
    display_name: item.display_name || 'Unknown',
    display_address: item.display_address || null,
    display_latitude: item.display_latitude || null,
    display_longitude: item.display_longitude || null,
    display_image_url: item.display_image_url || null,
    created_at: item.created_at || now,
    updated_at: now,
  }));

  const result: ItineraryWithItems = { ...fullItinerary, items: fullItems };

  // Save locally immediately
  const local = await getLocalItineraries(userId);
  if (isNew) {
    // Add new, enforce max limit
    local.unshift(result);
    if (local.length > MAX_ITINERARIES) {
      local.pop();
    }
  } else {
    // Update existing
    const idx = local.findIndex(i => i.id === fullItinerary.id);
    if (idx >= 0) {
      local[idx] = result;
    } else {
      local.unshift(result);
    }
  }
  await setLocalItineraries(userId, local);

  // Sync to Supabase in background (don't block)
  syncToSupabase(fullItinerary, fullItems, isNew).catch(err => {
    console.error('Background Supabase sync failed:', err);
  });

  return result;
}

/**
 * Delete an itinerary
 */
export async function deleteItinerary(id: string, userId: string): Promise<void> {
  // Remove locally
  const local = await getLocalItineraries(userId);
  const filtered = local.filter(i => i.id !== id);
  await setLocalItineraries(userId, filtered);

  // Remove from Supabase in background
  (async () => {
    try {
      await supabase.from('itinerary_items').delete().eq('itinerary_id', id);
      await supabase.from('itineraries').delete().eq('id', id);
    } catch (err) {
      console.error('Error deleting itinerary from Supabase:', err);
    }
  })();
}

// ─── Supabase sync helper ───────────────────────────────────────

async function syncToSupabase(
  itinerary: Itinerary,
  items: ItineraryItem[],
  isNew: boolean,
): Promise<void> {
  if (isNew) {
    const { error: itinError } = await supabase
      .from('itineraries')
      .insert({
        id: itinerary.id,
        user_id: itinerary.user_id,
        title: itinerary.title,
        date: itinerary.date,
        notes: itinerary.notes,
        is_generated: itinerary.is_generated,
      });
    if (itinError) throw itinError;
  } else {
    const { error: itinError } = await supabase
      .from('itineraries')
      .update({
        title: itinerary.title,
        date: itinerary.date,
        notes: itinerary.notes,
        updated_at: itinerary.updated_at,
      })
      .eq('id', itinerary.id);
    if (itinError) throw itinError;

    // Delete existing items before re-inserting
    await supabase.from('itinerary_items').delete().eq('itinerary_id', itinerary.id);
  }

  // Insert all items
  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from('itinerary_items')
      .insert(items.map(item => ({
        id: item.id,
        itinerary_id: item.itinerary_id,
        sort_order: item.sort_order,
        time_slot: item.time_slot,
        start_time: item.start_time,
        end_time: item.end_time,
        item_type: item.item_type,
        restaurant_id: item.restaurant_id,
        event_id: item.event_id,
        happy_hour_id: item.happy_hour_id,
        custom_title: item.custom_title,
        custom_notes: item.custom_notes,
        display_name: item.display_name,
        display_address: item.display_address,
        display_latitude: item.display_latitude,
        display_longitude: item.display_longitude,
        display_image_url: item.display_image_url,
      })));
    if (itemsError) throw itemsError;
  }
}
