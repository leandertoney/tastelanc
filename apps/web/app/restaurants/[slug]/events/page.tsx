import { notFound } from 'next/navigation';
import { fetchRestaurantBySlug, fetchEvents } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { breadcrumbJsonLd, eventJsonLd, restaurantJsonLd } from '@/lib/seo/structured';
import PageViewTracker from '@/components/PageViewTracker';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 1800;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const r = await fetchRestaurantBySlug(params.slug);
  if (!r) return buildMeta({ title: 'Events | TasteLanc', description: 'Not found', url: `${siteUrl}/restaurants/${params.slug}/events` });
  return buildMeta({
    title: `${r.name} Events | TasteLanc`,
    description: `Events at ${r.name} in Lancaster.`,
    url: `${siteUrl}/restaurants/${r.slug}/events`,
    image: r.cover_image_url || r.logo_url || undefined,
  });
}

export default async function RestaurantEvents({ params }: { params: { slug: string } }) {
  const restaurant = await fetchRestaurantBySlug(params.slug);
  if (!restaurant) notFound();
  const events = (await fetchEvents()).filter((e) => e.restaurant_id === restaurant.id);
  if (!events.length) notFound();

  const claim = pickClaim(`${restaurant.slug}-events`);
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Restaurants', url: `${siteUrl}/restaurants` },
    { name: restaurant.name, url: `${siteUrl}/restaurants/${restaurant.slug}` },
    { name: 'Events', url: `${siteUrl}/restaurants/${restaurant.slug}/events` },
  ]);
  const schemaRestaurant = restaurantJsonLd(restaurant);
  const schemaEvents = events.map((e) => eventJsonLd(e, restaurant));

  return (
    <>
      <PageViewTracker pagePath={`/restaurants/${restaurant.slug}/events`} pageType="events" restaurantId={restaurant.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaRestaurant) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {schemaEvents.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />
      ))}
      <main className="max-w-4xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{restaurant.name} Events</h1>
        <p className="text-gray-400 mt-1">{restaurant.address}, {restaurant.city}, {restaurant.state}</p>
        {restaurantCTAButtons()}
        <div className="space-y-4 mt-6">
          {events.map((e) => (
            <div key={e.id} className="p-4 bg-tastelanc-surface rounded-lg">
              <h2 className="text-xl font-semibold">{e.name}</h2>
              <p className="text-sm text-gray-400">{(e.event_date || e.days_of_week?.join(', '))} • {e.start_time}{e.end_time ? ` - ${e.end_time}` : ''}</p>
              {e.description && <p className="text-gray-300 text-sm mt-1">{e.description}</p>}
              {e.cover_charge && <p className="text-sm text-gray-300 mt-1">Cover: ${e.cover_charge.toFixed(2)}</p>}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
