export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sendFollowUpEmail } from '@/lib/voice/follow-up-emails';

/**
 * POST /api/voice/follow-up
 *
 * Called by the Edge Function after a conversation ends
 * to send a follow-up email to the prospect.
 * Protected by CRON_SHARED_SECRET.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SHARED_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    await sendFollowUpEmail(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Follow-up email error:', error);
    return NextResponse.json({ error: 'Failed to send follow-up' }, { status: 500 });
  }
}
