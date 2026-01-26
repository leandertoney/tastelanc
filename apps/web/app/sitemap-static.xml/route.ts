import { NextResponse } from 'next/server';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export async function GET() {
  const staticPages = [
    { url: '/', priority: 1.0, changefreq: 'daily' },
    { url: '/restaurants', priority: 0.9, changefreq: 'daily' },
    { url: '/events', priority: 0.9, changefreq: 'daily' },
    { url: '/happy-hours', priority: 0.9, changefreq: 'daily' },
    { url: '/specials', priority: 0.8, changefreq: 'daily' },
    { url: '/categories', priority: 0.8, changefreq: 'weekly' },
    { url: '/blog', priority: 0.7, changefreq: 'weekly' },
    { url: '/trending', priority: 0.7, changefreq: 'daily' },
    { url: '/nightlife', priority: 0.7, changefreq: 'daily' },
    { url: '/date-night', priority: 0.7, changefreq: 'daily' },
    { url: '/open-late', priority: 0.7, changefreq: 'daily' },
    { url: '/this-week', priority: 0.7, changefreq: 'daily' },
    { url: '/best-of-lancaster', priority: 0.7, changefreq: 'weekly' },
    { url: '/events/tonight', priority: 0.7, changefreq: 'daily' },
    { url: '/premium', priority: 0.6, changefreq: 'monthly' },
    { url: '/vote', priority: 0.6, changefreq: 'weekly' },
    { url: '/careers', priority: 0.6, changefreq: 'monthly' },
    { url: '/contact', priority: 0.5, changefreq: 'monthly' },
    { url: '/support', priority: 0.5, changefreq: 'monthly' },
    { url: '/privacy', priority: 0.3, changefreq: 'yearly' },
    { url: '/terms', priority: 0.3, changefreq: 'yearly' },
  ];

  const lastmod = new Date().toISOString();

  const urls = staticPages
    .map(
      (page) => `
  <url>
    <loc>${siteUrl}${page.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
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
