/**
 * React Query hooks for itinerary CRUD operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import {
  getItineraries,
  getItinerary,
  saveItinerary,
  deleteItinerary,
} from '../lib/itineraryStorage';
import { useAuth } from './useAuth';
import type { Itinerary, ItineraryItem, ItineraryWithItems } from '../types/itinerary';

/**
 * Get all itineraries for the current user
 */
export function useItineraries() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.itineraries.all,
    queryFn: () => getItineraries(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get a single itinerary by ID
 */
export function useItinerary(id: string) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.itineraries.detail(id),
    queryFn: () => getItinerary(id, userId!),
    enabled: !!userId && !!id,
  });
}

/**
 * Save or update an itinerary
 */
export function useSaveItinerary() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      itinerary: Partial<Itinerary>;
      items: Partial<ItineraryItem>[];
    }): Promise<ItineraryWithItems> => {
      if (!userId) throw new Error('User not authenticated');
      return saveItinerary(data.itinerary, data.items, userId);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.itineraries.all });
      queryClient.setQueryData(queryKeys.itineraries.detail(result.id), result);
    },
  });
}

/**
 * Delete an itinerary
 */
export function useDeleteItinerary() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      return deleteItinerary(id, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.itineraries.all });
    },
  });
}
