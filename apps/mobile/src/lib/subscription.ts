/**
 * Subscription management for TasteLanc
 * Uses RevenueCat for actual purchases, with local caching for faster access
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { updatePremiumStatus } from './profile';
import {
  checkPremiumStatus as checkRevenueCatStatus,
  purchasePackage,
  restorePurchases as rcRestorePurchases,
  getSubscriptionPackages,
  ENTITLEMENT_ID,
} from './revenuecat';
import type { PurchasesPackage } from 'react-native-purchases';
import { supabase } from './supabase';

// Storage keys for local caching
const SUBSCRIPTION_CACHE_KEY = '@tastelanc_subscription_cache';
const TRIAL_START_KEY = '@tastelanc_trial_start';
const NO_CARD_TRIAL_KEY = '@tastelanc_no_card_trial_start';

// 3-day no-card trial duration in milliseconds
const NO_CARD_TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

export type SubscriptionPlan = 'free' | 'monthly' | 'annual';
export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'expired';

export interface SubscriptionData {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialStartDate: string | null;
  trialEndDate: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
}

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  plan: 'free',
  status: 'none',
  trialStartDate: null,
  trialEndDate: null,
  subscriptionStartDate: null,
  subscriptionEndDate: null,
};

/**
 * Start a 3-day no-credit-card trial
 * Grants premium features for 3 days without requiring payment
 */
export async function startNoCardTrial(): Promise<void> {
  try {
    const now = new Date().toISOString();
    await AsyncStorage.setItem(NO_CARD_TRIAL_KEY, now);
    console.log('[Subscription] Started no-card trial at:', now);
  } catch (error) {
    console.error('Error starting no-card trial:', error);
  }
}

/**
 * Check if user is currently in no-card trial period
 */
export async function isInNoCardTrial(): Promise<boolean> {
  try {
    const trialStart = await AsyncStorage.getItem(NO_CARD_TRIAL_KEY);
    if (!trialStart) return false;

    const startTime = new Date(trialStart).getTime();
    const now = Date.now();
    const elapsed = now - startTime;

    return elapsed < NO_CARD_TRIAL_DURATION_MS;
  } catch (error) {
    console.error('Error checking no-card trial:', error);
    return false;
  }
}

/**
 * Get no-card trial info (for display purposes)
 */
export async function getNoCardTrialInfo(): Promise<{
  isActive: boolean;
  daysRemaining: number;
  endDate: Date | null;
}> {
  try {
    const trialStart = await AsyncStorage.getItem(NO_CARD_TRIAL_KEY);
    if (!trialStart) {
      return { isActive: false, daysRemaining: 0, endDate: null };
    }

    const startTime = new Date(trialStart).getTime();
    const endTime = startTime + NO_CARD_TRIAL_DURATION_MS;
    const now = Date.now();
    const remaining = endTime - now;

    if (remaining <= 0) {
      return { isActive: false, daysRemaining: 0, endDate: new Date(endTime) };
    }

    const daysRemaining = Math.ceil(remaining / (24 * 60 * 60 * 1000));
    return {
      isActive: true,
      daysRemaining,
      endDate: new Date(endTime),
    };
  } catch (error) {
    console.error('Error getting no-card trial info:', error);
    return { isActive: false, daysRemaining: 0, endDate: null };
  }
}

/**
 * Check if user has premium access
 * NOTE: Currently returns true for all users (free app launch)
 * To enable payments later, restore the RevenueCat/trial checks
 */
export async function hasPremiumAccess(): Promise<boolean> {
  // Free app - all features unlocked for everyone
  return true;
}

