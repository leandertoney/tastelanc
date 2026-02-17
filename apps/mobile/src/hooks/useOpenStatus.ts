import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryClient';
import type { DayOfWeek } from '../types/database';

interface TodayHours {
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export function getCurrentDay(): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

/**
 * Fetches ALL restaurants' hours for today in a single query.
 * Returns a Record keyed by restaurant_id.
 */
export function useOpenStatuses() {
  const today = getCurrentDay();

  return useQuery({
    queryKey: queryKeys.openStatus.today(today),
    queryFn: async (): Promise<Record<string, TodayHours>> => {
      const { data, error } = await supabase
        .from('restaurant_hours')
        .select('restaurant_id, open_time, close_time, is_closed')
        .eq('day_of_week', today);

      if (error) {
        console.warn('useOpenStatuses query failed:', error.message);
        return {};
      }

      const map: Record<string, TodayHours> = {};
      for (const row of data || []) {
        map[row.restaurant_id] = {
          open_time: row.open_time,
          close_time: row.close_time,
          is_closed: row.is_closed,
        };
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Parse "HH:MM" or "HH:MM:SS" into minutes since midnight */
function toMinutes(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
}

/**
 * Returns whether a specific restaurant is currently open.
 * - `true` = open now
 * - `false` = closed (either is_closed day or outside hours)
 * - `null` = no hours data available
 */
export function useIsOpen(restaurantId: string): boolean | null {
  const { data: statuses } = useOpenStatuses();

  if (!statuses || !statuses[restaurantId]) return null;

  const h = statuses[restaurantId];
  if (h.is_closed || !h.open_time || !h.close_time) return false;

  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const openMin = toMinutes(h.open_time);
  const closeMin = toMinutes(h.close_time);

  // Handle midnight-crossing (e.g. bar open 22:00–02:00)
  if (closeMin <= openMin) {
    return currentMin >= openMin || currentMin <= closeMin;
  }

  return currentMin >= openMin && currentMin <= closeMin;
}
