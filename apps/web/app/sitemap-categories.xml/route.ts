import { NextResponse } from 'next/server';
import { fetchRestaurants } from '@/lib/seo/data';
import { slugify } from '@/lib/seo/slug';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export async function GET() {
  const restaurants = await fetchRestaurants(true);
  const set = new Set<string>();
  restaurants.forEach((r) => (r.categories || []).forEach((c) => set.add(slugify(c))));
  const urls = Array.from(set)
    .map(
      (c) => `
    <url>
      <loc>${siteUrl}/categories/${c}</loc>
      <changefreq>weekly</changefreq>
      <priority>0.6</priority>
    </url>`
    )
    .join('');
  const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
}
