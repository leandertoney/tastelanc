import { SupabaseClient } from '@supabase/supabase-js';
import {
  RestaurantContext,
  RestaurantInfo,
  HappyHourInfo,
  EventInfo,
  SpecialInfo,
} from './types';
import { BRAND } from '@/config/market';

// Types for Supabase query results
interface RestaurantJoin {
  name: string;
  slug: string;
  is_active: boolean;
}

interface HappyHourQueryResult {
  name: string;
  description: string | null;
  days_of_week: string[];
  start_time: string;
  end_time: string;
  restaurant: RestaurantJoin | null;
  happy_hour_items: Array<{
    name: string;
    original_price: number | null;
    discounted_price: number | null;
  }>;
}

interface EventQueryResult {
  name: string;
  description: string | null;
  event_type: string;
  days_of_week: string[];
  start_time: string;
  performer_name: string | null;
  restaurant: RestaurantJoin | null;
}

interface SpecialQueryResult {
  name: string;
  description: string | null;
  days_of_week: string[];
  special_price: number | null;
  discount_description: string | null;
  restaurant: RestaurantJoin | null;
}

// Get current day of week in lowercase
function getCurrentDay(): string {
  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return days[new Date().getDay()];
}

// Format time for display (24h to 12h)
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

// Fetch all active restaurants
export async function getActiveRestaurants(
  supabase: SupabaseClient,
  marketId: string
): Promise<RestaurantInfo[]> {
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('name, slug, address, city, description, categories')
    .eq('market_id', marketId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching restaurants:', error);
    return [];
  }

  return (restaurants || []).map((r) => ({
    name: r.name,
    slug: r.slug,
    address: r.address,
    city: r.city,
    description: r.description,
    categories: r.categories || [],
  }));
}

// Fetch today's happy hours with items
export async function getTodaysHappyHours(
  supabase: SupabaseClient,
  marketId: string
): Promise<HappyHourInfo[]> {
  const today = getCurrentDay();

  const { data: happyHours, error } = await supabase
    .from('happy_hours')
    .select(
      `
      name,
      description,
      days_of_week,
      start_time,
      end_time,
      restaurant:restaurants!inner(name, slug, is_active),
      happy_hour_items(name, original_price, discounted_price)
    `
    )
    .eq('restaurant.market_id', marketId)
    .eq('is_active', true)
    .contains('days_of_week', [today]);

  if (error) {
    console.error('Error fetching happy hours:', error);
    return [];
  }

  const typedHappyHours = happyHours as unknown as HappyHourQueryResult[];

  return (typedHappyHours || [])
    .filter((hh) => hh.restaurant?.is_active)
    .map((hh) => ({
      restaurantName: hh.restaurant?.name || 'Unknown',
      restaurantSlug: hh.restaurant?.slug || '',
      name: hh.name,
      description: hh.description,
      daysOfWeek: hh.days_of_week,
      startTime: formatTime(hh.start_time),
      endTime: formatTime(hh.end_time),
      items: (hh.happy_hour_items || []).map((item) => ({
        name: item.name,
        originalPrice: item.original_price,
        discountedPrice: item.discounted_price,
      })),
    }));
}

// Fetch today's events
export async function getTodaysEvents(
  supabase: SupabaseClient,
  marketId: string
): Promise<EventInfo[]> {
  const today = getCurrentDay();

  const { data: events, error } = await supabase
    .from('events')
    .select(
      `
      name,
      description,
      event_type,
      days_of_week,
      start_time,
      performer_name,
      restaurant:restaurants!inner(name, slug, is_active)
    `
    )
    .eq('restaurant.market_id', marketId)
    .eq('is_active', true)
    .contains('days_of_week', [today]);

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  const typedEvents = events as unknown as EventQueryResult[];

  return (typedEvents || [])
    .filter((e) => e.restaurant?.is_active)
    .map((e) => ({
      restaurantName: e.restaurant?.name || 'Unknown',
      restaurantSlug: e.restaurant?.slug || '',
      name: e.name,
      description: e.description,
      eventType: e.event_type,
      daysOfWeek: e.days_of_week,
      startTime: formatTime(e.start_time),
      performerName: e.performer_name,
    }));
}

