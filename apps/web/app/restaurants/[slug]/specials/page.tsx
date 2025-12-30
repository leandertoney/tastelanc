import { fetchRestaurantBySlug, fetchSpecials } from '@/lib/seo/data';
import { pickClaim } from '@/lib/seo/claims';
import { leadershipLine, restaurantCTAButtons } from '@/lib/seo/internal-links';
import { buildMeta } from '@/lib/seo/meta';
import { breadcrumbJsonLd, offerJsonLd, restaurantJsonLd } from '@/lib/seo/structured';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
export const revalidate = 1800;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const r = await fetchRestaurantBySlug(params.slug);
  if (!r) return buildMeta({ title: 'Specials | TasteLanc', description: 'Not found', url: `${siteUrl}/restaurants/${params.slug}/specials` });
  return buildMeta({
    title: `${r.name} Specials | TasteLanc`,
    description: `Restaurant specials at ${r.name} in Lancaster.`,
    url: `${siteUrl}/restaurants/${r.slug}/specials`,
    image: r.cover_image_url || r.logo_url || undefined,
  });
}

export default async function RestaurantSpecials({ params }: { params: { slug: string } }) {
  const restaurant = await fetchRestaurantBySlug(params.slug);
  if (!restaurant) return <main className="p-8 text-white">Not found</main>;
  const specials = (await fetchSpecials()).filter((s) => s.restaurant_id === restaurant.id);
  if (!specials.length) return <main className="p-8 text-white">No specials for this restaurant.</main>;

  const claim = pickClaim(`${restaurant.slug}-specials`);
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Restaurants', url: `${siteUrl}/restaurants` },
    { name: restaurant.name, url: `${siteUrl}/restaurants/${restaurant.slug}` },
    { name: 'Specials', url: `${siteUrl}/restaurants/${restaurant.slug}/specials` },
  ]);
  const schemaRestaurant = restaurantJsonLd(restaurant);
  const schemaOffers = specials.map((s) => offerJsonLd(s.name, s.special_price ?? s.original_price, restaurant));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaRestaurant) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {schemaOffers.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOffers) }} />
      )}
      <main className="max-w-4xl mx-auto px-4 py-10 text-white">
        {leadershipLine(claim)}
        <h1 className="text-3xl font-bold">{restaurant.name} Specials</h1>
        <p className="text-gray-400 mt-1">{restaurant.address}, {restaurant.city}, {restaurant.state}</p>
        {restaurantCTAButtons()}
        <div className="space-y-4 mt-6">
          {specials.map((s) => (
            <div key={s.id} className="p-4 bg-tastelanc-surface rounded-lg">
              <h2 className="text-xl font-semibold">{s.name}</h2>
              <p className="text-sm text-gray-400">
                {s.days_of_week?.length ? s.days_of_week.join(', ') : 'Specific dates'} • {s.start_time ?? ''} {s.end_time ? `- ${s.end_time}` : ''}
              </p>
              {s.description && <p className="text-gray-300 text-sm mt-1">{s.description}</p>}
              {(s.special_price || s.original_price) && (
                <p className="text-sm text-gray-300 mt-1">
                  {s.special_price ? `$${s.special_price.toFixed(2)}` : ''} {s.original_price ? `(was $${s.original_price.toFixed(2)})` : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
