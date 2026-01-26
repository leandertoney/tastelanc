import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache data for 24 hours (increased for persistence benefit)
      gcTime: 24 * 60 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Don't refetch on window focus for mobile
      refetchOnWindowFocus: false,
      // Refetch when reconnecting
      refetchOnReconnect: true,
    },
  },
});

// Create persister for AsyncStorage
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'TASTELANC_QUERY_CACHE',
  throttleTime: 1000,
});

// Query keys for type safety and consistency
export const queryKeys = {
  restaurants: {
    all: ['restaurants'] as const,
    list: (category?: string) => ['restaurants', 'list', category] as const,
    detail: (id: string) => ['restaurants', 'detail', id] as const,
    search: (query: string, category?: string) => ['restaurants', 'search', query, category] as const,
    recommendations: ['restaurants', 'recommendations'] as const,
  },
  happyHours: {
    all: ['happyHours'] as const,
    byRestaurant: (restaurantId: string) => ['happyHours', restaurantId] as const,
  },
  specials: {
    all: ['specials'] as const,
    byRestaurant: (restaurantId: string) => ['specials', restaurantId] as const,
    today: ['specials', 'today'] as const,
  },
  events: {
    all: ['events'] as const,
    byRestaurant: (restaurantId: string) => ['events', restaurantId] as const,
    upcoming: ['events', 'upcoming'] as const,
  },
  hours: {
    byRestaurant: (restaurantId: string) => ['hours', restaurantId] as const,
  },
  favorites: ['favorites'] as const,
  voting: {
    balance: ['voting', 'balance'] as const,
    userVotes: ['voting', 'userVotes'] as const,
    monthVotes: ['voting', 'monthVotes'] as const,
    leaderboard: (category?: string) => ['voting', 'leaderboard', category] as const,
    winners: ['voting', 'winners'] as const,
  },
  user: {
    preferences: ['user', 'preferences'] as const,
    subscription: ['user', 'subscription'] as const,
    profile: (userId: string) => ['user', 'profile', userId] as const,
  },
  itineraries: {
    all: ['itineraries'] as const,
    detail: (id: string) => ['itineraries', 'detail', id] as const,
  },
  visits: {
    all: (userId: string) => ['visits', userId] as const,
    list: (userId: string, limit?: number) => ['visits', userId, 'list', limit] as const,
    counts: (userId: string) => ['visits', userId, 'counts'] as const,
    recent: (userId: string, days?: number) => ['visits', userId, 'recent', days] as const,
  },
};
