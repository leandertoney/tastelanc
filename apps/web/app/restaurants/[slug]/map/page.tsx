import { fetchRestaurantBySlug } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { breadcrumbJsonLd, restaurantJsonLd } from '@/lib/seo/structured';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const r = await fetchRestaurantBySlug(params.slug);
  if (!r) return buildMeta({ title: 'Map | TasteLanc', description: 'Not found', url: `${siteUrl}/restaurants/${params.slug}/map` });
  return buildMeta({
    title: `${r.name} Map | TasteLanc`,
    description: `Map and directions to ${r.name} in Lancaster.`,
    url: `${siteUrl}/restaurants/${r.slug}/map`,
    image: r.cover_image_url || r.logo_url || undefined,
  });
}

export default async function RestaurantMap({ params }: { params: { slug: string } }) {
  const restaurant = await fetchRestaurantBySlug(params.slug);
  if (!restaurant) return <main className="p-8 text-white">Not found</main>;
  if (!restaurant.latitude || !restaurant.longitude) return <main className="p-8 text-white">No map available.</main>;

  const claim = pickClaim(`${restaurant.slug}-map`);
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Restaurants', url: `${siteUrl}/restaurants` },
    { name: restaurant.name, url: `${siteUrl}/restaurants/${restaurant.slug}` },
    { name: 'Map', url: `${siteUrl}/restaurants/${restaurant.slug}/map` },
  ]);
  const schemaRestaurant = restaurantJsonLd(restaurant);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaRestaurant) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <main className="max-w-4xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{restaurant.name} Map</h1>
        <p className="text-gray-400 mt-1">{restaurant.address}, {restaurant.city}, {restaurant.state}</p>
        {restaurantCTAButtons()}
        <div className="mt-6">
          <iframe
            title="Map"
            loading="lazy"
            className="w-full h-96 rounded-lg"
            src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}&q=${encodeURIComponent(restaurant.address + ' ' + restaurant.city + ' ' + restaurant.state)}`}
          />
        </div>
      </main>
    </>
  );
}
