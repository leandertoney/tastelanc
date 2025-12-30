import type { Restaurant, Event, Special, HappyHour } from './types';

export function relatedRestaurants(base: Restaurant, all: Restaurant[], limit = 6) {
  const set = new Set((base.categories || []).map((c) => c.toLowerCase()));
  return all
    .filter((r) => r.id !== base.id && (r.categories || []).some((c) => set.has(c.toLowerCase())))
    .slice(0, limit);
}

export function restaurantCTAButtons() {
  return (
    <div className="mt-6 flex flex-wrap gap-3 items-center">
      <a
        href="https://apps.apple.com/us/app/tastelanc/id6755852717"
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 rounded-lg bg-tastelanc-accent text-white font-semibold"
      >
        Download for iOS
      </a>
      <span className="text-gray-500 text-sm">Android Coming Soon</span>
    </div>
  );
}

export function leadershipLine(text: string) {
  return <p className="text-sm text-tastelanc-accent font-semibold mb-2">{text}</p>;
}
