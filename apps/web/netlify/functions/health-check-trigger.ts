import type { Config, Context } from '@netlify/functions';

/**
 * Netlify Scheduled Function — Health Check Trigger
 *
 * Runs every 15 minutes and calls the health check API route.
 * The API route does the actual work (checks services, stores results, sends alerts).
 */
export default async function handler(req: Request, context: Context) {
  console.log('[Health Check Trigger] Starting...');

  try {
    const appUrl = process.env.URL || process.env.NEXT_PUBLIC_APP_URL || 'https://tastelanc.com';
    const cronSecret = process.env.CRON_SECRET;

    const response = await fetch(`${appUrl}/api/cron/health-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
      },
    });

    const result = await response.json();
    console.log('[Health Check Trigger] Result:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Health Check Trigger] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Run every 15 minutes, 24/7
export const config: Config = {
  schedule: '*/15 * * * *',
};
