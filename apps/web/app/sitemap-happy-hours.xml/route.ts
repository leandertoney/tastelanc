import { NextResponse } from 'next/server';
import { fetchHappyHours, fetchRestaurants } from '@/lib/seo/data';
import { BRAND } from '@/config/market';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

export async function GET() {
  try {
    const [hh, restaurants] = await Promise.all([fetchHappyHours(), fetchRestaurants(true)]);

    // Only include restaurants that actually have active happy hours
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
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}\n</urlset>`;
    return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  } catch (err) {
    console.error('[sitemap-happy-hours] Error generating sitemap:', err);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>`;
    return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  }
}
