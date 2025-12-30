import { NextResponse } from 'next/server';
import { fetchSpecials, fetchRestaurants } from '@/lib/seo/data';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export async function GET() {
  const [specials, restaurants] = await Promise.all([fetchSpecials(), fetchRestaurants(true)]);
  const urls = specials
    .map((s) => {
      const r = restaurants.find((x) => x.id === s.restaurant_id);
      if (!r) return '';
      return `
      <url>
        <loc>${siteUrl}/restaurants/${r.slug}/specials</loc>
        <lastmod>${s.updated_at || s.created_at}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
      </url>`;
    })
    .join('');
  const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
}
