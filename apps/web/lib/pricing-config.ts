/**
 * Centralized Pricing Configuration
 *
 * SINGLE SOURCE OF TRUTH for all subscription pricing across the platform.
 * Used by: Sales CRM, Admin Panel, Restaurant Dashboard, API routes
 *
 * Version: 2.0 (Unified Pricing)
 * Effective: 2026-05-22
 */

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const PRICING_FEATURE_FLAGS = {
  unifiedPricing: {
    enabled: true, // Enable unified pricing
    showInSalesCRM: true,
    showInAdmin: true,
    showInDashboard: true,
  },
  legacyPricing: {
    enabled: true, // Keep for grandfathered customers
    showInUI: false, // Don't show in sales forms
    allowNewSignups: false, // Don't allow new signups on legacy plans
  },
} as const;

// ============================================================================
// UNIFIED PRICING (VERSION 2.0)
// ============================================================================

export const UNIFIED_PLAN = {
  id: 'unified' as const,
  name: 'TasteLanc Premium',
  displayName: 'Premium',
  description: 'Complete platform access with all premium features',
  color: 'bg-gradient-to-r from-purple-500 to-blue-500',
  tier: 'elite', // Maps to database tier

  billing: {
    monthly: {
      id: 'monthly' as const,
      label: 'Monthly',
      displayLabel: 'Monthly - $99/mo',
      price: 99, // dollars
      priceCents: 9900,
      stripeKey: 'unified_monthly' as const,
      interval: 'month' as const,
      intervalCount: 1,
    },
    yearly: {
      id: 'yearly' as const,
      label: 'Annual',
      displayLabel: 'Annual - $899/yr (Save $289!)',
      price: 899, // dollars
      priceCents: 89900,
      stripeKey: 'unified_yearly' as const,
      interval: 'year' as const,
      intervalCount: 1,
      savings: 289, // vs monthly * 12
    },
  },

  features: {
    // Content Management
    menuDisplay: true,
    photoGallery: true,
    hours: true,

    // Marketing
    emailCampaigns: 8, // per month
    pushNotifications: 999, // unlimited
    socialMediaContent: true,

    // Specials & Events
    weeklySpecials: true,
    happyHours: true,
    events: true,
    entertainment: true,

    // Analytics
    analytics: 'advanced' as const,
    consumerInsights: true,

    // Premium Features
    logoOnMap: true,
    dailySpecialList: true,
    eventSpotlights: true,
    liveEntertainmentSpotlight: true,
    weeklyUpdates: true,
  },
} as const;

// ============================================================================
// LEGACY PRICING (VERSION 1.0 - GRANDFATHERED)
// ============================================================================

