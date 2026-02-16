/**
 * Events API utility
 * Fetches events from the API endpoint with default images
 */

import type { EventType, DayOfWeek } from '../types/database';

const EVENTS_API_URL = 'https://tastelanc.com/api/mobile/events';

// Restaurant data included in API response
export interface EventRestaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tier_id?: string | null;
  tiers?: { name: string } | null;
}

// Self-promoter data included in API response
export interface EventSelfPromoter {
  id: string;
  name: string;
  slug: string;
  profile_image_url: string | null;
}

// Event source type
export type EventSourceType = 'restaurant' | 'self_promoter';

// Event data from API response
export interface ApiEvent {
  id: string;
  name: string;
  description?: string | null;
  event_type: EventType;
  image_url: string; // Always populated (custom or default)
  start_time: string;
  end_time: string | null;
  is_recurring: boolean;
  days_of_week: DayOfWeek[];
  event_date?: string | null;
  performer_name?: string | null;
  cover_charge?: number | null;
  is_active?: boolean;
  source_type?: EventSourceType;
  restaurant?: EventRestaurant;
  self_promoter?: EventSelfPromoter;
}

// Helper to get the venue/artist name for an event
export function getEventVenueName(event: ApiEvent): string {
  if (event.source_type === 'self_promoter' && event.self_promoter) {
    return event.self_promoter.name;
  }
  return event.restaurant?.name || '';
}

// Helper to check if event is from a self-promoter
export function isSelfPromoterEvent(event: ApiEvent): boolean {
  return event.source_type === 'self_promoter';
}

// API response structure
interface EventsApiResponse {
  events: ApiEvent[];
}

// Parameters for fetching events
export interface FetchEventsParams {
  type?: EventType;
  restaurant_id?: string;
  paid_only?: boolean;
  limit?: number;
  market_id?: string | null;
}

/**
 * Fetch events from the API
 * @param params - Optional filters for type, restaurant_id, paid_only, limit
 * @returns Array of events with restaurant data and guaranteed image_url
 */
export async function fetchEvents(params?: FetchEventsParams): Promise<ApiEvent[]> {
  const url = new URL(EVENTS_API_URL);

  // Default to paid restaurants only
  url.searchParams.set('paid_only', params?.paid_only !== false ? 'true' : 'false');
  url.searchParams.set('limit', String(params?.limit ?? 50));

  if (params?.type) {
    url.searchParams.set('type', params.type);
  }
  if (params?.restaurant_id) {
    url.searchParams.set('restaurant_id', params.restaurant_id);
  }

  if (params?.market_id) {
    url.searchParams.set('market_id', params.market_id);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.status}`);
  }

  const data: EventsApiResponse = await response.json();
  return data?.events || [];
}

/**
 * Fetch events for multiple types (e.g., all entertainment types)
 * Since the API only supports one type at a time, we fetch all and filter client-side
 */
export async function fetchEventsByTypes(types: EventType[], marketId?: string | null): Promise<ApiEvent[]> {
  const allEvents = await fetchEvents({ market_id: marketId });
  return allEvents.filter(event => types.includes(event.event_type));
}

// Entertainment event types for filtering
// Note: 'other' is NOT entertainment - it's a regular event type shown in Upcoming Events
export const ENTERTAINMENT_TYPES: EventType[] = [
  'live_music',
  'dj',
  'trivia',
  'karaoke',
  'comedy',
  'sports',
  'bingo',
];

/**
 * Fetch only entertainment events
 */
export async function fetchEntertainmentEvents(marketId?: string | null): Promise<ApiEvent[]> {
  return fetchEventsByTypes(ENTERTAINMENT_TYPES, marketId);
}

/**
 * Fetch only non-entertainment events (e.g., promotions)
 * Used by Upcoming Events section to avoid overlap with Entertainment section
 */
export async function fetchNonEntertainmentEvents(marketId?: string | null): Promise<ApiEvent[]> {
  const allEvents = await fetchEvents({ market_id: marketId });
  return allEvents.filter(event => !ENTERTAINMENT_TYPES.includes(event.event_type));
}
