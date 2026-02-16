/**
 * Push Notifications Hook
 * Handles registration, token management, and notification responses.
 * Includes retry logic and foreground re-registration for resilience.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerForPushNotifications,
  savePushToken,
  removePushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getLastNotificationResponse,
  AppNotificationData,
} from '../lib/notifications';
import { useAuth } from '../context/AuthContext';

const PUSH_TOKEN_KEY = '@tastelanc_push_token';
const REGISTRATION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Hook to manage push notifications
 * - Registers for push notifications when user is authenticated
 * - Retries registration up to 3 times on failure
 * - Re-registers when app returns to foreground (5-min cooldown)
 * - Handles notification responses (deep linking)
 * - Saves/removes push tokens from Supabase
 */
export function useNotifications() {
  const { userId, isAuthenticated } = useAuth();
  const navigation = useNavigation();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const lastRegistrationTime = useRef<number>(0);

  /**
   * Handle notification response (user tapped notification)
   */
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as AppNotificationData;

      console.log('Notification tapped with data:', data);

      if (data?.screen) {
        switch (data.screen) {
          case 'RestaurantDetail':
            if (data.restaurantId) {
              (navigation as any).navigate('RestaurantDetail', { id: data.restaurantId });
            }
            break;
          case 'HappyHoursViewAll':
            (navigation as any).navigate('HappyHoursViewAll');
            break;
          case 'EventsViewAll':
            (navigation as any).navigate('EventsViewAll');
            break;
          case 'VoteCenter':
            (navigation as any).navigate('VoteCenter');
            break;
          case 'AreaRestaurants':
            if (data.areaId) {
              (navigation as any).navigate('Explore', {
                areaId: data.areaId,
                areaName: data.areaName,
              });
            }
            break;
          case 'BlogDetail':
            if (data.blogSlug) {
              (navigation as any).navigate('BlogDetail', { slug: data.blogSlug });
            }
            break;
          default:
            console.log('Unknown screen:', data.screen);
        }
      }
    },
    [navigation]
  );

  /**
   * Register for push notifications and save token, with retry logic
   */
  const registerAndSaveToken = useCallback(async () => {
    if (!userId) {
      console.warn('[Notifications] No userId — skipping registration');
      return;
    }

    // Cooldown: skip if we successfully registered recently
    const now = Date.now();
    if (now - lastRegistrationTime.current < REGISTRATION_COOLDOWN_MS) {
      return;
    }

    try {
      const token = await registerForPushNotifications();

      if (!token) return;

      // Save token locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      // Save to Supabase with retries
      let saved = false;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        saved = await savePushToken(token, userId);
        if (saved) break;

        if (attempt < MAX_RETRIES) {
          console.warn(`[Notifications] Save attempt ${attempt}/${MAX_RETRIES} failed, retrying in ${RETRY_DELAY_MS}ms...`);
          await delay(RETRY_DELAY_MS);
        }
      }

      if (saved) {
        lastRegistrationTime.current = Date.now();
        console.log('[Notifications] Registration complete');
      } else {
        console.warn('[Notifications] All save attempts failed — will retry on next foreground');
      }
    } catch (error) {
      console.warn('[Notifications] Registration error:', error);
    }
  }, [userId]);

  /**
   * Remove push token (call on sign out)
   */
  const unregisterToken = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);

      if (token) {
        await removePushToken(token);
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      }
    } catch (error) {
      console.error('[Notifications] Error unregistering push token:', error);
    }
  }, []);

  // Set up notification listeners
  useEffect(() => {
    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log('[Notifications] Received in foreground:', notification.request.content.title);
    });

    responseListener.current = addNotificationResponseListener(handleNotificationResponse);

    getLastNotificationResponse().then((response) => {
      if (response) {
        console.log('[Notifications] App opened from notification');
        handleNotificationResponse(response);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [handleNotificationResponse]);

  // Register on auth ready
  useEffect(() => {
    if (isAuthenticated && userId) {
      registerAndSaveToken();
    }
  }, [isAuthenticated, userId, registerAndSaveToken]);

  // Re-register when app returns to foreground (with cooldown)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated && userId) {
        registerAndSaveToken();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, userId, registerAndSaveToken]);

  return {
    registerAndSaveToken,
    unregisterToken,
  };
}
