import { notFound } from 'next/navigation';
import { fetchRestaurantBySlug } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { breadcrumbJsonLd, restaurantJsonLd } from '@/lib/seo/structured';
import PageViewTracker from '@/components/PageViewTracker';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const r = await fetchRestaurantBySlug(params.slug);
  if (!r) return buildMeta({ title: 'Menu | TasteLanc', description: 'Not found', url: `${siteUrl}/restaurants/${params.slug}/menu` });
  return buildMeta({
    title: `${r.name} Menu | TasteLanc`,
    description: `Explore menu for ${r.name} in Lancaster.`,
    url: `${siteUrl}/restaurants/${r.slug}/menu`,
    image: r.cover_image_url || r.logo_url || undefined,
  });
}

export default async function RestaurantMenu({ params }: { params: { slug: string } }) {
  const restaurant = await fetchRestaurantBySlug(params.slug);
  if (!restaurant) notFound();
  // No menu table yet; gate page
  const claim = pickClaim(`${restaurant.slug}-menu`);
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Restaurants', url: `${siteUrl}/restaurants` },
    { name: restaurant.name, url: `${siteUrl}/restaurants/${restaurant.slug}` },
    { name: 'Menu', url: `${siteUrl}/restaurants/${restaurant.slug}/menu` },
  ]);
  const schemaRestaurant = restaurantJsonLd(restaurant);

  return (
    <>
      <PageViewTracker pagePath={`/restaurants/${restaurant.slug}/menu`} pageType="menu" restaurantId={restaurant.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaRestaurant) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <main className="max-w-4xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{restaurant.name} Menu</h1>
        <p className="text-gray-400 mt-1">{restaurant.address}, {restaurant.city}, {restaurant.state}</p>
        {restaurantCTAButtons()}
        <p className="mt-4 text-gray-300">Menu coming soon. Check back for dishes and pricing.</p>
      </main>
    </>
  );
}