// Fetch today's specials
export async function getTodaysSpecials(
  supabase: SupabaseClient,
  marketId: string
): Promise<SpecialInfo[]> {
  const today = getCurrentDay();

  const { data: specials, error } = await supabase
    .from('specials')
    .select(
      `
      name,
      description,
      days_of_week,
      special_price,
      discount_description,
      restaurant:restaurants!inner(name, slug, is_active)
    `
    )
    .eq('restaurant.market_id', marketId)
    .eq('is_active', true)
    .contains('days_of_week', [today]);

  if (error) {
    console.error('Error fetching specials:', error);
    return [];
  }

  const typedSpecials = specials as unknown as SpecialQueryResult[];

  return (typedSpecials || [])
    .filter((s) => s.restaurant?.is_active)
    .map((s) => ({
      restaurantName: s.restaurant?.name || 'Unknown',
      restaurantSlug: s.restaurant?.slug || '',
      name: s.name,
      description: s.description,
      daysOfWeek: s.days_of_week,
      specialPrice: s.special_price,
      discountDescription: s.discount_description,
    }));
}

// Build complete restaurant context for Rosie
export async function buildRestaurantContext(
  supabase: SupabaseClient,
  marketId: string
): Promise<RestaurantContext> {
  const [restaurants, happyHours, events, specials] = await Promise.all([
    getActiveRestaurants(supabase, marketId),
    getTodaysHappyHours(supabase, marketId),
    getTodaysEvents(supabase, marketId),
    getTodaysSpecials(supabase, marketId),
  ]);

  return {
    restaurants,
    happyHours,
    events,
    specials,
  };
}

// Format context as a string for the system prompt
// Includes slug in format [[Name|slug]] for linking
export function formatContextForPrompt(context: RestaurantContext): string {
  const today = getCurrentDay();
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  let contextStr = `## Today is ${todayCapitalized}\n\n`;

  // Restaurants - include slug for linking
  if (context.restaurants.length > 0) {
    contextStr += `### Restaurants in ${BRAND.countyShort} (${context.restaurants.length} active)\n`;
    context.restaurants.forEach((r) => {
      const cats = r.categories.join(', ');
      // Format: name|slug so Rosie can use [[name|slug]] format
      contextStr += `- [[${r.name}|${r.slug}]] (${r.city}) - ${cats}${r.description ? `: ${r.description}` : ''}\n`;
    });
    contextStr += '\n';
  }

  // Today's Happy Hours
  if (context.happyHours.length > 0) {
    contextStr += `### Today's Happy Hours\n`;
    context.happyHours.forEach((hh) => {
      contextStr += `- [[${hh.restaurantName}|${hh.restaurantSlug}]]: ${hh.name} (${hh.startTime} - ${hh.endTime})`;
      if (hh.items.length > 0) {
        const itemList = hh.items
          .map((i) =>
            i.discountedPrice ? `${i.name} $${i.discountedPrice}` : i.name
          )
          .join(', ');
        contextStr += ` - ${itemList}`;
      }
      contextStr += '\n';
    });
    contextStr += '\n';
  }

  // Today's Events
  if (context.events.length > 0) {
    contextStr += `### Today's Events\n`;
    context.events.forEach((e) => {
      contextStr += `- [[${e.restaurantName}|${e.restaurantSlug}]]: ${e.name} at ${e.startTime}`;
      if (e.performerName) {
        contextStr += ` featuring ${e.performerName}`;
      }
      contextStr += ` (${e.eventType.replace('_', ' ')})\n`;
    });
    contextStr += '\n';
  }

  // Today's Specials
  if (context.specials.length > 0) {
    contextStr += `### Today's Specials\n`;
    context.specials.forEach((s) => {
      contextStr += `- [[${s.restaurantName}|${s.restaurantSlug}]]: ${s.name}`;
      if (s.specialPrice) {
        contextStr += ` - $${s.specialPrice}`;
      }
      if (s.discountDescription) {
        contextStr += ` (${s.discountDescription})`;
      }
      contextStr += '\n';
    });
  }

  return contextStr;
}
