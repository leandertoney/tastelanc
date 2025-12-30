import { fetchRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';
import { slugify } from '@/lib/seo/slug';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
export const revalidate = 1200;

export async function generateMetadata({ params }: { params: { category: string; day: string } }) {
  return buildMeta({
    title: `${params.category.replace(/-/g, ' ')} on ${params.day} in Lancaster | TasteLanc`,
    description: `Discover ${params.category.replace(/-/g, ' ')} options on ${params.day} in Lancaster.`,
    url: `${siteUrl}/categories/${params.category}/${params.day}`,
  });
}

export default async function CategoryDayPage({ params }: { params: { category: string; day: string } }) {
  const day = params.day.toLowerCase();
  if (!DAYS.includes(day)) return <main className="p-8 text-white">Not found</main>;
  const restaurants = await fetchRestaurants(true);
  const filtered = restaurants.filter((r) => (r.categories || []).some((c) => slugify(c) === params.category));
  if (!filtered.length) return <main className="p-8 text-white">No restaurants found.</main>;

  const urls = filtered.map((r) => `${siteUrl}/restaurants/${r.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim(`cat-${params.category}-${day}`);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{params.category.replace(/-/g, ' ')} on {day}</h1>
        <p className="text-gray-400 mt-2">Lancaster restaurants in this category for {day} outings.</p>
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
