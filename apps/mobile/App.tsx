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

// Initialize Sentry as early as possible (before React renders)
initSentry();

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
  }, []);

  useEffect(() => {
    if (__DEV__) return;
    (async () => {
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (isAvailable) {
          await Updates.fetchUpdateAsync();
        }
      } catch {
        // Silent fail — update will be retried next launch
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
