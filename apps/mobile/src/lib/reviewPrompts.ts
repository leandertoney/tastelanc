import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

// Review trigger types
export type ReviewTrigger =
  | 'rosie_interaction'
  | 'first_save'
  | 'first_vote'
  | 'session_milestone';

// AsyncStorage keys
const REVIEW_KEYS = {
  SENTIMENT: '@tastelanc_user_sentiment',
  PROMPTED: '@tastelanc_review_prompted',
  LAST_PROMPT: '@tastelanc_last_prompt_date',
  SESSION_COUNT: '@tastelanc_session_count',
  TRIGGERS_FIRED: '@tastelanc_triggers_fired',
};

// Cooldown period in days
const PROMPT_COOLDOWN_DAYS = 30;
const MIN_SESSIONS_BEFORE_PROMPT = 2;

/**
 * Get user's sentiment from onboarding soft ask
 */
export async function getUserSentiment(): Promise<'positive' | 'neutral' | null> {
  try {
    const sentiment = await AsyncStorage.getItem(REVIEW_KEYS.SENTIMENT);
    if (sentiment === 'positive' || sentiment === 'neutral') {
      return sentiment;
    }
    return null;
  } catch (error) {
    console.error('Error getting user sentiment:', error);
    return null;
  }
}

/**
 * Set user's sentiment from onboarding soft ask
 */
export async function setUserSentiment(sentiment: 'positive' | 'neutral'): Promise<void> {
  try {
    await AsyncStorage.setItem(REVIEW_KEYS.SENTIMENT, sentiment);
  } catch (error) {
    console.error('Error setting user sentiment:', error);
  }
}

/**
 * Increment and return the session count
 */
export async function incrementSessionCount(): Promise<number> {
  try {
    const current = await AsyncStorage.getItem(REVIEW_KEYS.SESSION_COUNT);
    const count = current ? parseInt(current, 10) + 1 : 1;
    await AsyncStorage.setItem(REVIEW_KEYS.SESSION_COUNT, count.toString());
    return count;
  } catch (error) {
    console.error('Error incrementing session count:', error);
    return 1;
  }
}

/**
 * Get the current session count
 */
export async function getSessionCount(): Promise<number> {
  try {
    const count = await AsyncStorage.getItem(REVIEW_KEYS.SESSION_COUNT);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    console.error('Error getting session count:', error);
    return 0;
  }
}

/**
 * Get list of triggers that have already fired
 */
async function getTriggersFired(): Promise<ReviewTrigger[]> {
  try {
    const triggers = await AsyncStorage.getItem(REVIEW_KEYS.TRIGGERS_FIRED);
    return triggers ? JSON.parse(triggers) : [];
  } catch (error) {
    console.error('Error getting triggers fired:', error);
    return [];
  }
}

/**
 * Mark a trigger as fired
 */
async function markTriggerFired(trigger: ReviewTrigger): Promise<void> {
  try {
    const triggers = await getTriggersFired();
    if (!triggers.includes(trigger)) {
      triggers.push(trigger);
      await AsyncStorage.setItem(REVIEW_KEYS.TRIGGERS_FIRED, JSON.stringify(triggers));
    }
  } catch (error) {
    console.error('Error marking trigger fired:', error);
  }
}

/**
 * Check if we're within the cooldown period
 */
async function isWithinCooldown(): Promise<boolean> {
  try {
    const lastPrompt = await AsyncStorage.getItem(REVIEW_KEYS.LAST_PROMPT);
    if (!lastPrompt) return false;

    const lastDate = new Date(lastPrompt);
    const now = new Date();
    const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

    return diffDays < PROMPT_COOLDOWN_DAYS;
  } catch (error) {
    console.error('Error checking cooldown:', error);
    return false;
  }
}

/**
 * Check if user has already been prompted
 */
async function hasBeenPrompted(): Promise<boolean> {
  try {
    const prompted = await AsyncStorage.getItem(REVIEW_KEYS.PROMPTED);
    return prompted === 'true';
  } catch (error) {
    console.error('Error checking if prompted:', error);
    return false;
  }
}

/**
 * Mark that user has been prompted and record the date
 */
export async function markReviewPrompted(): Promise<void> {
  try {
    await AsyncStorage.setItem(REVIEW_KEYS.PROMPTED, 'true');
    await AsyncStorage.setItem(REVIEW_KEYS.LAST_PROMPT, new Date().toISOString());
  } catch (error) {
    console.error('Error marking review prompted:', error);
  }
}

/**
 * Check if we should prompt for a review
 */
export async function shouldPromptReview(trigger: ReviewTrigger): Promise<boolean> {
  try {
    // Rule 1: User sentiment must be 'positive'
    const sentiment = await getUserSentiment();
    if (sentiment !== 'positive') {
      return false;
    }

    // Rule 2: Haven't been prompted in last 30 days
    if (await isWithinCooldown()) {
      return false;
    }

    // Rule 3: Haven't already been prompted for this trigger
    const triggersFired = await getTriggersFired();
    if (triggersFired.includes(trigger)) {
      return false;
    }

    // Rule 4: App has been used at least 2 times
    const sessionCount = await getSessionCount();
    if (sessionCount < MIN_SESSIONS_BEFORE_PROMPT) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking if should prompt review:', error);
    return false;
  }
}

/**
 * Request a review if eligible for the given trigger
 * Returns true if a review was requested, false otherwise
 */
export async function requestReviewIfEligible(trigger: ReviewTrigger): Promise<boolean> {
  try {
    // Check if we should prompt
    if (!(await shouldPromptReview(trigger))) {
      return false;
    }

    // Check if StoreReview is available
    if (!(await StoreReview.hasAction())) {
      console.log('StoreReview not available on this device');
      return false;
    }

    // Request the review
    await StoreReview.requestReview();

    // Mark as prompted and record this trigger
    await markReviewPrompted();
    await markTriggerFired(trigger);

    console.log(`Review requested for trigger: ${trigger}`);
    return true;
  } catch (error) {
    console.error('Error requesting review:', error);
    return false;
  }
}

/**
 * Reset all review tracking (for testing)
 */
export async function resetReviewTracking(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      REVIEW_KEYS.SENTIMENT,
      REVIEW_KEYS.PROMPTED,
      REVIEW_KEYS.LAST_PROMPT,
      REVIEW_KEYS.SESSION_COUNT,
      REVIEW_KEYS.TRIGGERS_FIRED,
    ]);
  } catch (error) {
    console.error('Error resetting review tracking:', error);
  }
}
