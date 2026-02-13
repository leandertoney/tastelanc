import Stripe from 'stripe';

let stripeClient: Stripe | null = null;
export function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  stripeClient = new Stripe(key, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
  });
  return stripeClient;
}

// Restaurant Plans - 6 prices (2 tiers × 3 durations) - Starter tier removed
export const RESTAURANT_PRICE_IDS = {
  // Premium: $250/3mo, $450/6mo, $800/year
  premium_3mo: process.env.STRIPE_PRICE_PREMIUM_3MO || 'price_premium_3mo',
  premium_6mo: process.env.STRIPE_PRICE_PREMIUM_6MO || 'price_premium_6mo',
  premium_yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || 'price_premium_yearly',
  // Elite: $350/3mo, $600/6mo, $1100/year
  elite_3mo: process.env.STRIPE_PRICE_ELITE_3MO || 'price_elite_3mo',
  elite_6mo: process.env.STRIPE_PRICE_ELITE_6MO || 'price_elite_6mo',
  elite_yearly: process.env.STRIPE_PRICE_ELITE_YEARLY || 'price_elite_yearly',
} as const;

// Consumer Plans - 2 prices (monthly, yearly)
export const CONSUMER_PRICE_IDS = {
  premium_monthly: process.env.STRIPE_PRICE_CONSUMER_PREMIUM_MONTHLY || 'price_consumer_monthly',
  premium_yearly: process.env.STRIPE_PRICE_CONSUMER_PREMIUM_YEARLY || 'price_consumer_yearly',
} as const;

// Early Access Founder Prices ($1.99/month, $19.99/year) - valid until Dec 12, 2025
export const EARLY_ACCESS_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_EARLY_ACCESS_MONTHLY || 'price_1Sa4YbLikRpMKEPP0xFpkGHl',
  yearly: process.env.STRIPE_PRICE_EARLY_ACCESS_YEARLY || 'price_1Sa4b0LikRpMKEPPgGcJT2gr',
} as const;

// Self-Promoter Plans - $50/month for DJs, musicians, performers
export const SELF_PROMOTER_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_SELF_PROMOTER_MONTHLY || 'price_self_promoter_monthly',
} as const;

export const SELF_PROMOTER_PRICES = {
  monthly: 50,
} as const;

// All consumer price IDs (both regular and early access)
export const ALL_CONSUMER_PRICE_IDS = [
  CONSUMER_PRICE_IDS.premium_monthly,
  CONSUMER_PRICE_IDS.premium_yearly,
  EARLY_ACCESS_PRICE_IDS.monthly,
  EARLY_ACCESS_PRICE_IDS.yearly,
] as const;

// All elite restaurant price IDs (for tier detection in webhooks)
export const ELITE_PRICE_IDS = [
  RESTAURANT_PRICE_IDS.elite_3mo,
  RESTAURANT_PRICE_IDS.elite_6mo,
  RESTAURANT_PRICE_IDS.elite_yearly,
] as const;

// Price info for display - Starter tier removed
export const RESTAURANT_PRICES = {
  premium: { '3mo': 250, '6mo': 450, yearly: 800 },
  elite: { '3mo': 350, '6mo': 600, yearly: 1100 },
} as const;

export const CONSUMER_PRICES = {
  premium: { monthly: 4.99, yearly: 29 },
} as const;

// Plan display names - Starter tier removed
export const PLAN_NAMES: Record<string, string> = {
  // Restaurant plans
  price_premium_3mo: 'Premium (3 Months)',
  price_premium_6mo: 'Premium (6 Months)',
  price_premium_yearly: 'Premium (Annual)',
  price_elite_3mo: 'Elite (3 Months)',
  price_elite_6mo: 'Elite (6 Months)',
  price_elite_yearly: 'Elite (Annual)',
  // Consumer plans
  price_consumer_monthly: 'Premium (Monthly)',
  price_consumer_yearly: 'Premium (Annual)',
  // Self-Promoter plans
  price_self_promoter_monthly: 'Self-Promoter (Monthly)',
};

// Get discount percentage based on restaurant count
export function getDiscountPercent(restaurantCount: number): number {
  if (restaurantCount <= 1) return 0;
  if (restaurantCount === 2) return 10;
  if (restaurantCount === 3) return 15;
  return 20; // 4+
}

// Duration to Stripe billing interval mapping (for programmatic subscription creation)
export const DURATION_TO_INTERVAL: Record<string, { interval: 'month' | 'year'; interval_count: number }> = {
  '3mo': { interval: 'month', interval_count: 3 },
  '6mo': { interval: 'month', interval_count: 6 },
  'yearly': { interval: 'year', interval_count: 1 },
};

// Duration display labels
export const DURATION_LABELS: Record<string, string> = {
  '3mo': '3 Months',
  '6mo': '6 Months',
  'yearly': '1 Year',
};

// Legacy support - keep for existing code
export const PRICE_IDS = RESTAURANT_PRICE_IDS;
