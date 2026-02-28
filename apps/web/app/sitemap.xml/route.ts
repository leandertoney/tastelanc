import { NextResponse } from 'next/server';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export async function GET() {
  const lastmod = new Date().toISOString();

  const sitemaps = [
    'sitemap-static.xml',
    'sitemap-restaurants.xml',
    'sitemap-specials.xml',
    'sitemap-happy-hours.xml',
    'sitemap-events.xml',
    'sitemap-categories.xml',
    'sitemap-blog.xml',
    'sitemap-rosie.xml',
    'sitemap-careers.xml',
  ];

  const sitemapEntries = sitemaps
    .map(
      (sitemap) => `
  <sitemap>
    <loc>${siteUrl}/${sitemap}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries}
</sitemapindex>`;

  return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
}
