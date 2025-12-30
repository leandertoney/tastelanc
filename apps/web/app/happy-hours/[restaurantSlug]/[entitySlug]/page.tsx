import { fetchRestaurantBySlug, fetchHappyHours, fetchHappyHourItems } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { breadcrumbJsonLd, offerJsonLd, restaurantJsonLd } from '@/lib/seo/structured';
import { slugify } from '@/lib/seo/slug';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 1800;

export async function generateMetadata({ params }: { params: { restaurantSlug: string; entitySlug: string } }) {
  const r = await fetchRestaurantBySlug(params.restaurantSlug);
  if (!r) return buildMeta({ title: 'Happy Hour | TasteLanc', description: 'Not found', url: `${siteUrl}/happy-hours/${params.restaurantSlug}/${params.entitySlug}` });
  return buildMeta({
    title: `${r.name} Happy Hour | TasteLanc`,
    description: `Happy hour at ${r.name} in Lancaster.`,
    url: `${siteUrl}/happy-hours/${r.slug}/${params.entitySlug}`,
    image: r.cover_image_url || r.logo_url || undefined,
  });
}

export default async function HappyHourDetail({ params }: { params: { restaurantSlug: string; entitySlug: string } }) {
  const restaurant = await fetchRestaurantBySlug(params.restaurantSlug);
  if (!restaurant) return <main className="p-8 text-white">Not found</main>;
  const happyHours = (await fetchHappyHours()).filter((h) => h.restaurant_id === restaurant.id);
  const happyHour = happyHours.find((h) => slugify(h.name) === params.entitySlug);
  if (!happyHour) return <main className="p-8 text-white">Not found</main>;
  const items = await fetchHappyHourItems([happyHour.id]);

  const claim = pickClaim(`${restaurant.slug}-hh-${happyHour.id}`);
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Restaurants', url: `${siteUrl}/restaurants` },
    { name: restaurant.name, url: `${siteUrl}/restaurants/${restaurant.slug}` },
    { name: 'Happy Hours', url: `${siteUrl}/restaurants/${restaurant.slug}/happy-hours` },
    { name: happyHour.name, url: `${siteUrl}/happy-hours/${restaurant.slug}/${params.entitySlug}` },
  ]);
  const schemaRestaurant = restaurantJsonLd(restaurant);
  const schemaOffers = items.map((i) => offerJsonLd(i.name, i.price ?? null, restaurant));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaRestaurant) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {schemaOffers.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOffers) }} />
      )}
      <main className="max-w-4xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{happyHour.name}</h1>
        <p className="text-gray-400 mt-1">At <a className="text-tastelanc-accent" href={`/restaurants/${restaurant.slug}`}>{restaurant.name}</a></p>
        {restaurantCTAButtons()}
        <div className="mt-4 p-4 bg-tastelanc-surface rounded-lg space-y-2">
          <p className="text-sm text-gray-400">{happyHour.days_of_week.join(', ')} • {happyHour.start_time} - {happyHour.end_time}</p>
          {happyHour.description && <p className="text-gray-300 text-sm">{happyHour.description}</p>}
          <ul className="text-sm text-gray-300 mt-2 space-y-1">
            {items.map((i) => (
              <li key={i.id}>- {i.name} {i.description ? `• ${i.description}` : ''} {i.price ? `• $${i.price.toFixed(2)}` : ''}</li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
