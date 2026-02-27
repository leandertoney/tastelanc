import { fetchRestaurants, fetchSpecials, fetchHappyHours, fetchEvents } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';
import { notFound } from 'next/navigation';
import { BRAND } from '@/config/market';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
export const revalidate = 1200;

export async function generateMetadata({ params }: { params: { day: string } }) {
  return buildMeta({
    title: `${BRAND.aiName}'s Top ${params.day} Picks | ${BRAND.name}`,
    description: `${BRAND.aiName}'s top restaurants and specials for ${params.day} in ${BRAND.countyShort}.`,
    url: `${siteUrl}/rosie/top/${params.day}`,
  });
}

export default async function RosieTopDay({ params }: { params: { day: string } }) {
  const day = params.day.toLowerCase();
  if (!DAYS.includes(day)) notFound();
  const [restaurants, specials, hh, events] = await Promise.all([
    fetchRestaurants(true),
    fetchSpecials(),
    fetchHappyHours(),
    fetchEvents(),
  ]);
  const ids = new Set<string>();
  specials.filter((s) => (s.days_of_week || []).includes(day as any)).forEach((s) => ids.add(s.restaurant_id));
  hh.filter((h) => (h.days_of_week || []).includes(day as any)).forEach((h) => ids.add(h.restaurant_id));
  events.filter((e) => (e.days_of_week || []).includes(day as any)).forEach((e) => ids.add(e.restaurant_id));
  const list = restaurants.filter((r) => ids.has(r.id)).slice(0, 30);
  if (!list.length) notFound();

  const urls = list.map((r) => `${siteUrl}/restaurants/${r.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim(`rosie-top-${day}`);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{BRAND.aiName}&apos;s Top {day} Picks</h1>
        <p className="text-gray-400 mt-2">Restaurants with specials, events, or happy hours on {day}.</p>
        {restaurantCTAButtons()}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {list.map((r) => (
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
