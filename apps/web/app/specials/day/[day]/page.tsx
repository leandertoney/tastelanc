import { fetchSpecials, fetchRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
export const revalidate = 900;

export async function generateMetadata({ params }: { params: { day: string } }) {
  return buildMeta({
    title: `Specials on ${params.day} in Lancaster | TasteLanc`,
    description: `Find ${params.day} restaurant specials in Lancaster, PA.`,
    url: `${siteUrl}/specials/day/${params.day}`,
  });
}

export default async function SpecialsByDay({ params }: { params: { day: string } }) {
  const day = params.day.toLowerCase();
  if (!DAYS.includes(day)) return <main className="p-8 text-white">Not found</main>;
  const [specials, restaurants] = await Promise.all([fetchSpecials(), fetchRestaurants(true)]);
  const filtered = specials
    .filter((s) => (s.days_of_week || []).includes(day as any))
    .map((s) => ({ s, r: restaurants.find((x) => x.id === s.restaurant_id) }))
    .filter(({ r }) => r);
  if (!filtered.length) return <main className="p-8 text-white">No specials found.</main>;

  const urls = filtered.map(({ r }) => `${siteUrl}/restaurants/${r!.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim(`specials-${day}`);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">Specials on {day}</h1>
        <p className="text-gray-400 mt-2">Food and drink deals on {day} in Lancaster.</p>
        {restaurantCTAButtons()}
        <div className="space-y-4 mt-6">
          {filtered.map(({ s, r }) => (
            <a key={s.id} href={`/restaurants/${r!.slug}`} className="block p-4 bg-tastelanc-surface rounded-lg">
              <h2 className="text-xl font-semibold text-white">{r!.name} — {s.name}</h2>
              <p className="text-sm text-gray-400">{s.start_time ?? ''} {s.end_time ? `- ${s.end_time}` : ''}</p>
              {s.description && <p className="text-gray-300 text-sm mt-1">{s.description}</p>}
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
