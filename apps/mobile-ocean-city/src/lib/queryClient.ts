import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportError } from './sentry';
import { queryKeys } from '@tastelanc/mobile-shared/src/lib/queryKeys';

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
    mutations: {
      onError: (error) => {
        reportError(error as Error, { source: 'mutation' });
      },
    },
  },
});

// Report failed queries to Sentry for production visibility
queryClient.getQueryCache().config.onError = (error, query) => {
  reportError(error as Error, {
    source: 'query',
    queryKey: JSON.stringify(query.queryKey),
  });
};

// Create persister for AsyncStorage
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'TASTELANC_QUERY_CACHE_V2',
  throttleTime: 1000,
});

// Re-export queryKeys from shared package so existing imports still work
export { queryKeys };
