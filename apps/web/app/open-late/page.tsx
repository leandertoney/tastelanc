import { BRAND } from '@/config/market';
import { fetchRestaurants, fetchHappyHours, fetchSpecials } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 1800;

export async function generateMetadata() {
  return buildMeta({
    title: `Open Late in ${BRAND.countyShort}, ${BRAND.state} | ${BRAND.name}`,
    description: `Find ${BRAND.countyShort} restaurants and bars open late with specials and happy hours.`,
    url: `${siteUrl}/open-late`,
  });
}

export default async function OpenLatePage() {
  const [restaurants, hh, specials] = await Promise.all([
    fetchRestaurants(true),
    fetchHappyHours(),
    fetchSpecials(),
  ]);
  // Heuristic: include if they have HH or specials ending at/after 9pm, else include all as fallback.
  const lateIds = new Set<string>();
  hh.forEach((h) => {
    const end = parseInt((h.end_time || '').split(':')[0] || '0', 10);
    if (end >= 21) lateIds.add(h.restaurant_id);
  });
  specials.forEach((s) => {
    const end = parseInt((s.end_time || '').split(':')[0] || '0', 10);
    if (end >= 21) lateIds.add(s.restaurant_id);
  });
  const filtered = restaurants.filter((r) => lateIds.has(r.id)) || restaurants.slice(0, 50);
  if (!filtered.length) return <main className="p-8 text-white">No open-late options found.</main>;

  const urls = filtered.map((r) => `${siteUrl}/restaurants/${r.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim('open-late');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">Open Late in {BRAND.countyShort}</h1>
        <p className="text-gray-400 mt-2">Late-night spots with food, drinks, and vibes.</p>
        {restaurantCTAButtons()}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {filtered.map((r) => (
            <a key={r.id} href={`/restaurants/${r.slug}`} className="p-4 bg-tastelanc-surface rounded-lg block">
              <h2 className="text-xl font-semibold text-white">{r.name}</h2>
              {r.description && <p className="text-sm text-gray-300 mt-1 line-clamp-2">{r.description}</p>}
              <p className="text-xs text-gray-500 mt-1">{r.categories?.join(', ')}</p>
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
