import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/careers/markets
 *
 * Returns expansion cities that have posted job listings,
 * for the cross-market links on the main /careers page.
 */
export async function GET() {
  try {
    const serviceClient = createServiceRoleClient();

    // Get cities with posted/approved jobs
    const { data: jobs } = await serviceClient
      .from('expansion_job_listings')
      .select('city_id')
      .in('status', ['approved', 'posted']);

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ markets: [] });
    }

    const cityIds = Array.from(new Set(jobs.map(j => j.city_id)));

    // Fetch city details
    const { data: cities } = await serviceClient
      .from('expansion_cities')
      .select('id, city_name, state, slug')
      .in('id', cityIds)
      .in('status', ['brand_ready', 'approved', 'setup_in_progress', 'live']);

    if (!cities || cities.length === 0) {
      return NextResponse.json({ markets: [] });
    }

    // Fetch selected brand names
    const markets = await Promise.all(
      cities.map(async (city) => {
        const { data: brand } = await serviceClient
          .from('expansion_brand_drafts')
          .select('app_name')
          .eq('city_id', city.id)
          .eq('is_selected', true)
          .single();

        return {
          slug: city.slug,
          city_name: city.city_name,
          state: city.state,
          brand_name: brand?.app_name || null,
        };
      })
    );

    return NextResponse.json({ markets });
  } catch (error) {
    console.error('Error fetching career markets:', error);
    return NextResponse.json({ markets: [] });
  }
}
