// POST /api/instagram/metrics
// Collects engagement metrics for recent Instagram posts.
// Auth: CRON_SECRET or pg_cron source

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { fetchPostMetrics } from '@/lib/instagram/publish';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const isPgCron = body.source === 'pg_cron';
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isPgCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Get published posts from last 7 days that have an instagram_media_id
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data: posts, error } = await supabase
    .from('instagram_posts')
    .select('id, market_id, instagram_media_id')
    .eq('status', 'published')
    .not('instagram_media_id', 'is', null)
    .gte('published_at', sevenDaysAgo);

  if (error || !posts || posts.length === 0) {
    return NextResponse.json({ success: true, updated: 0, message: 'No recent posts to collect metrics for' });
  }

  // Load Instagram accounts
  const marketIds = Array.from(new Set(posts.map(p => p.market_id)));
  const { data: accounts } = await supabase
    .from('instagram_accounts')
    .select('*')
    .in('market_id', marketIds)
    .eq('is_active', true);

  const accountMap = new Map((accounts || []).map(a => [a.market_id, a]));

  let updated = 0;
  let failed = 0;

  for (const post of posts) {
    const account = accountMap.get(post.market_id);
    if (!account) {
      failed++;
      continue;
    }

    const metrics = await fetchPostMetrics(account, post.instagram_media_id);

    if (Object.keys(metrics).length > 0) {
      await supabase
        .from('instagram_posts')
        .update({
          engagement_metrics: {
            ...metrics,
            collected_at: new Date().toISOString(),
          },
        })
        .eq('id', post.id);
      updated++;
    } else {
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    failed,
    total_checked: posts.length,
  });
}
