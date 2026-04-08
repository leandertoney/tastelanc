import { NextResponse } from 'next/server';
import { fetchSpecials, fetchRestaurants } from '@/lib/seo/data';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export async function GET() {
  try {
    const [specials, restaurants] = await Promise.all([fetchSpecials(), fetchRestaurants(true)]);

    // Only include restaurants that actually have active specials
    const restaurantMap = new Map<string, { slug: string; lastmod: string }>();
    for (const s of specials) {
      const r = restaurants.find((x) => x.id === s.restaurant_id);
      if (!r) continue;
      const lastmod = s.updated_at || s.created_at;
      const existing = restaurantMap.get(r.slug);
      if (!existing || lastmod > existing.lastmod) {
        restaurantMap.set(r.slug, { slug: r.slug, lastmod });
      }
    }

    const urls = Array.from(restaurantMap.values())
      .map(({ slug, lastmod }) => `
      <url>
        <loc>${siteUrl}/restaurants/${slug}/specials</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
      </url>`)
      .join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}\n</urlset>`;
    return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  } catch (err) {
    console.error('[sitemap-specials] Error generating sitemap:', err);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>`;
    return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  }
}
