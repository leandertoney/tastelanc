/**
 * Cron trigger for the daily "Today's Pick" push notification.
 * Called by pg_cron per-market at 16:00/16:05 UTC (11 AM EST / 12 PM EDT).
 * Proxies to the send-notifications edge function.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkNotificationThrottle } from '@/lib/notifications/throttle';

const CRON_SECRET = process.env.CRON_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse optional market_slug from cron body
    let marketSlug: string | undefined;
    try {
      const body = await request.json();
      marketSlug = body.market_slug;
    } catch {
      // No body or invalid JSON — send to all markets (backward compat)
    }

    // Throttle check: skip if another notification was sent recently to this market
    if (marketSlug) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const throttle = await checkNotificationThrottle(supabase, marketSlug);
      if (throttle.throttled) {
        console.log(
          `[todays-pick cron] Throttled for ${marketSlug}: last ${throttle.lastJobType} was ${throttle.minutesSinceLast}min ago`,
        );
        return NextResponse.json({
          success: true,
          throttled: true,
          reason: `Throttled: ${throttle.lastJobType} sent ${throttle.minutesSinceLast}min ago`,
        });
      }
    }

    const edgeFnUrl = `${SUPABASE_URL}/functions/v1/send-notifications/todays-pick`;

    const res = await fetch(edgeFnUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ market_slug: marketSlug }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[todays-pick cron] Edge function error:', text);
      return NextResponse.json({ error: 'Edge function failed', detail: text }, { status: 502 });
    }

    const data = await res.json();
    console.log('[todays-pick cron] Result:', data);

    // Log to notification_logs with market_slug for throttle tracking
    if (marketSlug && data.sent > 0) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from('notification_logs').insert({
        job_type: 'todays_pick',
        status: 'completed',
        market_slug: marketSlug,
        details: {
          market_slug: marketSlug,
          sent: data.sent,
          restaurant: data.restaurant,
          strategy: data.strategy,
        },
      });
    }

    return NextResponse.json({ success: true, ...data });
  } catch (err) {
    console.error('[todays-pick cron] Exception:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
