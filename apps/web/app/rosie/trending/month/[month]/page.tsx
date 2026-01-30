import { fetchRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';
import { notFound } from 'next/navigation';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { month: string } }) {
  return buildMeta({
    title: `Rosie’s Trending for ${params.month} | TasteLanc`,
    description: `Rosie’s trending picks for ${params.month} in Lancaster.`,
    url: `${siteUrl}/rosie/trending/month/${params.month}`,
  });
}

export default async function RosieTrendingMonth({ params }: { params: { month: string } }) {
  const restaurants = await fetchRestaurants(true);
  const list = restaurants.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 30);
  if (!list.length) notFound();

  const urls = list.map((r) => `${siteUrl}/restaurants/${r.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim(`rosie-trending-${params.month}`);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">Rosie’s Trending Picks — {params.month}</h1>
        <p className="text-gray-400 mt-2">Who’s hot this month in Lancaster.</p>
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
