import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { fetchEvents } from '../lib/events';
import { queryKeys } from '../lib/queryClient';
import type {
  RestaurantHours,
  HappyHour,
  Special,
  Event,
} from '../types/database';

/**
 * Hook to fetch restaurant hours
 */
export function useRestaurantHours(restaurantId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.hours.byRestaurant(restaurantId),
    queryFn: async (): Promise<RestaurantHours[]> => {
      const { data, error } = await supabase
        .from('restaurant_hours')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!restaurantId,
  });
}

/**
 * Hook to fetch restaurant happy hours
 */
export function useHappyHours(restaurantId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.happyHours.byRestaurant(restaurantId),
    queryFn: async (): Promise<HappyHour[]> => {
      const { data, error } = await supabase
        .from('happy_hours')
        .select('*, happy_hour_items(*)')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!restaurantId,
  });
}

/**
 * Hook to fetch restaurant specials
 */
export function useSpecials(restaurantId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.specials.byRestaurant(restaurantId),
    queryFn: async (): Promise<Special[]> => {
      const { data, error } = await supabase
        .from('specials')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!restaurantId,
  });
}

/**
 * Hook to fetch restaurant events
 */
export function useEvents(restaurantId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.events.byRestaurant(restaurantId),
    queryFn: async (): Promise<Event[]> => {
      const events = await fetchEvents({ restaurant_id: restaurantId });
      // Map API events to Event type
      return events.map(e => ({
        id: e.id,
        restaurant_id: restaurantId,
        name: e.name,
        description: e.description || null,
        event_type: e.event_type,
        is_recurring: e.is_recurring,
        days_of_week: e.days_of_week,
        event_date: e.event_date || null,
        start_time: e.start_time,
        end_time: e.end_time,
        performer_name: e.performer_name || null,
        cover_charge: e.cover_charge || null,
        image_url: e.image_url,
        is_active: true,
      }));
    },
    enabled: enabled && !!restaurantId,
  });
}

/**
 * Hook to fetch all restaurant detail data in parallel
 */
export function useRestaurantAllData(restaurantId: string, enabled = true) {
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.hours.byRestaurant(restaurantId),
        queryFn: async () => {
          const { data, error } = await supabase
            .from('restaurant_hours')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('day_of_week', { ascending: true });
          if (error) throw error;
          return data || [];
        },
        enabled: enabled && !!restaurantId,
      },
      {
        queryKey: queryKeys.happyHours.byRestaurant(restaurantId),
        queryFn: async () => {
          const { data, error } = await supabase
            .from('happy_hours')
            .select('*, happy_hour_items(*)')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true);
          if (error) throw error;
          return data || [];
        },
        enabled: enabled && !!restaurantId,
      },
      {
        queryKey: queryKeys.specials.byRestaurant(restaurantId),
        queryFn: async () => {
          const { data, error } = await supabase
            .from('specials')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true);
          if (error) throw error;
          return data || [];
        },
        enabled: enabled && !!restaurantId,
      },
      {
        queryKey: queryKeys.events.byRestaurant(restaurantId),
        queryFn: async () => {
          const events = await fetchEvents({ restaurant_id: restaurantId });
          // Map API events to Event type
          return events.map(e => ({
            id: e.id,
            restaurant_id: restaurantId,
            name: e.name,
            description: e.description || null,
            event_type: e.event_type,
            is_recurring: e.is_recurring,
            days_of_week: e.days_of_week,
            event_date: e.event_date || null,
            start_time: e.start_time,
            end_time: e.end_time,
            performer_name: e.performer_name || null,
            cover_charge: e.cover_charge || null,
            image_url: e.image_url,
            is_active: true,
          }));
        },
        enabled: enabled && !!restaurantId,
      },
    ],
  });

  const [hoursQuery, happyHoursQuery, specialsQuery, eventsQuery] = results;

  return {
    hours: hoursQuery.data as RestaurantHours[] | undefined,
    happyHours: happyHoursQuery.data as HappyHour[] | undefined,
    specials: specialsQuery.data as Special[] | undefined,
    events: eventsQuery.data as Event[] | undefined,
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
    refetchAll: () => results.forEach((r) => r.refetch()),
  };
}
