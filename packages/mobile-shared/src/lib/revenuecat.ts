/**
 * RevenueCat Integration
 * Handles subscription purchases and status management.
 * Uses guarded require() so it doesn't crash in Expo Go.
 */

// Type imports are erased at compile time — safe in all environments
import type {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
} from 'react-native-purchases';

// Runtime import — guarded for Expo Go where native module isn't available
let Purchases: any = null;
let LOG_LEVEL: any = null;
let isRevenueCatAvailable = false;

try {
  const rc = require('react-native-purchases');
  Purchases = rc.default;
  LOG_LEVEL = rc.LOG_LEVEL;
  isRevenueCatAvailable = true;
} catch {
  console.log('[RevenueCat] Native module not available (running in Expo Go?)');
}

/** Check if RevenueCat SDK is available (false in Expo Go) */
export function isRevenueCatSDKAvailable(): boolean {
  return isRevenueCatAvailable;
}

/**
 * Product ID configuration — derived from market slug at init time.
 * E.g. marketSlug 'lancaster-pa' → prefix 'tastelanc'
 */
export interface ProductIds {
  MONTHLY: string;
  ANNUAL: string;
  LIFETIME: string; // Actually the discounted annual ($14.99/yr) shown in "lifetime offer" screen
}

/**
 * Product IDs per market — must match App Store Connect and RevenueCat.
 */
const MARKET_PRODUCT_IDS: Record<string, ProductIds> = {
  'lancaster-pa': { MONTHLY: 'tastelanc_monthly_v2', ANNUAL: 'tastelanc_annual_v2', LIFETIME: 'tastelanc_annual_discount' },
  'cumberland-pa': { MONTHLY: 'tastecumberland_monthly', ANNUAL: 'tastecumberland_annual', LIFETIME: 'tastecumberland_annual_discount' },
  'fayetteville-nc': { MONTHLY: 'tastefayetteville_monthly', ANNUAL: 'tastefayetteville_annual', LIFETIME: 'tastefayetteville_annual_discount' },
};

let _productIds: ProductIds = MARKET_PRODUCT_IDS['lancaster-pa'];

/** Get current product IDs (brand-aware after init) */
export function getProductIds(): ProductIds {
  return _productIds;
}

// Entitlement identifier - configured in RevenueCat dashboard
export const ENTITLEMENT_ID = 'premium';

let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts
 * @param apiKey - RevenueCat API key (from env config)
 * @param marketSlug - Market slug to derive product IDs (e.g. 'lancaster-pa')
 */
export async function initRevenueCat(apiKey: string, marketSlug?: string): Promise<void> {
  if (isInitialized) return;

  // Set product IDs from market slug
  if (marketSlug && MARKET_PRODUCT_IDS[marketSlug]) {
    _productIds = MARKET_PRODUCT_IDS[marketSlug];
  }

  if (!isRevenueCatAvailable) {
    console.log('[RevenueCat] Skipping init — native module not available');
    return;
  }

  try {
    // Enable debug logs in development
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Configure with API key
    await Purchases.configure({
      apiKey,
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
  if (!isRevenueCatAvailable) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
}

/**
 * Get specific packages for display (monthly, annual, and lifetime)
 */
export async function getSubscriptionPackages(): Promise<{
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
  lifetime: PurchasesPackage | null;
}> {
  if (!isRevenueCatAvailable) return { monthly: null, annual: null, lifetime: null };
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;

    // Lifetime may be in a separate offering called 'lifetime'
    const lifetimeOffering = offerings.all['lifetime'] ?? null;
    const lifetimePackage = lifetimeOffering?.lifetime ?? lifetimeOffering?.availablePackages?.[0] ?? null;

    if (!current) {
      return { monthly: null, annual: null, lifetime: lifetimePackage };
    }

    return {
      monthly: current.monthly ?? null,
      annual: current.annual ?? null,
      lifetime: lifetimePackage,
    };
  } catch (error) {
    console.error('Failed to get subscription packages:', error);
    return { monthly: null, annual: null, lifetime: null };
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo: CustomerInfo | null; error?: string }> {
  if (!isRevenueCatAvailable) return { success: false, customerInfo: null, error: 'RevenueCat not available' };
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
  if (!isRevenueCatAvailable) return { isPremium: false, willRenew: false, expirationDate: null };
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
  if (!isRevenueCatAvailable) return { success: false, isPremium: false, error: 'RevenueCat not available' };
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
  if (!isRevenueCatAvailable) return null;
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
  if (!isRevenueCatAvailable) return;
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
  if (!isRevenueCatAvailable) return;
  try {
    await Purchases.logOut();
    console.log('User logged out from RevenueCat');
  } catch (error) {
    console.error('Failed to log out user:', error);
  }
}
