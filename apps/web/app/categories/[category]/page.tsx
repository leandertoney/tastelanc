import { BRAND } from '@/config/market';
import { fetchRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';
import { slugify } from '@/lib/seo/slug';
import { notFound } from 'next/navigation';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 1800;

export async function generateMetadata({ params }: { params: { category: string } }) {
  const titleCategory = params.category.replace(/-/g, ' ');
  return buildMeta({
    title: `${titleCategory} in ${BRAND.countyShort}, ${BRAND.state} | ${BRAND.name}`,
    description: `Discover ${titleCategory} restaurants, specials, and events in ${BRAND.countyShort}.`,
    url: `${siteUrl}/categories/${params.category}`,
  });
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const restaurants = await fetchRestaurants(true);
  const filtered = restaurants.filter((r) => (r.categories || []).some((c) => slugify(c) === params.category));
  if (!filtered.length) notFound();

  const urls = filtered.map((r) => `${siteUrl}/restaurants/${r.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim(`cat-${params.category}`);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{params.category.replace(/-/g, ' ')} in {BRAND.countyShort}</h1>
        <p className="text-gray-400 mt-2">Restaurants, specials, and events in this category.</p>
        {restaurantCTAButtons()}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {filtered.map((r) => (
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
