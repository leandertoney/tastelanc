import React, { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { NavigationContainer, getStateFromPath } from '@react-navigation/native';
import { useNavigationTheme } from '@tastelanc/mobile-shared/src/hooks/useNavigationTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationActionsProvider } from '@tastelanc/mobile-shared/src/context/NavigationActionsContext';
import RootNavigator from './RootNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import SplashVideoScreen from '../screens/SplashVideoScreen';
import { AuthProvider } from '../context/AuthContext';
import { MarketProvider } from '../context/MarketContext';
import { OnboardingProvider } from '../context/OnboardingContext';
import { SignUpModalProvider } from '../context/SignUpModalContext';
import { EmailGateProvider } from '@tastelanc/mobile-shared/src/context/EmailGateContext';
import { ErrorBoundary } from '../components';
import { ONBOARDING_STORAGE_KEY, ONBOARDING_DATA_KEY } from '../types/onboarding';
import { env } from '../lib/env';
import { initRadar, startTracking } from '../lib/radar';
import { initRevenueCat } from '@tastelanc/mobile-shared/src/lib/revenuecat';
import { useRadarVisits } from '../hooks/useRadarVisits';
import { useNotifications } from '../hooks/useNotifications';
import { incrementSessionCount, requestReviewIfEligible } from '../lib/reviewPrompts';
import SignInNudge from '../components/SignInNudge';

// Context to allow resetting/completing onboarding from anywhere in the app
type NavigationContextType = {
  restartOnboarding: () => Promise<void>;
  finishOnboarding: () => void;
};

const NavigationContext = createContext<NavigationContextType | null>(null);

export const useNavigationContext = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationProvider');
  }
  return context;
};

// Component that handles notification listeners (needs to be inside NavigationContainer)
function NotificationHandler({ children }: { children: React.ReactNode }) {
  // Initialize push notifications (registers token and handles deep linking)
  useNotifications();

  return <>{children}</>;
}

// Inner component that uses hooks requiring AuthProvider
const linking = {
  prefixes: ['tastelanc://', 'https://tastelanc.com'],
  config: {
    screens: {
      // https://tastelanc.com/party (universal link — QR codes)
      PartyRSVP: 'party',
      // tastelanc://party-ticket/:qr_token (deep link from web RSVP confirmation)
      PartyTicket: 'party-ticket/:qr_token',
    },
  },
  // Also handle legacy custom scheme path: tastelanc://party-rsvp
  getStateFromPath: (path: string, config: any) => {
    // Normalize legacy paths to the universal link paths
    const normalized = path.replace(/^\/party-rsvp(\/|$)/, '/party$1');
    return getStateFromPath(normalized, config);
  },
};

function NavigationInner({
  hasCompletedOnboarding,
  onReady,
}: {
  hasCompletedOnboarding: boolean;
  onReady?: () => void;
}) {
  // Initialize Radar visit tracking (listens for geofence events)
  useRadarVisits();
  const navTheme = useNavigationTheme();

  return (
    <NavigationContainer theme={navTheme} onReady={onReady} linking={linking}>
      <NotificationHandler>
        {hasCompletedOnboarding ? (
          <>
            <RootNavigator />
            <SignInNudge />
          </>
        ) : (
          <OnboardingNavigator />
        )}
      </NotificationHandler>
    </NavigationContainer>
  );
}

