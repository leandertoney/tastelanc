/**
 * Push Notifications Hook for TasteLanc
 * Handles registration, token management, and notification responses
 */

import { useEffect, useRef, useCallback } from 'react';
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
  TasteLancNotificationData,
} from '../lib/notifications';
import { useAuth } from '../context/AuthContext';

const PUSH_TOKEN_KEY = '@tastelanc_push_token';

/**
 * Hook to manage push notifications
 * - Registers for push notifications when user is authenticated
 * - Handles notification responses (deep linking)
 * - Saves/removes push tokens from Supabase
 */
export function useNotifications() {
  const { userId, isAuthenticated } = useAuth();
  const navigation = useNavigation();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  /**
   * Handle notification response (user tapped notification)
   */
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as TasteLancNotificationData;

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
          default:
            console.log('Unknown screen:', data.screen);
        }
      }
    },
    [navigation]
  );

  /**
   * Register for push notifications and save token
   */
  const registerAndSaveToken = useCallback(async () => {
    if (!userId) return;

    try {
      const token = await registerForPushNotifications();

      if (token) {
        // Save token locally
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

        // Save to Supabase
        await savePushToken(token, userId);
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
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
      console.error('Error unregistering push token:', error);
    }
  }, []);

  // Set up notification listeners
  useEffect(() => {
    // Listen for notifications received while app is in foreground
    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log('Notification received in foreground:', notification);
    });

    // Listen for notification taps
    responseListener.current = addNotificationResponseListener(handleNotificationResponse);

    // Check if app was opened from a notification
    getLastNotificationResponse().then((response) => {
      if (response) {
        console.log('App opened from notification:', response);
        handleNotificationResponse(response);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [handleNotificationResponse]);

  // Register for push notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && userId) {
      registerAndSaveToken();
    }
  }, [isAuthenticated, userId, registerAndSaveToken]);

  return {
    registerAndSaveToken,
    unregisterToken,
  };
}
