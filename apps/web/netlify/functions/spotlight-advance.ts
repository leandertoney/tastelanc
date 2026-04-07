import type { Config, Context } from '@netlify/functions';

/**
 * Netlify Scheduled Function — Spotlight Advance Generation
 *
 * Runs every Saturday at 8:30 AM ET (13:30 UTC).
 * Scans the next 14 days for empty Sat (elite) and Sun (premium) spotlight slots
 * and fills them via the Next.js spotlight cron route.
 *
 * This gives you a full 2-week preview every Saturday morning to review.
 * The Next.js route handles all slots in one call with its own retry logic.
 */
export default async function handler(req: Request, context: Context) {
  console.log('[Spotlight Advance] Starting 2-week advance generation...');

  try {
    const appUrl = process.env.URL || process.env.NEXT_PUBLIC_APP_URL || 'https://tastelanc.com';
    const cronSecret = process.env.CRON_SECRET;

    const markets = [
      { slug: 'lancaster-pa' },
      // Add more markets here as they launch Instagram spotlights
    ];

    const results: Record<string, unknown> = {};

    for (const market of markets) {
      console.log(`[Spotlight Advance] Processing market: ${market.slug}`);

      const response = await fetch(`${appUrl}/api/instagram/spotlight/cron`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
        },
        body: JSON.stringify({
          market_slug: market.slug,
          source: 'pg_cron',
        }),
      });

      const result = await response.json();
      console.log(`[Spotlight Advance] ${market.slug}:`, JSON.stringify(result));
      results[market.slug] = result;
    }

    return new Response(JSON.stringify({ success: true, markets: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Spotlight Advance] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

// 8:30 AM ET Saturday = 13:30 UTC (runs 30 min after the old per-slot pg_cron jobs, now replaced)
export const config: Config = {
  schedule: '30 13 * * 6',
};
