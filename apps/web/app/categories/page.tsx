import { BRAND } from '@/config/market';
import { fetchRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';
import { slugify } from '@/lib/seo/slug';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 3600;

export async function generateMetadata() {
  return buildMeta({
    title: `${BRAND.countyShort} Restaurant Categories | ${BRAND.name}`,
    description: `Browse ${BRAND.countyShort} restaurants by category.`,
    url: `${siteUrl}/categories`,
  });
}

export default async function CategoriesPage() {
  const restaurants = await fetchRestaurants(true);
  const set = new Set<string>();
  restaurants.forEach((r) => (r.categories || []).forEach((c) => set.add(c)));
  const categories = Array.from(set);
  if (!categories.length) return <main className="p-8 text-white">No categories found.</main>;

  const urls = categories.map((c) => `${siteUrl}/categories/${slugify(c)}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim('categories');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{BRAND.countyShort} Restaurant Categories</h1>
        <p className="text-gray-400 mt-2">Explore restaurants by cuisine and style.</p>
        {restaurantCTAButtons()}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {categories.map((c) => (
            <a key={c} href={`/categories/${slugify(c)}`} className="p-3 bg-tastelanc-surface rounded-lg block">
              <h2 className="text-lg font-semibold text-white">{c}</h2>
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
