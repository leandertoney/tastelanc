import { BRAND } from '@/config/market';

const CLAIMS = [
  `${BRAND.countyShort}'s #1 Food & Nightlife App.`,
  `${BRAND.countyShort}'s #1 Restaurant Discovery Platform.`,
  `${BRAND.countyShort}'s #1 Guide for Restaurants, Specials & Events.`,
  `Powered by ${BRAND.aiName} — ${BRAND.countyShort}'s First AI Dining Companion.`,
];

export function pickClaim(seed: string) {
  let hash = 0;
  for (const ch of seed) {
    hash += ch.charCodeAt(0);
  }
  return CLAIMS[Math.abs(hash) % CLAIMS.length];
}
