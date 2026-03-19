import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';

type Period = 'today' | '7d' | '30d' | 'all';

function getDateRange(period: Period): { start: Date | null; prevStart: Date | null; prevEnd: Date | null } {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today': {
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      return { start: todayStart, prevStart: yesterdayStart, prevEnd: todayStart };
    }
    case '7d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      return { start, prevStart, prevEnd: start };
    }
    case '30d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 30);
      return { start, prevStart, prevEnd: start };
    }
    case 'all':
      return { start: null, prevStart: null, prevEnd: null };
  }
}

export async function GET(request: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const admin = await verifyAdminAccess(supabase);
    const serviceClient = createServiceRoleClient();

    // Parse query params
    const url = new URL(request.url);
    const period = (url.searchParams.get('period') || 'today') as Period;
    const marketParam = url.searchParams.get('market') || 'all';

    // Determine market filter
    let marketFilter: string | null = null;
    if (marketParam !== 'all') {
      marketFilter = marketParam;
    } else if (admin.scopedMarketIds) {
      // market_admin scoped to specific markets — use first one as default
      marketFilter = admin.scopedMarketIds[0] || null;
    }

    const { start, prevStart, prevEnd } = getDateRange(period);

    // ============================================================
    // 1. Active Now (always from raw table — last 5 minutes)
    // ============================================================
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    let activeNowQuery = serviceClient
      .from('analytics_page_views')
      .select('visitor_id', { count: 'exact', head: false })
      .gte('viewed_at', fiveMinAgo);
    if (marketFilter) activeNowQuery = activeNowQuery.eq('market_id', marketFilter);
    const activeNowResult = await activeNowQuery;
    const activeVisitorIds = new Set(activeNowResult.data?.map((r: { visitor_id: string }) => r.visitor_id) || []);
    const activeNow = activeVisitorIds.size;

    // ============================================================
    // For "today" period: query raw analytics_page_views
    // For 7d/30d/all: query rollup tables
    // ============================================================

    if (period === 'today' || period === 'all') {
      // Refresh today's rollup
      await serviceClient.rpc('rollup_analytics_daily', {
        target_date: new Date().toISOString().split('T')[0],
        target_market: marketFilter,
      });
    }

    // Helper to build queries with date + market filters
    const buildPageViewQuery = (startDate: Date | null, endDate?: Date | null) => {
      let q = serviceClient.from('analytics_page_views').select('*');
      if (startDate) q = q.gte('viewed_at', startDate.toISOString());
      if (endDate) q = q.lt('viewed_at', endDate.toISOString());
      if (marketFilter) q = q.eq('market_id', marketFilter);
      return q;
    };

    // ============================================================
    // 2. Core metrics from rollups
    // ============================================================
    let rollupQuery = serviceClient.from('analytics_daily_rollups').select('*');
    if (start) rollupQuery = rollupQuery.gte('date', start.toISOString().split('T')[0]);
    if (marketFilter) rollupQuery = rollupQuery.eq('market_id', marketFilter);
    const { data: rollups } = await rollupQuery;

    // Aggregate rollup data
    const totals = {
      totalViews: 0, uniqueVisitors: 0, totalSessions: 0, totalClicks: 0,
      singlePageSessions: 0,
      sourceDirect: 0, sourceGoogle: 0, sourceFacebook: 0, sourceInstagram: 0,
      sourceLinktree: 0, sourceBing: 0, sourceEmail: 0, sourceOther: 0,
      deviceDesktop: 0, deviceMobile: 0, deviceTablet: 0,
    };
    const dailyMap = new Map<string, { views: number; visitors: number }>();

    for (const r of rollups || []) {
      totals.totalViews += r.total_views;
      totals.uniqueVisitors += r.unique_visitors;
      totals.totalSessions += r.total_sessions;
      totals.totalClicks += r.total_clicks;
      totals.singlePageSessions += r.single_page_sessions;
      totals.sourceDirect += r.source_direct;
      totals.sourceGoogle += r.source_google;
      totals.sourceFacebook += r.source_facebook;
      totals.sourceInstagram += r.source_instagram;
      totals.sourceLinktree += r.source_linktree;
      totals.sourceBing += r.source_bing;
      totals.sourceEmail += r.source_email;
      totals.sourceOther += r.source_other;
      totals.deviceDesktop += r.device_desktop;
      totals.deviceMobile += r.device_mobile;
      totals.deviceTablet += r.device_tablet;

      const existing = dailyMap.get(r.date) || { views: 0, visitors: 0 };
      existing.views += r.total_views;
      existing.visitors += r.unique_visitors;
      dailyMap.set(r.date, existing);
    }

    // ============================================================
    // 3. Previous period metrics (for delta badges)
    // ============================================================
    let prevPeriodVisitors = 0;
    let prevPeriodViews = 0;
    if (prevStart && prevEnd) {
      let prevQuery = serviceClient.from('analytics_daily_rollups').select('unique_visitors, total_views')
        .gte('date', prevStart.toISOString().split('T')[0])
        .lt('date', prevEnd.toISOString().split('T')[0]);
      if (marketFilter) prevQuery = prevQuery.eq('market_id', marketFilter);
      const { data: prevRollups } = await prevQuery;
      for (const r of prevRollups || []) {
        prevPeriodVisitors += r.unique_visitors;
        prevPeriodViews += r.total_views;
      }
    }

    // ============================================================
    // 4. Top pages from rollups
    // ============================================================
    let topPagesQuery = serviceClient.from('analytics_top_pages_daily')
      .select('page_path, view_count, unique_visitor_count, landing_count');
    if (start) topPagesQuery = topPagesQuery.gte('date', start.toISOString().split('T')[0]);
    if (marketFilter) topPagesQuery = topPagesQuery.eq('market_id', marketFilter);
    const { data: topPagesRaw } = await topPagesQuery;

    // Aggregate top pages across days
    const pageAgg = new Map<string, { views: number; uniqueVisitors: number; landings: number }>();
    for (const p of topPagesRaw || []) {
      const existing = pageAgg.get(p.page_path) || { views: 0, uniqueVisitors: 0, landings: 0 };
      existing.views += p.view_count;
      existing.uniqueVisitors += p.unique_visitor_count;
      existing.landings += p.landing_count;
      pageAgg.set(p.page_path, existing);
    }

    const topPagesRanked = Array.from(pageAgg.entries())
      .map(([path, stats]) => ({ path, views: stats.views, uniqueVisitors: stats.uniqueVisitors }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    // Look up restaurant slugs for mobile paths that contain a UUID
    const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const restaurantUuids = topPagesRanked
      .filter(p => p.path.startsWith('/mobile/') && UUID_PATTERN.test(p.path))
      .map(p => p.path.match(UUID_PATTERN)![0]);
    const uniqueUuids = [...new Set(restaurantUuids)];

    const slugMap = new Map<string, string>();
    if (uniqueUuids.length > 0) {
      const { data: slugRows } = await serviceClient
        .from('restaurants')
        .select('id, slug')
        .in('id', uniqueUuids);
      for (const row of slugRows || []) {
        slugMap.set(row.id, row.slug);
      }
    }

    const topPages = topPagesRanked.map(p => {
      const uuidMatch = p.path.match(UUID_PATTERN);
      const restaurantSlug = uuidMatch ? slugMap.get(uuidMatch[0]) || null : null;
      return { ...p, restaurantSlug };
    });

    const topLandingPages = Array.from(pageAgg.entries())
      .filter(([, stats]) => stats.landings > 0)
      .map(([path, stats]) => {
        const uuidMatch = path.match(UUID_PATTERN);
        const restaurantSlug = uuidMatch ? slugMap.get(uuidMatch[0]) || null : null;
        return { path, landings: stats.landings, restaurantSlug };
      })
      .sort((a, b) => b.landings - a.landings)
      .slice(0, 20);

    // ============================================================
    // 5. Top referrer domains (from raw table, limited scope)
    // ============================================================
    let referrerQuery = serviceClient.from('analytics_page_views')
      .select('referrer')
      .not('referrer', 'is', null)
      .neq('referrer', '');
    if (start) referrerQuery = referrerQuery.gte('viewed_at', start.toISOString());
    if (marketFilter) referrerQuery = referrerQuery.eq('market_id', marketFilter);
    referrerQuery = referrerQuery.limit(5000); // sample for performance
    const { data: referrerRows } = await referrerQuery;

    const domainCounts = new Map<string, number>();
    for (const row of referrerRows || []) {
      try {
        const hostname = new URL(row.referrer).hostname;
        // Skip self-referrals
        const siteHost = process.env.NEXT_PUBLIC_SITE_URL
          ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname : '';
        if (siteHost && hostname.includes(siteHost)) continue;
        domainCounts.set(hostname, (domainCounts.get(hostname) || 0) + 1);
      } catch { /* invalid URL */ }
    }
    const topReferrers = Array.from(domainCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // ============================================================
    // 6. Browser breakdown (from raw table, sampled)
    // ============================================================
    let browserQuery = serviceClient.from('analytics_page_views')
      .select('browser')
      .not('browser', 'is', null);
    if (start) browserQuery = browserQuery.gte('viewed_at', start.toISOString());
    if (marketFilter) browserQuery = browserQuery.eq('market_id', marketFilter);
    browserQuery = browserQuery.limit(5000);
    const { data: browserRows } = await browserQuery;

    const browserCounts = new Map<string, number>();
    for (const row of browserRows || []) {
      if (row.browser) browserCounts.set(row.browser, (browserCounts.get(row.browser) || 0) + 1);
    }
    const totalBrowserSamples = Array.from(browserCounts.values()).reduce((a, b) => a + b, 0);
    const browsers = Array.from(browserCounts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalBrowserSamples > 0 ? Math.round((count / totalBrowserSamples) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ============================================================
    // 7. Build response
    // ============================================================
    const totalSourceViews = totals.sourceDirect + totals.sourceGoogle + totals.sourceFacebook +
      totals.sourceInstagram + totals.sourceLinktree + totals.sourceBing + totals.sourceEmail + totals.sourceOther;

    const pct = (v: number) => totalSourceViews > 0 ? Math.round((v / totalSourceViews) * 100) : 0;

    const sources = [
      { source: 'Google', count: totals.sourceGoogle, percentage: pct(totals.sourceGoogle) },
      { source: 'Direct', count: totals.sourceDirect, percentage: pct(totals.sourceDirect) },
      { source: 'Instagram', count: totals.sourceInstagram, percentage: pct(totals.sourceInstagram) },
      { source: 'Facebook', count: totals.sourceFacebook, percentage: pct(totals.sourceFacebook) },
      { source: 'Linktree', count: totals.sourceLinktree, percentage: pct(totals.sourceLinktree) },
      { source: 'Bing', count: totals.sourceBing, percentage: pct(totals.sourceBing) },
      { source: 'Email', count: totals.sourceEmail, percentage: pct(totals.sourceEmail) },
      { source: 'Other', count: totals.sourceOther, percentage: pct(totals.sourceOther) },
    ].filter(s => s.count > 0).sort((a, b) => b.count - a.count);

    const totalDevices = totals.deviceDesktop + totals.deviceMobile + totals.deviceTablet;
    const dPct = (v: number) => totalDevices > 0 ? Math.round((v / totalDevices) * 100) : 0;

    const devices = [
      { type: 'Desktop', count: totals.deviceDesktop, percentage: dPct(totals.deviceDesktop) },
      { type: 'Mobile', count: totals.deviceMobile, percentage: dPct(totals.deviceMobile) },
      { type: 'Tablet', count: totals.deviceTablet, percentage: dPct(totals.deviceTablet) },
    ].filter(d => d.count > 0);

    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, views: stats.views, visitors: stats.visitors }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const bounceRate = totals.totalSessions > 0
      ? Math.round((totals.singlePageSessions / totals.totalSessions) * 100)
      : 0;

    return NextResponse.json({
      activeNow,
      uniqueVisitors: totals.uniqueVisitors,
      totalViews: totals.totalViews,
      totalClicks: totals.totalClicks,
      bounceRate,
      prevPeriodVisitors,
      prevPeriodViews,
      sources,
      dailyTrend,
      topPages,
      topLandingPages,
      devices,
      browsers,
      topReferrers,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Traffic analytics error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
