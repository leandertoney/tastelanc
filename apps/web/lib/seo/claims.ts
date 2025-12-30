const CLAIMS = [
  "Lancaster’s #1 Food & Nightlife App.",
  "Lancaster’s #1 Restaurant Discovery Platform.",
  "Lancaster’s #1 Guide for Restaurants, Specials & Events.",
  "Powered by Rosie — Lancaster’s First AI Dining Companion.",
];

export function pickClaim(seed: string) {
  let hash = 0;
  for (const ch of seed) {
    hash += ch.charCodeAt(0);
  }
  return CLAIMS[Math.abs(hash) % CLAIMS.length];
}
