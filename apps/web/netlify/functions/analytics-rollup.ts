import type { Config, Context } from '@netlify/functions';

/**
 * Netlify Scheduled Function — Analytics Daily Rollup
 *
 * Runs daily at 2 AM ET. Calls the rollup API route which recomputes
 * analytics_daily_rollups and analytics_top_pages_daily for yesterday.
 */
export default async function handler(req: Request, context: Context) {
  console.log('[Analytics Rollup] Starting...');

  try {
    const appUrl = process.env.URL || process.env.NEXT_PUBLIC_APP_URL || 'https://tastelanc.com';
    const cronSecret = process.env.CRON_SECRET;

    const response = await fetch(`${appUrl}/api/cron/analytics-rollup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
      },
    });

    const result = await response.json();
    console.log('[Analytics Rollup] Result:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Analytics Rollup] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Run daily at 2 AM ET (7 AM UTC)
export const config: Config = {
  schedule: '0 7 * * *',
};
