import type { Config, Context } from '@netlify/functions';

/**
 * Daily Stripe Reconciliation Cron
 *
 * Runs at 8:00 AM UTC daily. Calls the internal reconcile API to find
 * any paid Stripe invoices from the past 24 hours that haven't been
 * linked to restaurants, and auto-onboards them.
 */
export default async function handler(_req: Request, _context: Context) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[stripe-reconcile] CRON_SECRET env var is not set');
    return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log('[stripe-reconcile] Starting daily reconciliation...');

  const response = await fetch(`${siteUrl}/api/admin/stripe-reconcile-manual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': cronSecret,
    },
    body: JSON.stringify({ lookbackHours: 24 }),
  });

  const result = await response.json().catch(() => ({ error: 'Failed to parse response' }));

  console.log('[stripe-reconcile] Result:', result);

  return new Response(JSON.stringify(result), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Run daily at 8:00 AM UTC
export const config: Config = {
  schedule: '0 8 * * *',
};
