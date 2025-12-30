import { fetchRestaurantBySlug } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { breadcrumbJsonLd, restaurantJsonLd } from '@/lib/seo/structured';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const r = await fetchRestaurantBySlug(params.slug);
  if (!r) return buildMeta({ title: 'Photos | TasteLanc', description: 'Not found', url: `${siteUrl}/restaurants/${params.slug}/photos` });
  return buildMeta({
    title: `${r.name} Photos | TasteLanc`,
    description: `Photos of ${r.name} in Lancaster.`,
    url: `${siteUrl}/restaurants/${r.slug}/photos`,
    image: r.cover_image_url || r.logo_url || undefined,
  });
}

export default async function RestaurantPhotos({ params }: { params: { slug: string } }) {
  const restaurant = await fetchRestaurantBySlug(params.slug);
  if (!restaurant) return <main className="p-8 text-white">Not found</main>;
  const images = [restaurant.cover_image_url, restaurant.logo_url].filter(Boolean) as string[];
  if (!images.length) return <main className="p-8 text-white">No photos available.</main>;

  const claim = pickClaim(`${restaurant.slug}-photos`);
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Restaurants', url: `${siteUrl}/restaurants` },
    { name: restaurant.name, url: `${siteUrl}/restaurants/${restaurant.slug}` },
    { name: 'Photos', url: `${siteUrl}/restaurants/${restaurant.slug}/photos` },
  ]);
  const schemaRestaurant = restaurantJsonLd(restaurant);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaRestaurant) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <main className="max-w-4xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{restaurant.name} Photos</h1>
        {restaurantCTAButtons()}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {images.map((src, idx) => (
            <img key={idx} src={src} alt={`${restaurant.name} photo ${idx + 1}`} loading="lazy" className="w-full h-64 object-cover rounded-lg" />
          ))}
        </div>
      </main>
    </>
  );
}
