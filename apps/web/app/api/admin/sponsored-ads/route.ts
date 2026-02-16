import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    let admin;
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

    const serviceClient = createServiceRoleClient();
    const range = request.nextUrl.searchParams.get('range') || 'all';

    // Calculate date cutoff
    let dateCutoff: string | null = null;
    if (range === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      dateCutoff = d.toISOString().split('T')[0];
    } else if (range === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      dateCutoff = d.toISOString().split('T')[0];
    }

    // Fetch all featured ads
    const { data: ads, error: adsError } = await serviceClient
      .from('featured_ads')
      .select('*')
      .order('priority', { ascending: false });

    if (adsError) {
      console.error('Error fetching ads:', adsError);
      return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 });
    }

    // Fetch performance summary from the view
    let performanceQuery = serviceClient
      .from('ad_performance_summary')
      .select('*');
    if (dateCutoff) {
      performanceQuery = performanceQuery.gte('event_date', dateCutoff);
    }
    const { data: performance, error: perfError } = await performanceQuery;

    if (perfError) {
      console.error('Error fetching performance:', perfError);
    }

    // Sparkline cutoff (always last 7 days regardless of range filter)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sparklineCutoff = sevenDaysAgo.toISOString().split('T')[0];

    // Group performance by ad_id
    const adPerformance: Record<string, {
      impressions: number;
      unique_impressions: number;
      clicks: number;
      daily: Array<{ date: string; impressions: number }>;
    }> = {};

    (performance || []).forEach((row: {
      ad_id: string;
      impressions: number;
      unique_impressions: number;
      clicks: number;
      event_date: string;
    }) => {
      if (!adPerformance[row.ad_id]) {
        adPerformance[row.ad_id] = {
          impressions: 0,
          unique_impressions: 0,
          clicks: 0,
          daily: [],
        };
      }
      const entry = adPerformance[row.ad_id];
      entry.impressions += Number(row.impressions);
      entry.unique_impressions += Number(row.unique_impressions);
      entry.clicks += Number(row.clicks);

      if (row.event_date >= sparklineCutoff) {
        entry.daily.push({
          date: row.event_date,
          impressions: Number(row.impressions),
        });
      }
    });

    // Calculate totals
    let totalImpressions = 0;
    let totalUniqueImpressions = 0;
    let totalClicks = 0;
    Object.values(adPerformance).forEach((p) => {
      totalImpressions += p.impressions;
      totalUniqueImpressions += p.unique_impressions;
      totalClicks += p.clicks;
    });
    const overallCtr = totalImpressions > 0
      ? Math.round((totalClicks / totalImpressions) * 10000) / 100
      : 0;

    return NextResponse.json({
      ads: ads || [],
      adPerformance,
      totals: {
        impressions: totalImpressions,
        uniqueImpressions: totalUniqueImpressions,
        clicks: totalClicks,
        ctr: overallCtr,
      },
    });
  } catch (error) {
    console.error('Error fetching sponsored ads data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
