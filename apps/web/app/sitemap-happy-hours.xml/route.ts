import { NextResponse } from 'next/server';
import { fetchHappyHours, fetchRestaurants } from '@/lib/seo/data';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export async function GET() {
  const [hh, restaurants] = await Promise.all([fetchHappyHours(), fetchRestaurants(true)]);

  // Deduplicate by restaurant slug and track the most recent update
  const restaurantMap = new Map<string, { slug: string; lastmod: string }>();
  for (const h of hh) {
    const r = restaurants.find((x) => x.id === h.restaurant_id);
    if (!r) continue;
    const lastmod = h.updated_at || h.created_at;
    const existing = restaurantMap.get(r.slug);
    if (!existing || lastmod > existing.lastmod) {
      restaurantMap.set(r.slug, { slug: r.slug, lastmod });
    }
  }

  const urls = Array.from(restaurantMap.values())
    .map(({ slug, lastmod }) => `
      <url>
        <loc>${siteUrl}/restaurants/${slug}/happy-hours</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
      </url>`)
    .join('');
  const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
}
