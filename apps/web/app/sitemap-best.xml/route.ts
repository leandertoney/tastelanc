import { NextResponse } from 'next/server';
import { getAllLandingPageSlugs } from '@/lib/seo/landing-pages';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export async function GET() {
  const slugs = getAllLandingPageSlugs();
  const lastmod = new Date().toISOString();

  const urls = slugs
    .map(
      (slug) => `
  <url>
    <loc>${siteUrl}/best/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  });
}
