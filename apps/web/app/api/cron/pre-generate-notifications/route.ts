/**
 * Pre-Generate Notifications Cron Route
 *
 * Called daily at 7 AM ET by pg_cron (via net.http_post).
 * Calls the edge function /pre-generate to fill the next 14 days
 * of scheduled_notifications for all active markets.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

const CRON_SECRET = process.env.CRON_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-notifications/pre-generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ days_ahead: 14 }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('[Pre-Generate] Edge function error:', response.status, text);
      return NextResponse.json(
        { error: `Edge function returned ${response.status}`, detail: text },
        { status: 500 },
      );
    }

    const result = await response.json();
    console.log('[Pre-Generate] Done:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Pre-Generate] Fatal error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
