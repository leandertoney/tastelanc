import { NextResponse } from 'next/server';
import { fetchRestaurants } from '@/lib/seo/data';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export async function GET() {
  const restaurants = await fetchRestaurants(true);
  const urls = restaurants
    .map(
      (r) => `
    <url>
      <loc>${siteUrl}/restaurants/${r.slug}</loc>
      <lastmod>${r.updated_at || r.created_at}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`
    )
    .join('');
  const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
}
