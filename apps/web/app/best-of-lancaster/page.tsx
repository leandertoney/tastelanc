import { BRAND } from '@/config/market';
import { fetchRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 3600;

export async function generateMetadata() {
  return buildMeta({
    title: `Best of ${BRAND.countyShort} | Restaurants, Specials & Events | ${BRAND.name}`,
    description: `Top ${BRAND.countyShort} restaurants, specials, happy hours, and events curated by ${BRAND.name}.`,
    url: `${siteUrl}/best-of-lancaster`,
  });
}

export default async function BestOfLancasterPage() {
  const restaurants = await fetchRestaurants(true);
  const list = restaurants.slice(0, 50);
  if (!list.length) return <main className="p-8 text-white">No restaurants found.</main>;

  const urls = list.map((r) => `${siteUrl}/restaurants/${r.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim('best-of-lancaster');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">Best of {BRAND.countyShort}</h1>
        <p className="text-gray-400 mt-2">Top picks for restaurants, specials, and nightlife.</p>
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
