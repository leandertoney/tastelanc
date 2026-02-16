import type { Restaurant, Event, Special, HappyHour } from './types';
import { BRAND } from '@/config/market';

export function relatedRestaurants(base: Restaurant, all: Restaurant[], limit = 6) {
  const set = new Set((base.categories || []).map((c) => c.toLowerCase()));
  return all
    .filter((r) => r.id !== base.id && (r.categories || []).some((c) => set.has(c.toLowerCase())))
    .slice(0, limit);
}

export function restaurantCTAButtons() {
  if (!BRAND.appStoreUrls.ios && !BRAND.appStoreUrls.android) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-3 items-center">
      {BRAND.appStoreUrls.ios && (
        <a
          href={BRAND.appStoreUrls.ios}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg bg-tastelanc-accent text-white font-semibold"
        >
          Download for iOS
        </a>
      )}
      {BRAND.appStoreUrls.android && (
        <a
          href={BRAND.appStoreUrls.android}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold"
        >
          Download for Android
        </a>
      )}
    </div>
  );
}

export function leadershipLine(text: string) {
  return <p className="text-sm text-tastelanc-accent font-semibold mb-2">{text}</p>;
}
