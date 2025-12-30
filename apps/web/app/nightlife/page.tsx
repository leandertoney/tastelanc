import { fetchRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
const NIGHTLIFE_KEYS = ['bar', 'brewery', 'pub', 'nightlife', 'club', 'cocktail'];
export const revalidate = 1800;

export async function generateMetadata() {
  return buildMeta({
    title: 'Nightlife in Lancaster, PA | Bars & Breweries | TasteLanc',
    description: 'Explore Lancaster bars, breweries, and nightlife venues with happy hours and events.',
    url: `${siteUrl}/nightlife`,
  });
}

export default async function NightlifePage() {
  const restaurants = await fetchRestaurants(true);
  const filtered = restaurants.filter((r) =>
    (r.categories || []).some((c) => NIGHTLIFE_KEYS.includes(c.toLowerCase()))
  );
  if (!filtered.length) return <main className="p-8 text-white">No nightlife venues found.</main>;

  const urls = filtered.map((r) => `${siteUrl}/restaurants/${r.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim('nightlife');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">Lancaster Nightlife: Bars & Breweries</h1>
        <p className="text-gray-400 mt-2">Find bars, breweries, and nightlife spots.</p>
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
