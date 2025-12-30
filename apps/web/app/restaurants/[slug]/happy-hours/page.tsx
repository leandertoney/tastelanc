import { fetchRestaurantBySlug, fetchHappyHours, fetchHappyHourItems } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { breadcrumbJsonLd, offerJsonLd, restaurantJsonLd } from '@/lib/seo/structured';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 1800;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const r = await fetchRestaurantBySlug(params.slug);
  if (!r) return buildMeta({ title: 'Happy Hours | TasteLanc', description: 'Not found', url: `${siteUrl}/restaurants/${params.slug}/happy-hours` });
  return buildMeta({
    title: `${r.name} Happy Hours | TasteLanc`,
    description: `Happy hour times and deals at ${r.name} in Lancaster.`,
    url: `${siteUrl}/restaurants/${r.slug}/happy-hours`,
    image: r.cover_image_url || r.logo_url || undefined,
  });
}

export default async function RestaurantHappyHours({ params }: { params: { slug: string } }) {
  const restaurant = await fetchRestaurantBySlug(params.slug);
  if (!restaurant) return <main className="p-8 text-white">Not found</main>;

  const hh = (await fetchHappyHours()).filter((h) => h.restaurant_id === restaurant.id);
  if (!hh.length) return <main className="p-8 text-white">No happy hours for this restaurant.</main>;

  const hhItems = await fetchHappyHourItems(hh.map((h) => h.id));
  const claim = pickClaim(`${restaurant.slug}-hh`);
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Restaurants', url: `${siteUrl}/restaurants` },
    { name: restaurant.name, url: `${siteUrl}/restaurants/${restaurant.slug}` },
    { name: 'Happy Hours', url: `${siteUrl}/restaurants/${restaurant.slug}/happy-hours` },
  ]);
  const schemaRestaurant = restaurantJsonLd(restaurant);
  const schemaOffers = hhItems.map((i) => offerJsonLd(i.name, i.price ?? null, restaurant));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaRestaurant) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {schemaOffers.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOffers) }} />
      )}
      <main className="max-w-4xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{restaurant.name} Happy Hours</h1>
        <p className="text-gray-400 mt-1">{restaurant.address}, {restaurant.city}, {restaurant.state}</p>
        {restaurantCTAButtons()}
        <div className="space-y-4 mt-6">
          {hh.map((h) => (
            <div key={h.id} className="p-4 bg-tastelanc-surface rounded-lg">
              <h2 className="text-xl font-semibold">{h.name}</h2>
              <p className="text-sm text-gray-400">{h.days_of_week.join(', ')} • {h.start_time} - {h.end_time}</p>
              {h.description && <p className="text-gray-300 text-sm mt-1">{h.description}</p>}
              <ul className="text-sm text-gray-300 mt-2 space-y-1">
                {hhItems.filter((i) => i.happy_hour_id === h.id).map((i) => (
                  <li key={i.id}>- {i.name} {i.description ? `• ${i.description}` : ''} {i.price ? `• $${i.price.toFixed(2)}` : ''}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
