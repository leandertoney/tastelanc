import { fetchHappyHours, fetchHappyHourItems, fetchRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';
import { notFound } from 'next/navigation';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
export const revalidate = 900;

export async function generateMetadata({ params }: { params: { day: string } }) {
  return buildMeta({
    title: `Happy Hours on ${params.day} in Lancaster | TasteLanc`,
    description: `Find ${params.day} happy hours in Lancaster, PA.`,
    url: `${siteUrl}/happy-hours/day/${params.day}`,
  });
}

export default async function HappyHoursByDay({ params }: { params: { day: string } }) {
  const day = params.day.toLowerCase();
  if (!DAYS.includes(day)) notFound();
  const [hh, restaurants] = await Promise.all([fetchHappyHours(), fetchRestaurants(true)]);
  const hhItems = await fetchHappyHourItems(hh.map((h) => h.id));
  const filtered = hh
    .filter((h) => (h.days_of_week || []).includes(day as any))
    .map((h) => ({ h, r: restaurants.find((x) => x.id === h.restaurant_id) }))
    .filter(({ r }) => r);
  if (!filtered.length) notFound();

  const urls = filtered.map(({ r }) => `${siteUrl}/restaurants/${r!.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim(`happy-hours-${day}`);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">Happy Hours on {day}</h1>
        <p className="text-gray-400 mt-2">Lancaster happy hours on {day}.</p>
        {restaurantCTAButtons()}
        <div className="space-y-4 mt-6">
          {filtered.map(({ h, r }) => (
            <a key={h.id} href={`/restaurants/${r!.slug}`} className="block p-4 bg-tastelanc-surface rounded-lg">
              <h2 className="text-xl font-semibold text-white">{r!.name} — {h.name}</h2>
              <p className="text-sm text-gray-400">{h.start_time} - {h.end_time}</p>
              {h.description && <p className="text-gray-300 text-sm mt-1">{h.description}</p>}
              <ul className="text-sm text-gray-300 mt-2 space-y-1">
                {hhItems.filter((i) => i.happy_hour_id === h.id).map((i) => (
                  <li key={i.id}>- {i.name} {i.description ? `• ${i.description}` : ''} {i.price ? `• $${i.price.toFixed(2)}` : ''}</li>
                ))}
              </ul>
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
