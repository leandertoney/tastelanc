/**
 * Cron trigger for the daily "Today's Pick" push notification.
 * Called by pg_cron at 21:00 UTC (4pm ET) every day.
 * Proxies to the send-notifications edge function.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

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
    const edgeFnUrl = `${SUPABASE_URL}/functions/v1/send-notifications/todays-pick`;

    const res = await fetch(edgeFnUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[todays-pick cron] Edge function error:', text);
      return NextResponse.json({ error: 'Edge function failed', detail: text }, { status: 502 });
    }

    const data = await res.json();
    console.log('[todays-pick cron] Result:', data);
    return NextResponse.json({ success: true, ...data });
  } catch (err) {
    console.error('[todays-pick cron] Exception:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
