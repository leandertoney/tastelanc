/**
 * Push Notifications Service for TasteLanc
 * Handles registration, permissions, and notification handling
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications appear when app is in foreground
// Wrapped in try/catch because this runs at import time — if the native module
// is in a bad state, an unguarded throw here crashes the entire app on import
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.warn('[Notifications] Failed to set notification handler:', e);
}

/**
 * Register for push notifications and get the Expo push token
 * @returns Expo push token or null if registration failed
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.warn('[Notifications] Not a physical device — skipping registration');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission denied (status:', finalStatus, ')');
      return null;
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('[Notifications] No projectId in app config — cannot get push token');
      return null;
    }

    // Get native device token first, then pass it explicitly to ensure
    // Expo updates the APNs routing to THIS app (not Expo Go)
    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    console.log('[Notifications] Device token type:', devicePushToken.type);

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
      devicePushToken,
    });

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D4382C',
      });
    }

    console.log('[Notifications] Token obtained:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.warn('[Notifications] Token generation failed:', error);
    return null;
  }
}

/**
 * Save push token to Supabase
 * @param token - Expo push token
 * @param userId - Supabase user ID
 */
export async function savePushToken(token: string, userId: string): Promise<boolean> {
  try {
    // Refresh the session first to ensure a valid JWT is sent with the request.
    // Anonymous sessions can have expired access tokens — getSession() auto-refreshes.
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.warn('[Notifications] Session refresh failed:', sessionError.message);
    }
    if (!sessionData?.session) {
      console.warn('[Notifications] No valid session — cannot save token');
      return false;
    }

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: Platform.OS,
          app_slug: 'tastelanc',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'token',
        }
      );

    if (error) {
      console.warn('[Notifications] Save to Supabase failed:', error.message, error.code);
      return false;
    }

    console.log('[Notifications] Token saved to Supabase');
    return true;
  } catch (error) {
    console.warn('[Notifications] Save to Supabase exception:', error);
    return false;
  }
}

/**
 * Remove push token from Supabase (call on sign out)
 * @param token - Expo push token to remove
 */
export async function removePushToken(token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('token', token);

    if (error) {
      console.error('Error removing push token:', error);
      return false;
    }

    console.log('Push token removed successfully');
    return true;
  } catch (error) {
    console.error('Error removing push token:', error);
    return false;
  }
}

/**
 * Add listener for notifications received while app is in foreground
 * @param callback - Function to call when notification is received
 * @returns Subscription object (call .remove() to unsubscribe)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for notification responses (user tapped notification)
 * @param callback - Function to call when user taps notification
 * @returns Subscription object (call .remove() to unsubscribe)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the notification that was used to open the app (if any)
 * @returns Last notification response or null
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

/**
 * Schedule a local notification (useful for testing)
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Additional data to pass with notification
 * @param seconds - Delay in seconds before showing notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  seconds: number = 1
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: {
      seconds,
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    },
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Set the badge count (iOS only)
 * @param count - Badge number to display
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Get current badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

// Type for notification data we send
export interface TasteLancNotificationData {
  screen?: 'RestaurantDetail' | 'HappyHoursViewAll' | 'EventsViewAll' | 'VoteCenter' | 'AreaRestaurants' | 'BlogDetail';
  restaurantId?: string;
  areaId?: string;
  areaName?: string;
  category?: string;
  blogSlug?: string;
}

/**
 * Trigger an area entry notification via the edge function
 * Called when user enters an area geofence for the first time
 * @param userId - User ID to send notification to
 * @param areaId - Area UUID
 * @param areaName - Display name of the area
 * @param restaurantCount - Number of restaurants in the area
 * @returns true if notification was sent successfully
 */
export async function triggerAreaNotification(
  userId: string,
  areaId: string,
  areaName: string,
  restaurantCount: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-notifications/area-entry', {
      body: {
        userId,
        areaId,
        areaName,
        restaurantCount,
      },
    });

    if (error) {
      console.error('[Notifications] Error triggering area notification:', error);
      return false;
    }

    console.log('[Notifications] Area notification response:', data);
    return data?.sent === true;
  } catch (error) {
    console.error('[Notifications] Exception triggering area notification:', error);
    return false;
  }
}
