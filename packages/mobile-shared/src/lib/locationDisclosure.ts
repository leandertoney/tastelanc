import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBrand } from '../config/theme';

const KEY = '@location_disclosure_accepted';

/**
 * Google Play prominent-disclosure gate (User Data policy).
 *
 * Because the Android manifest declares ACCESS_BACKGROUND_LOCATION (Radar
 * geofencing), Play requires a prominent disclosure describing background
 * collection to be shown — and affirmatively accepted — BEFORE any location
 * permission request in the app's normal flow. TasteCumberland 1.0.5 was
 * rejected for exactly this: reviewers hit the foreground request (Home /
 * Settings toggle) first and never reach the check-in flow where
 * LocationUpgradePrompt shows its disclosure.
 *
 * Call this before every Location.requestForegroundPermissionsAsync() /
 * Radar permission request. Resolves true when the user has accepted (now
 * or previously); false when they decline. iOS is exempt (App Store uses
 * purpose strings instead), but showing it there too keeps behavior
 * consistent — we gate Android only to avoid double-prompting iOS users.
 */
export async function ensureLocationDisclosure(): Promise<boolean> {
  try {
    if (Platform.OS !== 'android') return true;

    const accepted = await AsyncStorage.getItem(KEY);
    if (accepted === 'true') return true;

    const brand = getBrand();
    const ok = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Location Access',
        `${brand.appName} collects location data to find restaurants near you, enable automatic check-ins, and send alerts when you are near participating restaurants — including in the background, even when the app is closed or not in use.`,
        [
          { text: 'No thanks', style: 'cancel', onPress: () => resolve(false) },
          { text: 'I agree', onPress: () => resolve(true) },
        ],
        { cancelable: false },
      );
    });

    if (ok) {
      await AsyncStorage.setItem(KEY, 'true');
    }
    return ok;
  } catch {
    // Never hard-block location features on a storage/dialog failure
    return true;
  }
}
