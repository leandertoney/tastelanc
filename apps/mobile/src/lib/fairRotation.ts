/**
 * Fair Rotation System
 *
 * Ensures fair visibility for all paying restaurants using epoch-based
 * seeded shuffling. Within each 30-minute epoch, the order is deterministic
 * (consistent on pull-to-refresh) but changes across epochs (48 rotations/day).
 *
 * Tier hierarchy:
 *  - Elite: guaranteed first block
 *  - Premium: second block, shuffled fairly among themselves
 *  - Basic: excluded from premium sections, gets own fair rotation in "Other Places Nearby"
 */

import type { PremiumTier } from '../types/database';

const DEFAULT_EPOCH_MINUTES = 30;

// --- Seeded PRNG (Mulberry32) ---

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Epoch seed ---

export function getEpochSeed(epochMinutes: number = DEFAULT_EPOCH_MINUTES): number {
  return Math.floor(Date.now() / (epochMinutes * 60 * 1000));
}

// --- Seeded Fisher-Yates shuffle ---

export function seededShuffle<T>(array: T[], seed: number): T[] {
  if (array.length <= 1) return [...array];
  const rng = mulberry32(seed);
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// --- Tier extraction helpers ---

/**
 * Extract tier name from an item that has a nested tier/tiers object.
 * Handles various shapes: { tiers: { name } }, { tier: { name } }, { restaurant: { tiers: { name } } }
 */
export function getTierName(item: any): PremiumTier {
  // Direct tier on item
  const tier = item?.tiers?.name || item?.tier?.name;
  if (tier) return tier as PremiumTier;

  // Nested under restaurant
  const restaurantTier =
    item?.restaurant?.tiers?.name || item?.restaurant?.tier?.name;
  if (restaurantTier) return restaurantTier as PremiumTier;

  return 'basic';
}

/**
 * Check if a tier is a paid tier (premium or elite)
 */
export function isPaidTier(tierName: PremiumTier | string): boolean {
  return tierName === 'premium' || tierName === 'elite';
}

// --- Main rotation functions ---

/**
 * Fair rotation for paid restaurants only (home screen premium sections).
 * Returns: [...shuffled elite, ...shuffled premium]
 * Basic items are excluded.
 */
export function paidFairRotate<T>(
  items: T[],
  getTier: (item: T) => PremiumTier = getTierName,
  epochMinutes: number = DEFAULT_EPOCH_MINUTES,
): T[] {
  const seed = getEpochSeed(epochMinutes);

  const elite: T[] = [];
  const premium: T[] = [];

  for (const item of items) {
    const tier = getTier(item);
    if (tier === 'elite') {
      elite.push(item);
    } else if (tier === 'premium') {
      premium.push(item);
    }
    // basic items are excluded
  }

  return [
    ...seededShuffle(elite, seed),
    ...seededShuffle(premium, seed + 1),
  ];
}

/**
 * Fair rotation for basic (free) restaurants ("Other Places Nearby").
 * Uses epoch-based shuffle instead of alphabetical ordering.
 */
export function basicFairRotate<T>(
  items: T[],
  epochMinutes: number = DEFAULT_EPOCH_MINUTES,
): T[] {
  const seed = getEpochSeed(epochMinutes);
  return seededShuffle(items, seed + 2);
}

/**
 * Tiered fair rotation for screens that show ALL restaurants (View All, Search, Categories).
 * Returns: [...shuffled elite, ...shuffled premium, ...shuffled basic]
 */
export function tieredFairRotate<T>(
  items: T[],
  getTier: (item: T) => PremiumTier = getTierName,
  epochMinutes: number = DEFAULT_EPOCH_MINUTES,
): T[] {
  const seed = getEpochSeed(epochMinutes);

  const elite: T[] = [];
  const premium: T[] = [];
  const basic: T[] = [];

  for (const item of items) {
    const tier = getTier(item);
    if (tier === 'elite') {
      elite.push(item);
    } else if (tier === 'premium') {
      premium.push(item);
    } else {
      basic.push(item);
    }
  }

  return [
    ...seededShuffle(elite, seed),
    ...seededShuffle(premium, seed + 1),
    ...seededShuffle(basic, seed + 2),
  ];
}

/**
 * Filter items to only paid (premium/elite) restaurants.
 */
export function filterPaidOnly<T>(
  items: T[],
  getTier: (item: T) => PremiumTier = getTierName,
): T[] {
  return items.filter((item) => isPaidTier(getTier(item)));
}

/**
 * Filter items to only basic (free) restaurants.
 */
export function filterBasicOnly<T>(
  items: T[],
  getTier: (item: T) => PremiumTier = getTierName,
): T[] {
  return items.filter((item) => getTier(item) === 'basic');
}
