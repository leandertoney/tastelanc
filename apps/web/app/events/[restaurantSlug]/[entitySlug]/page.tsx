import { BRAND } from '@/config/market';
import { fetchRestaurantBySlug, fetchEvents } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { breadcrumbJsonLd, eventJsonLd, restaurantJsonLd } from '@/lib/seo/structured';
import { slugify } from '@/lib/seo/slug';
import { notFound } from 'next/navigation';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 900;

export async function generateMetadata({ params }: { params: { restaurantSlug: string; entitySlug: string } }) {
  const r = await fetchRestaurantBySlug(params.restaurantSlug);
  if (!r) return buildMeta({ title: `Event | ${BRAND.name}`, description: 'Not found', url: `${siteUrl}/events/${params.restaurantSlug}/${params.entitySlug}` });
  return buildMeta({
    title: `${r.name} Event | ${BRAND.name}`,
    description: `Events at ${r.name} in ${BRAND.countyShort}.`,
    url: `${siteUrl}/events/${r.slug}/${params.entitySlug}`,
    image: r.cover_image_url || r.logo_url || undefined,
  });
}

export default async function EventDetail({ params }: { params: { restaurantSlug: string; entitySlug: string } }) {
  const restaurant = await fetchRestaurantBySlug(params.restaurantSlug);
  if (!restaurant) notFound();
  const events = (await fetchEvents()).filter((e) => e.restaurant_id === restaurant.id);
  const event = events.find((e) => slugify(e.name) === params.entitySlug);
  if (!event) notFound();

  const claim = pickClaim(`${restaurant.slug}-event-${event.id}`);
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Events', url: `${siteUrl}/events` },
    { name: restaurant.name, url: `${siteUrl}/restaurants/${restaurant.slug}` },
    { name: event.name, url: `${siteUrl}/events/${restaurant.slug}/${params.entitySlug}` },
  ]);
  const schemaRestaurant = restaurantJsonLd(restaurant);
  const schemaEvent = eventJsonLd(event, restaurant);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaRestaurant) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaEvent) }} />
      <main className="max-w-4xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{event.name}</h1>
        <p className="text-gray-400 mt-1">At <a className="text-tastelanc-accent" href={`/restaurants/${restaurant.slug}`}>{restaurant.name}</a></p>
        {restaurantCTAButtons()}
        <div className="mt-4 p-4 bg-tastelanc-surface rounded-lg space-y-2">
          <p className="text-sm text-gray-400">{(event.event_date || event.days_of_week?.join(', '))} • {event.start_time}{event.end_time ? ` - ${event.end_time}` : ''}</p>
          {event.description && <p className="text-gray-300 text-sm">{event.description}</p>}
          {event.cover_charge && <p className="text-sm text-gray-300">Cover: ${event.cover_charge.toFixed(2)}</p>}
        </div>
      </main>
    </>
  );
}
