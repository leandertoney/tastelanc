import { BRAND } from '@/config/market';
import { fetchSpecials, fetchRestaurants } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { itemListJsonLd } from '@/lib/seo/structured';
import { AppGateCTA } from '@/components/seo/AppGateCTA';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;
export const revalidate = 1800;

export async function generateMetadata() {
  return buildMeta({
    title: `Restaurant Specials in ${BRAND.countyShort}, ${BRAND.state} | ${BRAND.name}`,
    description: `Browse ${BRAND.countyShort} food and drink specials by day and price.`,
    url: `${siteUrl}/specials`,
  });
}

export default async function SpecialsPage() {
  const [specials, restaurants] = await Promise.all([fetchSpecials(), fetchRestaurants(true)]);
  const items = specials
    .map((s) => ({ s, r: restaurants.find((x) => x.id === s.restaurant_id) }))
    .filter(({ r }) => r);
  if (!items.length) return <main className="p-8 text-white">No specials found.</main>;

  const VISIBLE_COUNT = 6;
  const visible = items.slice(0, VISIBLE_COUNT);
  const blurredPreview = items.slice(VISIBLE_COUNT, VISIBLE_COUNT + 3);
  const hiddenCount = Math.max(0, items.length - VISIBLE_COUNT);

  const urls = visible.map(({ r }) => `${siteUrl}/restaurants/${r!.slug}`);
  const jsonLd = itemListJsonLd(urls);
  const claim = pickClaim('specials');

  function renderCard({ s, r }: (typeof items)[number]) {
    return (
      <a key={s.id} href={`/restaurants/${r!.slug}`} className="block p-4 bg-tastelanc-surface rounded-lg">
        <h2 className="text-xl font-semibold text-white">{r!.name} — {s.name}</h2>
        <p className="text-sm text-gray-400">
          {s.days_of_week?.length ? s.days_of_week.join(', ') : 'Specific dates'} • {s.start_time ?? ''} {s.end_time ? `- ${s.end_time}` : ''}
        </p>
        {s.description && <p className="text-gray-300 text-sm mt-1">{s.description}</p>}
        {(s.special_price || s.original_price) && (
          <p className="text-sm text-gray-300 mt-1">
            {s.special_price ? `$${s.special_price.toFixed(2)}` : ''} {s.original_price ? `(was $${s.original_price.toFixed(2)})` : ''}
          </p>
        )}
      </a>
    );
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">Restaurant Specials</h1>
        <p className="text-gray-400 mt-2">{BRAND.countyShort} food and drink deals by day and price.</p>
        <div className="space-y-4 mt-6">
          {visible.map((item) => renderCard(item))}
        </div>

        {/* Content Gate */}
        <AppGateCTA hiddenCount={hiddenCount} contentType="specials">
          {blurredPreview.length > 0 && (
            <div className="space-y-4">
              {blurredPreview.map((item) => renderCard(item))}
            </div>
          )}
        </AppGateCTA>
      </main>
    </>
  );
}
