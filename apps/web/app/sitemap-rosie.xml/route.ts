import { NextResponse } from 'next/server';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

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
  const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
}