export default function Navigation() {
  const [isLoading, setIsLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [navReady, setNavReady] = useState(false);
  const [overlayRemoved, setOverlayRemoved] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Initialize SDKs once on mount (all wrapped in try/catch for production resilience)
  useEffect(() => {
    try {
      if (env.RADAR_PUBLISHABLE_KEY) {
        initRadar(env.RADAR_PUBLISHABLE_KEY);
        startTracking(); // async — checks permission level and picks efficient vs responsive
      }
    } catch (e) {
      console.warn('[Navigation] Radar initialization failed:', e);
    }

    try {
      initRevenueCat(env.REVENUECAT_API_KEY, 'lancaster-pa').catch((e) => {
        console.warn('[Navigation] RevenueCat initialization failed:', e);
      });
    } catch (e) {
      console.warn('[Navigation] RevenueCat initialization failed:', e);
    }

    try {
      incrementSessionCount().then((count) => {
        if (count === 5 || count === 15 || count === 30) {
          requestReviewIfEligible('session_milestone');
        }
      }).catch((e) => {
        console.warn('[Navigation] Session count/review prompt failed:', e);
      });
    } catch (e) {
      console.warn('[Navigation] Session tracking failed:', e);
    }
  }, []);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  // Handle splash video completion — start mounting navigation tree
  const handleSplashComplete = useCallback(() => {
    setSplashDone(true);
  }, []);

  // Handle navigation ready — content is painted, safe to remove overlay
  const handleNavReady = useCallback(() => {
    setNavReady(true);
  }, []);

  // When navigation is ready, fade out the overlay to force native repaint
  useEffect(() => {
    if (navReady && !overlayRemoved) {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setOverlayRemoved(true);
      });
    }
  }, [navReady, overlayRemoved, overlayOpacity]);

  // Safety net: if navigation takes too long to report ready, force it
  useEffect(() => {
    if (splashDone && !navReady) {
      const timeout = setTimeout(() => {
        console.warn('[Navigation] Nav onReady timeout — forcing overlay removal');
        setNavReady(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [splashDone, navReady]);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      setHasCompletedOnboarding(completed === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Default to showing onboarding on error
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  const restartOnboarding = useCallback(async () => {
    try {
      // Clear onboarding completion status and data
      await AsyncStorage.multiRemove([ONBOARDING_STORAGE_KEY, ONBOARDING_DATA_KEY]);
      setHasCompletedOnboarding(false);
    } catch (error) {
      console.error('Error restarting onboarding:', error);
    }
  }, []);

  // Called after successful purchase/restore to immediately transition to main app
  const finishOnboarding = useCallback(() => {
    console.log('[Navigation] finishOnboarding called, setting hasCompletedOnboarding to true');
    setHasCompletedOnboarding(true);
  }, []);

  return (
    <>
      {/* Mount navigation tree once splash video finishes AND onboarding status is known */}
      {splashDone && !isLoading && (
        <AuthProvider>
          <MarketProvider>
            <EmailGateProvider>
              <SignUpModalProvider>
                <NavigationContext.Provider value={{ restartOnboarding, finishOnboarding }}>
                  <NavigationActionsProvider value={{ restartOnboarding, finishOnboarding }}>
                  <OnboardingProvider>
                    <ErrorBoundary
                      level="section"
                      fallback={<NavigationFallback hasCompletedOnboarding={hasCompletedOnboarding} />}
                    >
                      <NavigationInner
                        hasCompletedOnboarding={hasCompletedOnboarding}
                        onReady={handleNavReady}
                      />
                    </ErrorBoundary>
                  </OnboardingProvider>
                  </NavigationActionsProvider>
                </NavigationContext.Provider>
              </SignUpModalProvider>
            </EmailGateProvider>
          </MarketProvider>
        </AuthProvider>
      )}

      {/* Overlay: splash video → dark bridge → fade out to reveal navigation */}
      {!overlayRemoved && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.splashOverlay, { opacity: overlayOpacity }]}>
          {!splashDone ? (
            <ErrorBoundary
              level="section"
              fallback={<SplashFallback onComplete={handleSplashComplete} />}
            >
              <SplashVideoScreen onComplete={handleSplashComplete} />
            </ErrorBoundary>
          ) : (
            <View style={styles.splashFallback} />
          )}
        </Animated.View>
      )}
    </>
  );
}

// Minimal fallback if splash video crashes — dark screen that auto-completes
function SplashFallback({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [onComplete]);
  return <View style={styles.splashFallback} />;
}

// Fallback navigation without risky hooks (Radar visits, notifications)
// App still works — just loses geofence tracking and notification deep-linking
function NavigationFallback({ hasCompletedOnboarding }: { hasCompletedOnboarding: boolean }) {
  return (
    <NavigationContainer>
      {hasCompletedOnboarding ? <RootNavigator /> : <OnboardingNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    zIndex: 10,
  },
  splashFallback: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
