/**
 * RevenueCat Integration
 * Handles subscription purchases and status management
 */

import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { env, isDev } from './env';

// Product identifiers - these must match what's configured in App Store Connect & RevenueCat
export const PRODUCT_IDS = {
  MONTHLY: 'tastelanc_monthly',
  ANNUAL: 'tastelanc_annual',
} as const;

// Entitlement identifier - configured in RevenueCat dashboard
export const ENTITLEMENT_ID = 'premium';

let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts
 */
export async function initRevenueCat(): Promise<void> {
  if (isInitialized) return;

  try {
    // Enable debug logs in development
    if (isDev) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Configure with API key
    await Purchases.configure({
      apiKey: env.REVENUECAT_API_KEY,
    });

    isInitialized = true;
    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    throw error;
  }
}

/**
 * Get current offerings (available subscription packages)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
}

/**
 * Get specific packages for display
 */
export async function getSubscriptionPackages(): Promise<{
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
}> {
  const offering = await getOfferings();

  if (!offering) {
    return { monthly: null, annual: null };
  }

  return {
    monthly: offering.monthly ?? null,
    annual: offering.annual ?? null,
  };
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo: CustomerInfo | null; error?: string }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    // Check if purchase granted premium entitlement
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    return {
      success: isPremium,
      customerInfo,
    };
  } catch (error: any) {
    // Handle user cancellation gracefully
    if (error.userCancelled) {
      return {
        success: false,
        customerInfo: null,
        error: 'Purchase cancelled',
      };
    }

    console.error('Purchase failed:', error);
    return {
      success: false,
      customerInfo: null,
      error: error.message || 'Purchase failed',
    };
  }
}

/**
 * Check if user has active premium subscription
 */
export async function checkPremiumStatus(): Promise<{
  isPremium: boolean;
  willRenew: boolean;
  expirationDate: string | null;
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

    if (!entitlement) {
      return {
        isPremium: false,
        willRenew: false,
        expirationDate: null,
      };
    }

    return {
      isPremium: true,
      willRenew: entitlement.willRenew,
      expirationDate: entitlement.expirationDate,
    };
  } catch (error) {
    console.error('Failed to check premium status:', error);
    return {
      isPremium: false,
      willRenew: false,
      expirationDate: null,
    };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  isPremium: boolean;
  error?: string;
}> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    return {
      success: true,
      isPremium,
    };
  } catch (error: any) {
    console.error('Restore failed:', error);
    return {
      success: false,
      isPremium: false,
      error: error.message || 'Restore failed',
    };
  }
}

/**
 * Get customer info (for debugging/display)
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
}

/**
 * Format price for display
 */
export function formatPrice(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

/**
 * Get price per month for annual package
 */
export function getMonthlyPriceFromAnnual(pkg: PurchasesPackage): string {
  const annualPrice = pkg.product.price;
  const monthlyPrice = annualPrice / 12;
  const currencyCode = pkg.product.currencyCode;

  // Format based on currency
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(monthlyPrice);
}

/**
 * Identify user with RevenueCat (call after user signs in)
 */
export async function identifyUser(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    console.log('User identified with RevenueCat:', userId);
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
}

/**
 * Log out user from RevenueCat (call when user signs out)
 */
export async function logOutUser(): Promise<void> {
  try {
    await Purchases.logOut();
    console.log('User logged out from RevenueCat');
  } catch (error) {
    console.error('Failed to log out user:', error);
  }
}
