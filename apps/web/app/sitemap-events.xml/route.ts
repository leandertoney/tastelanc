import { NextResponse } from 'next/server';
import { fetchEvents, fetchRestaurants } from '@/lib/seo/data';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export async function GET() {
  const [events, restaurants] = await Promise.all([fetchEvents(), fetchRestaurants(true)]);
  const urls = events
    .map((e) => {
      const r = restaurants.find((x) => x.id === e.restaurant_id);
      if (!r) return '';
      return `
      <url>
        <loc>${siteUrl}/restaurants/${r.slug}/events</loc>
        <lastmod>${e.updated_at || e.created_at}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
      </url>`;
    })
    .join('');
  const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
}
