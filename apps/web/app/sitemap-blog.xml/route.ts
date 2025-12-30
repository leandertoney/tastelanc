import { NextResponse } from 'next/server';
import { fetchBlogPosts } from '@/lib/seo/data';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export async function GET() {
  const posts = await fetchBlogPosts();
  const urls = posts
    .map(
      (p) => `
    <url>
      <loc>${siteUrl}/blog/${p.slug}</loc>
      <lastmod>${p.created_at}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.5</priority>
    </url>`
    )
    .join('');
  const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
}
