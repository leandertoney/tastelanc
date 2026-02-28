/**
 * Indeed XML Job Feed
 *
 * Outputs an Indeed-compatible XML feed of all posted job listings
 * across expansion markets. Submit this feed URL to Indeed's Employer
 * Portal once — Indeed polls it automatically after that.
 *
 * URL: https://tastelanc.com/api/jobs/feed.xml
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServiceRoleClient();

  // Fetch all posted job listings with city and selected brand data
  const { data: jobs, error } = await supabase
    .from('expansion_job_listings')
    .select(`
      id, title, description, compensation_summary, location, employment_type,
      salary_min, salary_max, salary_unit, posted_at, valid_through, role_type,
      expansion_cities!inner (
        id, city_name, state, county, slug
      )
    `)
    .in('status', ['approved', 'posted'])
    .order('posted_at', { ascending: false });

  if (error) {
    console.error('[jobs-feed] Error fetching jobs:', error);
    return new Response('<?xml version="1.0" encoding="utf-8"?><source></source>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  // Fetch selected brands for each city to get app names
  const cityIds = Array.from(new Set((jobs || []).map((j: any) => j.expansion_cities?.id).filter(Boolean)));
  const { data: brands } = cityIds.length > 0
    ? await supabase
        .from('expansion_brand_drafts')
        .select('city_id, app_name')
        .in('city_id', cityIds)
        .eq('is_selected', true)
    : { data: [] };

  const brandMap = new Map((brands || []).map((b: any) => [b.city_id, b.app_name]));

  const now = new Date().toUTCString();

  // Build job entries
  const jobEntries = (jobs || []).map((job: any) => {
    const city = job.expansion_cities;
    if (!city) return '';

    const appName = brandMap.get(city.id) || `Taste${city.city_name}`;
    const slug = city.slug;
    const applyUrl = `https://tastelanc.com/careers/${slug}#apply`;

    const postedDate = job.posted_at
      ? new Date(job.posted_at).toUTCString()
      : now;

    const salary = job.compensation_summary || 'Commission-based ($2,000-$8,000+/month)';

    const jobType = job.employment_type === 'FULL_TIME' ? 'Full-time'
      : job.employment_type === 'PART_TIME' ? 'Part-time'
      : 'Contract';

    return `
  <job>
    <title><![CDATA[${job.title}]]></title>
    <date>${postedDate}</date>
    <referencenumber>${job.id}</referencenumber>
    <url><![CDATA[${applyUrl}]]></url>
    <company><![CDATA[${appName}]]></company>
    <city><![CDATA[${city.city_name}]]></city>
    <state>${city.state}</state>
    <country>US</country>
    <description><![CDATA[${job.description}]]></description>
    <salary><![CDATA[${salary}]]></salary>
    <jobtype>${jobType}</jobtype>
  </job>`;
  }).filter(Boolean);

  // Also include the main Lancaster RPM listing
  const lancasterJob = `
  <job>
    <title><![CDATA[Restaurant Partnership Manager - Lancaster, PA]]></title>
    <date>${now}</date>
    <referencenumber>tastelanc-rpm-lancaster</referencenumber>
    <url><![CDATA[https://tastelanc.com/careers#apply]]></url>
    <company><![CDATA[TasteLanc]]></company>
    <city><![CDATA[Lancaster]]></city>
    <state>PA</state>
    <country>US</country>
    <description><![CDATA[Join TasteLanc as a Restaurant Partnership Manager in Lancaster, PA. Build relationships with local restaurants, onboard them onto the TasteLanc platform, and earn commission-based income with uncapped potential. Flexible schedule, in-person role. 100% commission-based with tiered earnings (15-20%). No cap on earnings.]]></description>
    <salary><![CDATA[Commission-based ($2,000-$8,000+/month)]]></salary>
    <jobtype>Contract</jobtype>
  </job>`;

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<source>
  <publisher>TasteLanc</publisher>
  <publisherurl>https://tastelanc.com</publisherurl>
  <lastBuildDate>${now}</lastBuildDate>${lancasterJob}${jobEntries.join('')}
</source>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}
