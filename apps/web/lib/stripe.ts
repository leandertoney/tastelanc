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
  // Premium: $200/3mo, $350/6mo, $650/year
  premium_3mo: process.env.STRIPE_PRICE_PREMIUM_3MO || 'price_premium_3mo',
  premium_6mo: process.env.STRIPE_PRICE_PREMIUM_6MO || 'price_premium_6mo',
  premium_yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || 'price_premium_yearly',
  // Elite: $300/3mo, $575/6mo, $1100/year
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

// All consumer price IDs (both regular and early access)
export const ALL_CONSUMER_PRICE_IDS = [
  CONSUMER_PRICE_IDS.premium_monthly,
  CONSUMER_PRICE_IDS.premium_yearly,
  EARLY_ACCESS_PRICE_IDS.monthly,
  EARLY_ACCESS_PRICE_IDS.yearly,
] as const;

// Price info for display - Starter tier removed
export const RESTAURANT_PRICES = {
  premium: { '3mo': 200, '6mo': 350, yearly: 650 },
  elite: { '3mo': 300, '6mo': 575, yearly: 1100 },
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
};

// Legacy support - keep for existing code
export const PRICE_IDS = RESTAURANT_PRICE_IDS;
