import { fetchRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';
import { BRAND } from '@/config/market';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
const DATE_KEYWORDS = ['date', 'romantic', 'wine', 'fine-dining', 'steak', 'cocktail'];
export const revalidate = 1800;

export async function generateMetadata() {
  return buildMeta({
    title: `${BRAND.aiName}'s Date Night Picks | ${BRAND.name}`,
    description: `${BRAND.aiName}'s favorite date night spots in ${BRAND.countyShort}.`,
    url: `${siteUrl}/rosie/for/date-night`,
  });
}

export default async function RosieDateNight() {
  const restaurants = await fetchRestaurants(true);
  const filtered = restaurants.filter((r) =>
    (r.categories || []).some((c) => DATE_KEYWORDS.includes(c.toLowerCase()))
  );
  const list = filtered.length ? filtered : restaurants.slice(0, 20);
  if (!list.length) return <main className="p-8 text-white">No picks found.</main>;

  const urls = list.map((r) => `${siteUrl}/restaurants/${r.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim('rosie-date-night');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{BRAND.aiName}&apos;s Date Night Picks</h1>
        <p className="text-gray-400 mt-2">Cozy, romantic spots {BRAND.aiName} loves for date night.</p>
        {restaurantCTAButtons()}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {list.map((r) => (
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
