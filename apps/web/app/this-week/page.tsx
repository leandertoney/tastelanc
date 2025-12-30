import { fetchEventsWithRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 900;

export async function generateMetadata() {
  return buildMeta({
    title: 'This Week in Lancaster | TasteLanc',
    description: 'Events and specials happening this week in Lancaster.',
    url: `${siteUrl}/this-week`,
  });
}

export default async function ThisWeekPage() {
  const now = new Date();
  const weekAhead = new Date();
  weekAhead.setDate(now.getDate() + 7);
  const items = await fetchEventsWithRestaurants();
  const withinWeek = items.filter(({ event }) => {
    if (!event.event_date) return false;
    const d = new Date(event.event_date);
    return d >= now && d <= weekAhead;
  });
  const list = withinWeek.length ? withinWeek : items;
  if (!list.length) return <main className="p-8 text-white">No events this week.</main>;

  const urls = list.filter(({ restaurant }) => restaurant).map(({ restaurant }) => `${siteUrl}/restaurants/${restaurant!.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim('this-week');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">This Week in Lancaster</h1>
        <p className="text-gray-400 mt-2">What’s happening around Lancaster this week.</p>
        {restaurantCTAButtons()}
        <div className="space-y-4 mt-6">
          {list.map(({ event, restaurant }) => (
            <a key={event.id} href={`/restaurants/${restaurant?.slug}`} className="block p-4 bg-tastelanc-surface rounded-lg">
              <h2 className="text-xl font-semibold text-white">{event.name}{restaurant ? ` @ ${restaurant.name}` : ''}</h2>
              <p className="text-sm text-gray-400">{(event.event_date || event.days_of_week?.join(', '))} • {event.start_time}{event.end_time ? ` - ${event.end_time}` : ''}</p>
              {event.description && <p className="text-gray-300 text-sm mt-1">{event.description}</p>}
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
