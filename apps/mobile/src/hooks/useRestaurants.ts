import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryClient';
import type { Restaurant, RestaurantCategory } from '../types/database';

interface UseRestaurantsOptions {
  category?: RestaurantCategory | 'all';
  limit?: number;
  enabled?: boolean;
}

/**
 * Helper to transform restaurant data with photos
 */
function transformRestaurantWithPhotos(data: any): Restaurant {
  const photos = data.restaurant_photos
    ?.sort((a: any, b: any) => a.display_order - b.display_order)
    ?.map((p: any) => p.url) || [];

  return {
    ...data,
    photos,
    restaurant_photos: undefined,
  };
}

/**
 * Hook to fetch list of restaurants with optional category filter
 */
export function useRestaurants(options: UseRestaurantsOptions = {}) {
  const { category = 'all', limit = 20, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.restaurants.list(category === 'all' ? undefined : category),
    queryFn: async (): Promise<Restaurant[]> => {
      let query = supabase
        .from('restaurants')
        .select('*, restaurant_photos(url, display_order)')
        .eq('is_active', true)
        .limit(limit);

      if (category !== 'all') {
        query = query.contains('categories', [category]);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(transformRestaurantWithPhotos);
    },
    enabled,
  });
}

/**
 * Hook to fetch a single restaurant by ID
 */
export function useRestaurant(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.restaurants.detail(id),
    queryFn: async (): Promise<Restaurant | null> => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*, restaurant_photos(url, display_order)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data ? transformRestaurantWithPhotos(data) : null;
    },
    enabled: enabled && !!id,
  });
}

/**
 * Hook to search restaurants
 */
export function useRestaurantSearch(
  query: string,
  category?: RestaurantCategory,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.restaurants.search(query, category),
    queryFn: async (): Promise<Restaurant[]> => {
      let supabaseQuery = supabase
        .from('restaurants')
        .select('*, restaurant_photos(url, display_order)')
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,address.ilike.%${query}%`)
        .order('is_premium', { ascending: false })
        .limit(30);

      if (category) {
        supabaseQuery = supabaseQuery.contains('categories', [category]);
      }

      const { data, error } = await supabaseQuery;

      if (error) throw error;
      return (data || []).map(transformRestaurantWithPhotos);
    },
    enabled: enabled && query.length >= 2,
    // Shorter stale time for search results
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook to prefetch restaurant detail (for optimistic navigation)
 */
export function usePrefetchRestaurant() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.restaurants.detail(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*, restaurant_photos(url, display_order)')
          .eq('id', id)
          .single();

        if (error) throw error;
        return data ? transformRestaurantWithPhotos(data) : null;
      },
    });
  };
}
