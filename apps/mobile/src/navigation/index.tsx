import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from './RootNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import SplashVideoScreen from '../screens/SplashVideoScreen';
import { AuthProvider } from '../context/AuthContext';
import { OnboardingProvider } from '../context/OnboardingContext';
import { ONBOARDING_STORAGE_KEY, ONBOARDING_DATA_KEY } from '../types/onboarding';
import { colors } from '../constants/colors';
import { env } from '../lib/env';
import { initRadar, startTracking } from '../lib/radar';
import { initRevenueCat } from '../lib/revenuecat';
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

  // Initialize SDKs once on mount
  useEffect(() => {
    // Initialize Radar for location tracking
    if (env.RADAR_PUBLISHABLE_KEY) {
      initRadar(env.RADAR_PUBLISHABLE_KEY);
      startTracking();
    }

    // Initialize RevenueCat for subscriptions
    initRevenueCat().catch((error) => {
      console.error('Failed to initialize RevenueCat:', error);
    });

    // Track session count and trigger review at 5th session
    incrementSessionCount().then((count) => {
      if (count === 5) {
        requestReviewIfEligible('session_milestone');
      }
    });
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

  // Show splash video first
  if (showSplash) {
    return <SplashVideoScreen onComplete={handleSplashComplete} />;
  }

  return (
    <AuthProvider>
      <NavigationContext.Provider value={{ restartOnboarding, finishOnboarding }}>
        <OnboardingProvider>
          <NavigationInner hasCompletedOnboarding={hasCompletedOnboarding} />
        </OnboardingProvider>
      </NavigationContext.Provider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
});
