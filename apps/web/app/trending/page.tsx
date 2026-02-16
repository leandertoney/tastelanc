import { BRAND } from '@/config/market';
import { fetchRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 900;

export async function generateMetadata() {
  return buildMeta({
    title: `Trending Restaurants in ${BRAND.countyShort}, ${BRAND.state} | ${BRAND.name}`,
    description: `See trending ${BRAND.countyShort} restaurants with specials, happy hours, and events.`,
    url: `${siteUrl}/trending`,
  });
}

export default async function TrendingPage() {
  const restaurants = await fetchRestaurants(true);
  const trending = restaurants.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 50);
  if (!trending.length) return <main className="p-8 text-white">No restaurants found.</main>;

  const urls = trending.map((r) => `${siteUrl}/restaurants/${r.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim('trending');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">Trending Restaurants</h1>
        <p className="text-gray-400 mt-2">What locals are checking out now.</p>
        {restaurantCTAButtons()}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {trending.map((r) => (
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
