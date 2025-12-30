import { NextResponse } from 'next/server';
import { fetchHappyHours, fetchRestaurants } from '@/lib/seo/data';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export async function GET() {
  const [hh, restaurants] = await Promise.all([fetchHappyHours(), fetchRestaurants(true)]);
  const urls = hh
    .map((h) => {
      const r = restaurants.find((x) => x.id === h.restaurant_id);
      if (!r) return '';
      return `
      <url>
        <loc>${siteUrl}/restaurants/${r.slug}/happy-hours</loc>
        <lastmod>${h.updated_at || h.created_at}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
      </url>`;
    })
    .join('');
  const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
}
