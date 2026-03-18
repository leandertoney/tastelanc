export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { notifyMeetingBooked, notifyHotLead } from '@/lib/voice/notifications';

/**
 * POST /api/voice/notify
 *
 * Called by the Edge Function to send notifications to founders.
 * Accepts: { type: 'meeting_booked' | 'hot_lead', data: {...} }
 *
 * Protected by a shared secret (CRON_SHARED_SECRET) since this is
 * called server-to-server from the Edge Function.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SHARED_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = await request.json();

    switch (type) {
      case 'meeting_booked':
        await notifyMeetingBooked(data);
        break;
      case 'hot_lead':
        await notifyHotLead(data);
        break;
      default:
        return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
