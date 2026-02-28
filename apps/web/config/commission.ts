/**
 * Sales Rep Commission Structure
 *
 * Tiers reset every 30 days:
 *   1-6 signups → 15%
 *   7+  signups → 20%
 *
 * Pay period: Sunday–Saturday, paid following Friday.
 * Renewals pay 50% of the initial commission rate.
 */

export interface PlanPricing {
  cost: number;
  lengthLabel: string;
  lengthMonths: number;
  payout15: number;   // at 15% tier
  payout20: number;   // at 20% tier
  renewal15: number;  // renewal at 15% (50% of initial)
  renewal20: number;  // renewal at 20% (50% of initial)
}

export interface PlanConfig {
  name: string;
  pricing: PlanPricing[];
}

export const COMMISSION_TIERS = {
  standard: { minSignups: 1, maxSignups: 6, rate: 0.15, label: '15%' },
  bonus: { minSignups: 7, maxSignups: Infinity, rate: 0.20, label: '20%' },
} as const;

export const TIER_RESET_DAYS = 30;

export const PLANS: PlanConfig[] = [
  {
    name: 'Premium',
    pricing: [
      { cost: 250, lengthLabel: '3 month', lengthMonths: 3, payout15: 38, payout20: 50, renewal15: 19, renewal20: 25 },
      { cost: 450, lengthLabel: '6 month', lengthMonths: 6, payout15: 68, payout20: 90, renewal15: 34, renewal20: 45 },
      { cost: 800, lengthLabel: '1 year',  lengthMonths: 12, payout15: 120, payout20: 160, renewal15: 60, renewal20: 80 },
    ],
  },
  {
    name: 'Elite',
    pricing: [
      { cost: 350, lengthLabel: '3 month', lengthMonths: 3, payout15: 53, payout20: 60, renewal15: 27, renewal20: 30 },
      { cost: 650, lengthLabel: '6 month', lengthMonths: 6, payout15: 98, payout20: 130, renewal15: 49, renewal20: 60 },
      { cost: 1100, lengthLabel: '1 year',  lengthMonths: 12, payout15: 165, payout20: 220, renewal15: 83, renewal20: 110 },
    ],
  },
];

/** Look up the payout for a sale */
export function getCommissionPayout(opts: {
  planName: string;
  lengthMonths: number;
  isRenewal: boolean;
  signupsInPeriod: number;
}): number {
  const plan = PLANS.find((p) => p.name.toLowerCase() === opts.planName.toLowerCase());
  if (!plan) return 0;

  const pricing = plan.pricing.find((p) => p.lengthMonths === opts.lengthMonths);
  if (!pricing) return 0;

  const is20 = opts.signupsInPeriod >= COMMISSION_TIERS.bonus.minSignups;

  if (opts.isRenewal) {
    return is20 ? pricing.renewal20 : pricing.renewal15;
  }
  return is20 ? pricing.payout20 : pricing.payout15;
}

/** Get the current tier based on signups */
export function getCurrentTier(signupsInPeriod: number) {
  if (signupsInPeriod >= COMMISSION_TIERS.bonus.minSignups) {
    return COMMISSION_TIERS.bonus;
  }
  return COMMISSION_TIERS.standard;
}

/** Get the Sunday–Saturday pay period that contains a given date.
 *  All returned dates use noon UTC to avoid timezone boundary issues
 *  when formatting with toISOString().split('T')[0]. */
export function getPayPeriod(date: Date): { start: Date; end: Date; payDate: Date } {
  // Parse as UTC noon to avoid local timezone shifts
  const y = date.getUTCFullYear?.() ?? date.getFullYear();
  const m = date.getUTCMonth?.() ?? date.getMonth();
  const day = date.getUTCDate?.() ?? date.getDate();
  const d = new Date(Date.UTC(y, m, day, 12, 0, 0));
  const dayOfWeek = d.getUTCDay(); // 0=Sun

  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - dayOfWeek);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  // Paid the following Friday (6 days after Saturday end)
  const payDate = new Date(end);
  payDate.setUTCDate(end.getUTCDate() + 6); // Sat + 6 = Fri

  return { start, end, payDate };
}

/** Format currency */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
