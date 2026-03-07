import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['super_admin', 'co_founder', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');
  const marketSlug = searchParams.get('market') || 'lancaster-pa';

  const serviceClient = createServiceRoleClient();

  // Get market ID
  const { data: market } = await serviceClient
    .from('markets')
    .select('id, name, slug')
    .eq('slug', marketSlug)
    .single();

  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 });
  }

  // Fetch posts for date range
  let query = serviceClient
    .from('instagram_posts')
    .select('*')
    .eq('market_id', market.id)
    .order('post_date', { ascending: false })
    .order('post_slot', { ascending: true });

  if (startDate) query = query.gte('post_date', startDate);
  if (endDate) query = query.lte('post_date', endDate);

  const { data: posts, error } = await query.limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Stats
  const total = posts?.length || 0;
  const published = posts?.filter(p => p.status === 'published').length || 0;
  const drafts = posts?.filter(p => p.status === 'draft').length || 0;
  const failed = posts?.filter(p => p.status === 'failed').length || 0;

  return NextResponse.json({
    posts: posts || [],
    market,
    stats: { total, published, drafts, failed },
  });
}
