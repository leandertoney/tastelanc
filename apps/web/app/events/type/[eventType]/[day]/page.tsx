import { fetchEventsWithRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';
import { notFound } from 'next/navigation';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
export const revalidate = 1200;

export async function generateMetadata({ params }: { params: { eventType: string; day: string } }) {
  return buildMeta({
    title: `${params.eventType.replace(/-/g, ' ')} on ${params.day} in Lancaster | TasteLanc`,
    description: `Find ${params.eventType.replace(/-/g, ' ')} events on ${params.day} in Lancaster.`,
    url: `${siteUrl}/events/type/${params.eventType}/${params.day}`,
  });
}

export default async function EventsByTypeDay({ params }: { params: { eventType: string; day: string } }) {
  const day = params.day.toLowerCase();
  if (!DAYS.includes(day)) notFound();
  const type = params.eventType.toLowerCase().replace(/-/g, ' ');
  const items = await fetchEventsWithRestaurants();
  const filtered = items.filter(({ event }) => event.event_type?.toLowerCase() === type && (event.days_of_week || []).includes(day as any));
  if (!filtered.length) notFound();

  const urls = filtered
    .filter(({ restaurant }) => restaurant)
    .map(({ restaurant }) => `${siteUrl}/restaurants/${restaurant!.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim(`events-${type}-${day}`);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{type} on {day}</h1>
        <p className="text-gray-400 mt-2">Events by type and day across Lancaster.</p>
        {restaurantCTAButtons()}
        <div className="space-y-4 mt-6">
          {filtered.map(({ event, restaurant }) => (
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
