import { NextResponse } from 'next/server';
import { BRAND } from '@/config/market';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

export async function GET() {
  const rosieRoutes = [
    `${siteUrl}/rosie/recommends/today`,
    `${siteUrl}/rosie/happy-hours-tonight`,
    `${siteUrl}/rosie/for/date-night`,
  ];
  const urls = rosieRoutes
    .map(
      (u) => `
    <url>
      <loc>${u}</loc>
      <changefreq>daily</changefreq>
      <priority>0.5</priority>
    </url>`
    )
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}\n</urlset>`;
  return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
}
