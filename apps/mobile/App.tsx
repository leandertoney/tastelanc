import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import Navigation from './src/navigation';
import { ErrorBoundary } from './src/components';
import { queryClient } from './src/lib/queryClient';
import { initSentry, Sentry } from './src/lib/sentry';
import { saveCrash, getAndClearLastCrash } from './src/lib/crashLog';

// Initialize Sentry as early as possible (before React renders)
initSentry();

// Global JS error handler — catches errors that escape React tree
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  saveCrash(error, isFatal ? 'GlobalHandler:fatal' : 'GlobalHandler:non-fatal');
  originalHandler?.(error, isFatal);
});

function App() {
  useEffect(() => {
    // Clear old corrupted React Query cache keys from AsyncStorage
    (async () => {
      try {
        await AsyncStorage.multiRemove([
          'TASTELANC_QUERY_CACHE',
          'TASTELANC_QUERY_CACHE_V2',
        ]);
      } catch {
        // Non-critical — continue even if cleanup fails
      }
    })();

    // Log any crash from a previous session
    getAndClearLastCrash().then((crash) => {
      if (crash) {
        console.warn('[CrashLog] Previous crash recovered:', JSON.stringify(crash, null, 2));
      }
    });
  }, []);

  useEffect(() => {
    if (__DEV__) return;
    (async () => {
      try {
        console.log('[Updates] Checking for update...');
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (isAvailable) {
          console.log('[Updates] Update available, downloading...');
          await Updates.fetchUpdateAsync();
          console.log('[Updates] Downloaded, reloading app...');
          await Updates.reloadAsync();
        } else {
          console.log('[Updates] App is up to date');
        }
      } catch (e) {
        console.warn('[Updates] Check failed:', e);
      }
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <ErrorBoundary level="screen">
            <Navigation />
          </ErrorBoundary>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

// Wrap with Sentry for unhandled JS error capture (event handlers, async, etc.)
export default Sentry.wrap(App);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
