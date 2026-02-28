/**
 * Careers Sitemap
 *
 * Generates sitemap entries for the main /careers page and
 * all market-specific careers pages with posted job listings.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Regenerate every hour

import { createServiceRoleClient } from '@/lib/supabase/server';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export async function GET() {
  const supabase = createServiceRoleClient();
  const lastmod = new Date().toISOString();

  // Fetch expansion cities with posted/approved jobs
  const { data: cities } = await supabase
    .from('expansion_cities')
    .select('slug, updated_at')
    .in('status', ['brand_ready', 'approved', 'setup_in_progress', 'live']);

  // Filter to only cities that have posted job listings
  const citySlugs: { slug: string; updated_at: string }[] = [];
  if (cities && cities.length > 0) {
    const { data: jobCities } = await supabase
      .from('expansion_job_listings')
      .select('city_id, expansion_cities!inner(slug, updated_at)')
      .in('status', ['approved', 'posted']);

    const slugSet = new Set<string>();
    for (const j of jobCities || []) {
      const city = (j as any).expansion_cities;
      if (city?.slug && !slugSet.has(city.slug)) {
        slugSet.add(city.slug);
        citySlugs.push({ slug: city.slug, updated_at: city.updated_at || lastmod });
      }
    }
  }

  const entries = [
    // Main careers page
    `
  <url>
    <loc>${siteUrl}/careers</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
    // Market-specific careers pages
    ...citySlugs.map(
      (c) => `
  <url>
    <loc>${siteUrl}/careers/${c.slug}</loc>
    <lastmod>${c.updated_at || lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  });
}
