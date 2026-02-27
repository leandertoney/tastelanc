import { fetchHappyHours, fetchSpecials, fetchEvents, fetchRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';
import { BRAND } from '@/config/market';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 600;

export async function generateMetadata() {
  return buildMeta({
    title: `${BRAND.aiName} Recommends Today | ${BRAND.name}`,
    description: `${BRAND.aiName}'s top ${BRAND.countyShort} picks for today.`,
    url: `${siteUrl}/rosie/recommends/today`,
  });
}

export default async function RosieRecommendsToday() {
  const today = new Date().toISOString().slice(0, 10);
  const [restaurants, hh, specials, events] = await Promise.all([
    fetchRestaurants(true),
    fetchHappyHours(),
    fetchSpecials(),
    fetchEvents(),
  ]);
  const hhToday = hh.filter((h) => (h.days_of_week || []).includes(today.toLowerCase() as any));
  const specialsToday = specials.filter((s) => (s.days_of_week || []).includes(today.toLowerCase() as any));
  const eventsToday = events.filter((e) => e.event_date === today);

  const restaurantIds = new Set<string>();
  hhToday.forEach((h) => restaurantIds.add(h.restaurant_id));
  specialsToday.forEach((s) => restaurantIds.add(s.restaurant_id));
  eventsToday.forEach((e) => restaurantIds.add(e.restaurant_id));
  const recs = restaurants.filter((r) => restaurantIds.has(r.id)).slice(0, 30);

  if (!recs.length) return <main className="p-8 text-white">{BRAND.aiName} has no picks for today yet.</main>;

  const urls = recs.map((r) => `${siteUrl}/restaurants/${r.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim('rosie-today');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{BRAND.aiName} Recommends Today</h1>
        <p className="text-gray-400 mt-2">Local picks for today based on specials, happy hours, and events.</p>
        {restaurantCTAButtons()}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {recs.map((r) => (
            <a key={r.id} href={`/restaurants/${r.slug}`} className="p-4 bg-tastelanc-surface rounded-lg block">
              <h2 className="text-xl font-semibold text-white">{r.name}</h2>
              {(r.custom_description || r.description) && <p className="text-sm text-gray-300 mt-1 line-clamp-2">{r.custom_description || r.description}</p>}
              <p className="text-xs text-gray-500 mt-1">{r.categories?.join(', ')}</p>
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
