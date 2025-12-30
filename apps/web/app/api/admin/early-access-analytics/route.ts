import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Always fetch fresh analytics data (avoid build-time caching)
export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get early access signups
    const { data: signups, count: signupCount } = await supabaseAdmin
      .from('early_access_signups')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(50);

    // Get page views for /premium
    const { data: pageViews, count: totalPageViews } = await supabaseAdmin
      .from('page_views')
      .select('*', { count: 'exact' })
      .eq('page_path', '/premium')
      .order('created_at', { ascending: false });

    // Get unique visitors
    const { data: uniqueVisitors } = await supabaseAdmin
      .from('page_views')
      .select('visitor_id')
      .eq('page_path', '/premium');

    const uniqueVisitorCount = new Set(uniqueVisitors?.map(v => v.visitor_id).filter(Boolean)).size;

    // Get signups by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: signupsByDay } = await supabaseAdmin
      .from('early_access_signups')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    // Group signups by day (using EST timezone)
    const signupDays: Record<string, number> = {};
    signupsByDay?.forEach(s => {
      const day = new Date(s.created_at).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'America/New_York'
      });
      signupDays[day] = (signupDays[day] || 0) + 1;
    });

    // Get page views by day (last 7 days)
    const { data: viewsByDay } = await supabaseAdmin
      .from('page_views')
      .select('created_at')
      .eq('page_path', '/premium')
      .gte('created_at', sevenDaysAgo.toISOString());

    const viewDays: Record<string, number> = {};
    viewsByDay?.forEach(v => {
      const day = new Date(v.created_at).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'America/New_York'
      });
      viewDays[day] = (viewDays[day] || 0) + 1;
    });

    // Calculate conversion rate
    const conversionRate = totalPageViews && totalPageViews > 0
      ? ((signupCount || 0) / totalPageViews * 100).toFixed(1)
      : 0;

    // Get today's stats (using EST timezone)
    const now = new Date();
    const estOffset = -5 * 60; // EST is UTC-5
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const estTime = new Date(utcTime + (estOffset * 60000));
    const todayStartEST = new Date(estTime.getFullYear(), estTime.getMonth(), estTime.getDate(), 0, 0, 0);
    const todayStartUTC = new Date(todayStartEST.getTime() + (5 * 60 * 60000)); // Add 5 hours to get UTC

    const { count: todaySignups } = await supabaseAdmin
      .from('early_access_signups')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStartUTC.toISOString());

    const { count: todayViews } = await supabaseAdmin
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .eq('page_path', '/premium')
      .gte('created_at', todayStartUTC.toISOString());

    return NextResponse.json({
      signups: signups || [],
      totalSignups: signupCount || 0,
      totalPageViews: totalPageViews || 0,
      uniqueVisitors: uniqueVisitorCount,
      conversionRate,
      signupsByDay: signupDays,
      viewsByDay: viewDays,
      todaySignups: todaySignups || 0,
      todayViews: todayViews || 0,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
