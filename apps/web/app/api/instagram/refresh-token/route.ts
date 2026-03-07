// POST /api/instagram/refresh-token
// Refreshes long-lived Instagram tokens before they expire.
// Auth: CRON_SECRET or pg_cron source

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { refreshLongLivedToken } from '@/lib/instagram/publish';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const isPgCron = body.source === 'pg_cron';
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isPgCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Get all active accounts with tokens expiring in the next 7 days
  const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000).toISOString();

  const { data: accounts, error } = await supabase
    .from('instagram_accounts')
    .select('*')
    .eq('is_active', true)
    .lt('token_expires_at', sevenDaysFromNow);

  if (error || !accounts) {
    return NextResponse.json({ success: true, refreshed: 0, message: 'No accounts need refresh' });
  }

  const results: { market_id: string; success: boolean; error?: string }[] = [];

  for (const account of accounts) {
    const tokenResult = await refreshLongLivedToken(account);

    if (tokenResult) {
      const expiresAt = new Date(Date.now() + tokenResult.expires_in * 1000).toISOString();
      await supabase
        .from('instagram_accounts')
        .update({
          access_token_encrypted: tokenResult.access_token,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id);

      results.push({ market_id: account.market_id, success: true });
    } else {
      results.push({ market_id: account.market_id, success: false, error: 'Refresh failed' });
    }
  }

  return NextResponse.json({
    success: true,
    refreshed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    details: results,
  });
}
