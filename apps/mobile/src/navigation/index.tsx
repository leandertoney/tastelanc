import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from './RootNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import SplashVideoScreen from '../screens/SplashVideoScreen';
import { AuthProvider } from '../context/AuthContext';
import { MarketProvider } from '../context/MarketContext';
import { OnboardingProvider } from '../context/OnboardingContext';
import { SignUpModalProvider } from '../context/SignUpModalContext';
import { EmailGateProvider } from '../context/EmailGateContext';
import { ErrorBoundary } from '../components';
import { ONBOARDING_STORAGE_KEY, ONBOARDING_DATA_KEY } from '../types/onboarding';
import { colors } from '../constants/colors';
import { env } from '../lib/env';
import { initRadar, startTracking } from '../lib/radar';
// import { initRevenueCat } from '../lib/revenuecat'; // Disabled - app is free
import { useRadarVisits } from '../hooks/useRadarVisits';
import { useNotifications } from '../hooks/useNotifications';
import { incrementSessionCount, requestReviewIfEligible } from '../lib/reviewPrompts';

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
function NavigationInner({ hasCompletedOnboarding }: { hasCompletedOnboarding: boolean }) {
  // Initialize Radar visit tracking (listens for geofence events)
  useRadarVisits();

  console.log('[NavigationInner] Rendering with hasCompletedOnboarding:', hasCompletedOnboarding);

  return (
    <NavigationContainer>
      <NotificationHandler>
        {hasCompletedOnboarding ? <RootNavigator /> : <OnboardingNavigator />}
      </NotificationHandler>
    </NavigationContainer>
  );
}

export default function Navigation() {
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Initialize SDKs once on mount (all wrapped in try/catch for production resilience)
  useEffect(() => {
    try {
      if (env.RADAR_PUBLISHABLE_KEY) {
        initRadar(env.RADAR_PUBLISHABLE_KEY);
        startTracking();
      }
    } catch (e) {
      console.warn('[Navigation] Radar initialization failed:', e);
    }

    try {
      incrementSessionCount().then((count) => {
        if (count === 5) {
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

  // Handle splash video completion
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      {/* Render navigation tree immediately so it mounts and paints behind the splash */}
      <AuthProvider>
        <MarketProvider>
          <EmailGateProvider>
            <SignUpModalProvider>
              <NavigationContext.Provider value={{ restartOnboarding, finishOnboarding }}>
                <OnboardingProvider>
                  <ErrorBoundary
                    level="section"
                    fallback={<NavigationFallback hasCompletedOnboarding={hasCompletedOnboarding} />}
                  >
                    <NavigationInner hasCompletedOnboarding={hasCompletedOnboarding} />
                  </ErrorBoundary>
                </OnboardingProvider>
              </NavigationContext.Provider>
            </SignUpModalProvider>
          </EmailGateProvider>
        </MarketProvider>
      </AuthProvider>

      {/* Splash overlay on top — content renders behind it, no blank frame on dismiss */}
      {showSplash && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ErrorBoundary
            level="section"
            fallback={<SplashFallback onComplete={handleSplashComplete} />}
          >
            <SplashVideoScreen onComplete={handleSplashComplete} />
          </ErrorBoundary>
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  splashFallback: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