// Cache for premium status to avoid repeated queries
let premiumStatusCache: { userId: string; isPremium: boolean; timestamp: number } | null = null;
const PREMIUM_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if user has active premium subscription via consumer_subscriptions table
 * Used for rewards multiplier (2.5x for premium users)
 *
 * @param userId - The user's UUID
 * @returns true if user has active subscription
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  if (!userId) return false;

  // Check cache first
  if (
    premiumStatusCache &&
    premiumStatusCache.userId === userId &&
    Date.now() - premiumStatusCache.timestamp < PREMIUM_CACHE_DURATION_MS
  ) {
    return premiumStatusCache.isPremium;
  }

  try {
    const { data, error } = await supabase
      .from('consumer_subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('[Subscription] Error checking premium status:', error);
      return false;
    }

    const isPremium = !!data;

    // Cache the result
    premiumStatusCache = {
      userId,
      isPremium,
      timestamp: Date.now(),
    };

    return isPremium;
  } catch (error) {
    console.error('[Subscription] Error checking premium status:', error);
    return false;
  }
}

/**
 * Clear premium status cache (call when subscription status changes)
 */
export function clearPremiumStatusCache(): void {
  premiumStatusCache = null;
}

/**
 * Get premium multiplier for rewards
 * Premium users get 2.5x points
 *
 * @param userId - The user's UUID
 * @returns 2.5 for premium users, 1.0 for regular users
 */
export async function getPremiumMultiplier(userId: string): Promise<number> {
  const isPremium = await isPremiumUser(userId);
  return isPremium ? 2.5 : 1.0;
}

/**
 * Purchase a subscription package via RevenueCat
 */
export async function purchaseSubscription(
  pkg: PurchasesPackage
): Promise<{ success: boolean; error?: string }> {
  const result = await purchasePackage(pkg);

  if (result.success) {
    // Update local cache
    const plan = pkg.identifier.includes('annual') ? 'annual' : 'monthly';
    await updateCachedSubscription({
      plan,
      status: 'active',
      trialStartDate: null,
      trialEndDate: null,
      subscriptionStartDate: new Date().toISOString(),
      subscriptionEndDate: null, // RevenueCat manages this
    });
  }

  return {
    success: result.success,
    error: result.error,
  };
}

/**
 * Restore purchases via RevenueCat
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  isPremium: boolean;
  error?: string;
}> {
  const result = await rcRestorePurchases();

  if (result.success && result.isPremium) {
    await updateCachedSubscription({
      plan: 'monthly', // Default, actual plan is managed by RevenueCat
      status: 'active',
      trialStartDate: null,
      trialEndDate: null,
      subscriptionStartDate: new Date().toISOString(),
      subscriptionEndDate: null,
    });
  }

  return result;
}

/**
 * Get available subscription packages from RevenueCat
 */
export async function getAvailablePackages(): Promise<{
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
}> {
  return getSubscriptionPackages();
}

/**
 * Get cached subscription data (for fast access, not source of truth)
 */
export async function getCachedSubscription(): Promise<SubscriptionData> {
  try {
    const data = await AsyncStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (!data) return DEFAULT_SUBSCRIPTION;
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting cached subscription:', error);
    return DEFAULT_SUBSCRIPTION;
  }
}

/**
 * Update cached subscription data
 */
async function updateCachedSubscription(subscription: SubscriptionData): Promise<void> {
  try {
    await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(subscription));
  } catch (error) {
    console.error('Error caching subscription:', error);
  }
}

/**
 * Get full subscription status (combines RevenueCat with display info)
 */
export async function getSubscriptionStatus(): Promise<{
  isPremium: boolean;
  willRenew: boolean;
  expirationDate: string | null;
  displayInfo: { title: string; subtitle: string; badge: string | null };
}> {
  const status = await checkRevenueCatStatus();

  let displayInfo: { title: string; subtitle: string; badge: string | null };

  if (status.isPremium) {
    displayInfo = {
      title: 'TasteLanc+ Premium',
      subtitle: status.willRenew ? 'Premium member' : 'Expires soon',
      badge: 'PRO',
    };
  } else {
    displayInfo = {
      title: 'TasteLanc+',
      subtitle: 'All features included',
      badge: 'PRO',
    };
  }

  return {
    ...status,
    displayInfo,
  };
}

