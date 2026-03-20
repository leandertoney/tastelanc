import type { Config, Context } from '@netlify/functions';

/**
 * Netlify Scheduled Function — Pending Notification Reminder
 *
 * Runs daily at 13:00 UTC = 8:00 AM EST / 9:00 AM EDT.
 * Calls the Next.js API route which queries for today's pending
 * notifications and emails the admin if any need approval.
 */
export default async function handler(req: Request, context: Context) {
  console.log('[Pending Notification Reminder] Starting...');

  try {
    const appUrl = process.env.URL || process.env.NEXT_PUBLIC_APP_URL || 'https://tastelanc.com';
    const cronSecret = process.env.CRON_SECRET;

    const response = await fetch(`${appUrl}/api/cron/pending-notification-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
      },
    });

    const result = await response.json();
    console.log('[Pending Notification Reminder] Result:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Pending Notification Reminder] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

// 13:00 UTC = 8:00 AM EST / 9:00 AM EDT — one hour before the 11 AM send time
export const config: Config = {
  schedule: '0 13 * * *',
};
