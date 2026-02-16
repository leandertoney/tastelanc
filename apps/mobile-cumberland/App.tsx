import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import Navigation from './src/navigation';
import { ErrorBoundary } from './src/components';
import { queryClient } from './src/lib/queryClient';
import { initSentry, Sentry } from './src/lib/sentry';
import { saveCrash, getAndClearLastCrash } from './src/lib/crashLog';
import { colors } from './src/constants/colors';

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
          <ErrorBoundary level="screen" fallback={<RootErrorFallback />}>
            <Navigation />
          </ErrorBoundary>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

// Wrap with Sentry for unhandled JS error capture (event handlers, async, etc.)
export default Sentry.wrap(App);

// Last-resort fallback when the root ErrorBoundary exhausts all auto-retries.
// Auto-restarts the app via Updates.reloadAsync() after 5 seconds.
function RootErrorFallback() {
  const [restarting, setRestarting] = useState(false);

  const handleRestart = async () => {
    setRestarting(true);
    try {
      if (!__DEV__) {
        await Updates.reloadAsync();
      }
    } catch {
      // If reload fails, user can still tap the button again
      setRestarting(false);
    }
  };

  // Auto-attempt restart after 5 seconds
  useEffect(() => {
    const t = setTimeout(handleRestart, 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something Went Wrong</Text>
      <Text style={styles.errorMessage}>
        {restarting ? 'Restarting...' : 'We hit an unexpected error. Tap below to restart.'}
      </Text>
      <TouchableOpacity
        onPress={handleRestart}
        disabled={restarting}
        style={[styles.restartButton, restarting && styles.restartButtonDisabled]}
      >
        <Text style={styles.restartButtonText}>
          {restarting ? 'Restarting...' : 'Restart App'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  restartButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
  },
  restartButtonDisabled: {
    opacity: 0.6,
  },
  restartButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
