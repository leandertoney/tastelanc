import AsyncStorage from '@react-native-async-storage/async-storage';

const PROMO_DISMISSED_KEY = '@tastelanc_promo_dismissed';
const PROMO_DISMISSED_PERMANENT_KEY = '@tastelanc_promo_dismissed_permanent';

// Dismissal duration in milliseconds (7 days)
const DISMISSAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Check if the promo card has been dismissed (either temporarily or permanently)
 */
export async function isPromoDismissed(): Promise<boolean> {
  try {
    // Check permanent dismissal first
    const permanent = await AsyncStorage.getItem(PROMO_DISMISSED_PERMANENT_KEY);
    if (permanent === 'true') {
      return true;
    }

    // Check temporary dismissal
    const dismissedAt = await AsyncStorage.getItem(PROMO_DISMISSED_KEY);
    if (!dismissedAt) {
      return false;
    }

    const dismissedTime = parseInt(dismissedAt, 10);
    const now = Date.now();

    // If 7 days have passed, the dismissal has expired
    if (now - dismissedTime > DISMISSAL_DURATION_MS) {
      // Clear the expired dismissal
      await AsyncStorage.removeItem(PROMO_DISMISSED_KEY);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking promo dismissal:', error);
    return false;
  }
}

/**
 * Dismiss the promo card
 * @param permanent - If true, dismisses permanently. Otherwise dismisses for 7 days.
 */
export async function dismissPromo(permanent: boolean = false): Promise<void> {
  try {
    if (permanent) {
      await AsyncStorage.setItem(PROMO_DISMISSED_PERMANENT_KEY, 'true');
      // Clean up temporary dismissal if exists
      await AsyncStorage.removeItem(PROMO_DISMISSED_KEY);
    } else {
      await AsyncStorage.setItem(PROMO_DISMISSED_KEY, Date.now().toString());
    }
  } catch (error) {
    console.error('Error dismissing promo:', error);
  }
}

/**
 * Check if the promo should be shown based on dismissal state
 */
export async function shouldShowPromo(): Promise<boolean> {
  const dismissed = await isPromoDismissed();
  return !dismissed;
}

/**
 * Reset promo dismissal state (useful for testing)
 */
export async function resetPromoDismissal(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PROMO_DISMISSED_KEY);
    await AsyncStorage.removeItem(PROMO_DISMISSED_PERMANENT_KEY);
  } catch (error) {
    console.error('Error resetting promo dismissal:', error);
  }
}
