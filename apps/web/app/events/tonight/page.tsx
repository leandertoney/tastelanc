import { BRAND } from '@/config/market';
import { fetchEventsWithRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 600;

export async function generateMetadata() {
  return buildMeta({
    title: `Events Tonight in ${BRAND.countyShort} | ${BRAND.name}`,
    description: `Tonight's events across ${BRAND.countyShort} restaurants.`,
    url: `${siteUrl}/events/tonight`,
  });
}

export default async function EventsTonight() {
  const items = await fetchEventsWithRestaurants();
  const today = new Date().toISOString().slice(0, 10);
  const tonight = items.filter(({ event }) => event.event_date === today);
  const list = tonight.length ? tonight : items;
  if (!list.length) return <main className="p-8 text-white">No events tonight.</main>;

  const urls = list.filter(({ restaurant }) => restaurant).map(({ restaurant }) => `${siteUrl}/restaurants/${restaurant!.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim('events-tonight');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">Tonight in {BRAND.countyShort}</h1>
        <p className="text-gray-400 mt-2">Live music, trivia, and more happening tonight.</p>
        {restaurantCTAButtons()}
        <div className="space-y-4 mt-6">
          {list.map(({ event, restaurant }) => (
            <a key={event.id} href={`/restaurants/${restaurant?.slug}`} className="block p-4 bg-tastelanc-surface rounded-lg">
              <h2 className="text-xl font-semibold text-white">{event.name}{restaurant ? ` @ ${restaurant.name}` : ''}</h2>
              <p className="text-sm text-gray-400">{event.start_time}{event.end_time ? ` - ${event.end_time}` : ''}</p>
              {event.description && <p className="text-gray-300 text-sm mt-1">{event.description}</p>}
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
