import { fetchRestaurantBySlug, fetchSpecials } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { breadcrumbJsonLd, offerJsonLd, restaurantJsonLd } from '@/lib/seo/structured';
import { slugify } from '@/lib/seo/slug';
import { notFound } from 'next/navigation';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 1800;

export async function generateMetadata({ params }: { params: { restaurantSlug: string; entitySlug: string } }) {
  const r = await fetchRestaurantBySlug(params.restaurantSlug);
  if (!r) return buildMeta({ title: 'Special | TasteLanc', description: 'Not found', url: `${siteUrl}/specials/${params.restaurantSlug}/${params.entitySlug}` });
  return buildMeta({
    title: `${r.name} Special | TasteLanc`,
    description: `Specials at ${r.name} in Lancaster.`,
    url: `${siteUrl}/specials/${r.slug}/${params.entitySlug}`,
    image: r.cover_image_url || r.logo_url || undefined,
  });
}

export default async function SpecialDetail({ params }: { params: { restaurantSlug: string; entitySlug: string } }) {
  const restaurant = await fetchRestaurantBySlug(params.restaurantSlug);
  if (!restaurant) notFound();
  const specials = (await fetchSpecials()).filter((s) => s.restaurant_id === restaurant.id);
  const special = specials.find((s) => slugify(s.name) === params.entitySlug);
  if (!special) notFound();

  const claim = pickClaim(`${restaurant.slug}-special-${special.id}`);
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Restaurants', url: `${siteUrl}/restaurants` },
    { name: restaurant.name, url: `${siteUrl}/restaurants/${restaurant.slug}` },
    { name: 'Specials', url: `${siteUrl}/restaurants/${restaurant.slug}/specials` },
    { name: special.name, url: `${siteUrl}/specials/${restaurant.slug}/${params.entitySlug}` },
  ]);
  const schemaRestaurant = restaurantJsonLd(restaurant);
  const schemaOffer = offerJsonLd(special.name, special.special_price ?? special.original_price, restaurant);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaRestaurant) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOffer) }} />
      <main className="max-w-4xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{special.name}</h1>
        <p className="text-gray-400 mt-1">At <a className="text-tastelanc-accent" href={`/restaurants/${restaurant.slug}`}>{restaurant.name}</a></p>
        {restaurantCTAButtons()}
        <div className="mt-4 p-4 bg-tastelanc-surface rounded-lg space-y-2">
          <p className="text-sm text-gray-400">
            {special.days_of_week?.length ? special.days_of_week.join(', ') : 'Specific dates'} • {special.start_time ?? ''} {special.end_time ? `- ${special.end_time}` : ''}
          </p>
          {special.description && <p className="text-gray-300 text-sm">{special.description}</p>}
          {(special.special_price || special.original_price) && (
            <p className="text-sm text-gray-300">
              {special.special_price ? `$${special.special_price.toFixed(2)}` : ''} {special.original_price ? `(was $${special.original_price.toFixed(2)})` : ''}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