export const LEGACY_PLANS = {
  premium: {
    id: 'premium' as const,
    name: 'Premium',
    displayName: 'Premium (Legacy)',
    color: 'bg-blue-500',
    tier: 'premium',
    billing: {
      monthly: { id: 'monthly' as const, price: 99, priceCents: 9900, stripeKey: 'premium_monthly' as const },
      '3mo': { id: '3mo' as const, price: 250, priceCents: 25000, stripeKey: 'premium_3mo' as const },
      '6mo': { id: '6mo' as const, price: 450, priceCents: 45000, stripeKey: 'premium_6mo' as const },
      yearly: { id: 'yearly' as const, price: 800, priceCents: 80000, stripeKey: 'premium_yearly' as const },
    },
  },
  elite: {
    id: 'elite' as const,
    name: 'Elite',
    displayName: 'Elite (Legacy)',
    color: 'bg-purple-500',
    tier: 'elite',
    billing: {
      monthly: { id: 'monthly' as const, price: 149, priceCents: 14900, stripeKey: 'elite_monthly' as const },
      '3mo': { id: '3mo' as const, price: 350, priceCents: 35000, stripeKey: 'elite_3mo' as const },
      '6mo': { id: '6mo' as const, price: 600, priceCents: 60000, stripeKey: 'elite_6mo' as const },
      yearly: { id: 'yearly' as const, price: 1100, priceCents: 110000, stripeKey: 'elite_yearly' as const },
    },
  },
  coffee_shop: {
    id: 'coffee_shop' as const,
    name: 'Coffee Shop',
    displayName: 'Coffee Shop (Legacy)',
    color: 'bg-amber-500',
    tier: 'coffee_shop',
    billing: {
      monthly: { id: 'monthly' as const, price: 49, priceCents: 4900, stripeKey: 'coffee_shop_monthly' as const },
    },
  },
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PlanId = 'unified' | 'premium' | 'elite' | 'coffee_shop';
export type UnifiedBillingInterval = 'monthly' | 'yearly';
export type LegacyBillingInterval = 'monthly' | '3mo' | '6mo' | 'yearly';
export type BillingInterval = UnifiedBillingInterval | LegacyBillingInterval;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all available plans based on feature flags
 */
export function getAvailablePlans() {
  const plans: any[] = [];

  if (PRICING_FEATURE_FLAGS.unifiedPricing.enabled) {
    plans.push(UNIFIED_PLAN);
  }

  if (PRICING_FEATURE_FLAGS.legacyPricing.enabled && PRICING_FEATURE_FLAGS.legacyPricing.showInUI) {
    plans.push(...Object.values(LEGACY_PLANS));
  }

  return plans;
}

/**
 * Get all available plans for sales/admin (what can be sold)
 */
export function getSalesAvailablePlans() {
  const plans: any[] = [];

  if (PRICING_FEATURE_FLAGS.unifiedPricing.enabled && PRICING_FEATURE_FLAGS.unifiedPricing.showInSalesCRM) {
    plans.push(UNIFIED_PLAN);
  }

  if (PRICING_FEATURE_FLAGS.legacyPricing.allowNewSignups) {
    plans.push(...Object.values(LEGACY_PLANS));
  }

  return plans;
}

/**
 * Get plan by ID (includes legacy plans for backward compatibility)
 */
export function getPlanById(planId: PlanId) {
  if (planId === 'unified') return UNIFIED_PLAN;
  return LEGACY_PLANS[planId as keyof typeof LEGACY_PLANS] || null;
}

/**
 * Get price for a plan and billing interval
 */
export function getPrice(planId: PlanId, interval: BillingInterval): number {
  const plan = getPlanById(planId);
  if (!plan) return 0;

  const billing = plan.billing[interval as keyof typeof plan.billing];
  return billing ? billing.price : 0;
}

/**
 * Get price in cents for a plan and billing interval
 */
export function getPriceCents(planId: PlanId, interval: BillingInterval): number {
  const plan = getPlanById(planId);
  if (!plan) return 0;

  const billing = plan.billing[interval as keyof typeof plan.billing];
  return billing ? billing.priceCents : 0;
}

/**
 * Get Stripe price key for a plan and billing interval
 */
export function getStripePriceKey(planId: PlanId, interval: BillingInterval): string {
  const plan = getPlanById(planId);
  if (!plan) return '';

  const billing = plan.billing[interval as keyof typeof plan.billing];
  return billing ? billing.stripeKey : '';
}

/**
 * Check if a plan ID is valid
 */
export function isValidPlan(planId: string): planId is PlanId {
  return planId === 'unified' || planId in LEGACY_PLANS;
}

/**
 * Check if a billing interval is valid for a plan
 */
export function isValidInterval(planId: PlanId, interval: string): interval is BillingInterval {
  const plan = getPlanById(planId);
  if (!plan) return false;
  return interval in plan.billing;
}

/**
 * Map database tier name to display name
 */
export function getTierDisplayName(tierName: string): string {
  switch (tierName) {
    case 'elite':
    case 'unified':
      return 'Premium';
    case 'premium':
      return 'Premium (Legacy)';
    case 'coffee_shop':
      return 'Coffee Shop (Legacy)';
    case 'basic':
      return 'Free';
    default:
      return tierName;
  }
}

// ============================================================================
// CONFIGURATION METADATA
// ============================================================================

export const PRICING_CONFIG_METADATA = {
  version: '2.0',
  effectiveDate: '2026-05-22',
  description: 'Unified pricing with single $99/$899 tier',
  changelog: [
    {
      version: '2.0',
      date: '2026-05-22',
      changes: [
        'Introduced unified pricing: $99/month or $899/year',
        'All new subscriptions get complete premium features',
        'Removed 3-month and 6-month billing options',
        'Removed multi-restaurant discounts',
        'Legacy plans grandfathered but not offered to new customers',
      ],
    },
    {
      version: '1.0',
      date: '2025-01-01',
      changes: [
        'Original pricing: Basic (free), Premium, Elite, Coffee Shop',
        'Multiple billing periods: monthly, 3mo, 6mo, yearly',
        'Multi-restaurant discounts: 10-20% off',
      ],
    },
  ],
} as const;
