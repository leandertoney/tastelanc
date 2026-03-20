import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// POST /api/admin/notifications/[id]/regenerate
// Fetches the rejected/pending row and calls /pre-generate with exclude_restaurant_ids
// so the replacement picks a different restaurant for the same date.
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  // Support both cookie-auth (admin UI) and cron-secret (PATCH auto-trigger)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

  const supabase = await createClient();
  let admin;
  if (!isCronCall) {
    try { admin = await verifyAdminAccess(supabase); }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }
  }

  const serviceClient = createServiceRoleClient();
  const { data: row, error: fetchErr } = await serviceClient
    .from('scheduled_notifications')
    .select('id, market_id, market_slug, scheduled_date, restaurant_id, status')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  if (admin?.scopedMarketIds && !admin.scopedMarketIds.includes(row.market_id)) {
    return NextResponse.json({ error: 'Access denied for this market' }, { status: 403 });
  }

  // Call edge function /pre-generate with the rejected restaurant excluded
  const excludeIds = row.restaurant_id ? [row.restaurant_id] : [];
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/send-notifications/pre-generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        market_slug: row.market_slug,
        dates: [row.scheduled_date],
        exclude_restaurant_ids: excludeIds,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    console.error('[Regenerate] Edge function error:', response.status, text);
    return NextResponse.json({ error: `Edge function returned ${response.status}` }, { status: 500 });
  }

  const result = await response.json();

  // Fetch the updated row so caller can show new restaurant name
  const { data: updated } = await serviceClient
    .from('scheduled_notifications')
    .select('restaurant_name, title, strategy')
    .eq('market_slug', row.market_slug)
    .eq('scheduled_date', row.scheduled_date)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    generated: result.generated,
    newRestaurant: updated?.restaurant_name ?? null,
    newTitle: updated?.title ?? null,
  });
}