/**
 * Clear subscription cache (for testing/reset)
 */
export async function clearSubscriptionCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([SUBSCRIPTION_CACHE_KEY, TRIAL_START_KEY]);
  } catch (error) {
    console.error('Error clearing subscription cache:', error);
  }
}

// ============================================================================
// Legacy functions - kept for backward compatibility during transition
// These will be deprecated once RevenueCat is fully integrated
// ============================================================================

/**
 * @deprecated Use purchaseSubscription with a RevenueCat package instead
 */
export async function activateSubscription(plan: 'monthly' | 'annual'): Promise<SubscriptionData> {
  console.warn('activateSubscription is deprecated. Use purchaseSubscription with RevenueCat.');
  const now = new Date();
  const endDate = new Date(now);

  if (plan === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  const subscription: SubscriptionData = {
    plan,
    status: 'active',
    trialStartDate: null,
    trialEndDate: null,
    subscriptionStartDate: now.toISOString(),
    subscriptionEndDate: endDate.toISOString(),
  };

  await updateCachedSubscription(subscription);
  return subscription;
}

/**
 * @deprecated Free trials are now handled by RevenueCat/App Store
 */
export async function startFreeTrial(plan: 'monthly' | 'annual'): Promise<SubscriptionData> {
  console.warn('startFreeTrial is deprecated. Trials are now handled by RevenueCat.');
  const now = new Date();
  const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
  const trialEnd = new Date(now.getTime() + TRIAL_DURATION_MS);

  const subscription: SubscriptionData = {
    plan,
    status: 'trial',
    trialStartDate: now.toISOString(),
    trialEndDate: trialEnd.toISOString(),
    subscriptionStartDate: null,
    subscriptionEndDate: null,
  };

  await updateCachedSubscription(subscription);
  await AsyncStorage.setItem(TRIAL_START_KEY, now.toISOString());

  return subscription;
}

/**
 * @deprecated Use getCachedSubscription instead
 */
export async function getSubscription(): Promise<SubscriptionData> {
  return getCachedSubscription();
}

/**
 * Get subscription display info (still useful for UI)
 */
export function getSubscriptionDisplayInfo(subscription: SubscriptionData): {
  title: string;
  subtitle: string;
  badge: string | null;
} {
  switch (subscription.status) {
    case 'trial':
      const trialEnd = subscription.trialEndDate
        ? new Date(subscription.trialEndDate)
        : null;
      const daysLeft = trialEnd
        ? Math.ceil((trialEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        : 0;
      return {
        title: 'TasteLanc+ Trial',
        subtitle: `${Math.max(0, daysLeft)} days remaining`,
        badge: 'TRIAL',
      };

    case 'active':
      const planLabel = subscription.plan === 'annual' ? 'Annual' : 'Monthly';
      return {
        title: `TasteLanc+ ${planLabel}`,
        subtitle: 'Premium member',
        badge: 'PRO',
      };

    case 'expired':
      return {
        title: 'TasteLanc+',
        subtitle: 'All features included',
        badge: 'PRO',
      };

    default:
      return {
        title: 'TasteLanc+',
        subtitle: 'All features included',
        badge: 'PRO',
      };
  }
}

// ============================================================================
// Web/Stripe functions - these remain unchanged
// ============================================================================

/**
 * Apply web premium unlock (called when user purchases via Stripe on web)
 */
export async function applyWebPremiumUnlock(
  userId: string,
  plan: 'monthly' | 'annual' = 'monthly'
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now);

  if (plan === 'monthly') {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  await updatePremiumStatus(userId, true, 'stripe', expiresAt.toISOString());
}

/**
 * Revoke web premium (called when subscription is cancelled or expires)
 */
export async function revokeWebPremium(userId: string): Promise<void> {
  await updatePremiumStatus(userId, false, null, null);
}
