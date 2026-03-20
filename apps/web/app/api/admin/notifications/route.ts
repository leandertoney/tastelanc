import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── GET /api/admin/notifications ────────────────────────────────────────────
// Query params: market_slug?, from_date? (YYYY-MM-DD), to_date?, status?
// Default window: yesterday through +14 days
export async function GET(request: Request) {
  const supabase = await createClient();
  let admin;
  try { admin = await verifyAdminAccess(supabase); }
  catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

  const { searchParams } = new URL(request.url);
  const marketSlug = searchParams.get('market_slug');
  const status = searchParams.get('status');

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const defaultTo = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const fromDate = searchParams.get('from_date') ?? defaultFrom;
  const toDate = searchParams.get('to_date') ?? defaultTo;

  const serviceClient = createServiceRoleClient();
  let query = serviceClient
    .from('scheduled_notifications')
    .select('*')
    .gte('scheduled_date', fromDate)
    .lte('scheduled_date', toDate)
    .order('scheduled_date', { ascending: true })
    .order('market_slug', { ascending: true });

  if (marketSlug) query = query.eq('market_slug', marketSlug);
  if (status) query = query.eq('status', status);

  // Scope by market if market_admin
  if (admin.scopedMarketIds) {
    query = query.in('market_id', admin.scopedMarketIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Admin Notifications GET] DB error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] });
}

// ─── PATCH /api/admin/notifications ──────────────────────────────────────────
// Body: { id, status: 'approved'|'rejected', rejection_reason? }
export async function PATCH(request: Request) {
  const supabase = await createClient();
  let admin;
  try { admin = await verifyAdminAccess(supabase); }
  catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 500 }); }

  const body = await request.json();
  const { id, status, rejection_reason } = body;

  if (!id || !status) {
    return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
  }
  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 });
  }

  const serviceClient = createServiceRoleClient();

  // Verify the notification exists and is within admin's market scope
  const { data: existing, error: fetchErr } = await serviceClient
    .from('scheduled_notifications')
    .select('id, market_id, market_slug, scheduled_date, restaurant_id, status')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  if (admin.scopedMarketIds && !admin.scopedMarketIds.includes(existing.market_id)) {
    return NextResponse.json({ error: 'Access denied for this market' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {
    status,
    reviewed_by: admin.userId,
    reviewed_at: new Date().toISOString(),
  };
  if (status === 'rejected' && rejection_reason) {
    updates.rejection_reason = rejection_reason;
  }

  const { error: updateErr } = await serviceClient
    .from('scheduled_notifications')
    .update(updates)
    .eq('id', id);

  if (updateErr) {
    console.error('[Admin Notifications PATCH] Update error:', updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // If rejected → auto-regenerate (exclude the rejected restaurant)
  if (status === 'rejected') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tastelanc.com';
    const cronSecret = process.env.CRON_SECRET;
    // Fire and forget — don't block the response
    fetch(`${appUrl}/api/admin/notifications/${id}/regenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
      },
    }).catch((err) => console.error('[Admin Notifications PATCH] Regenerate trigger failed:', err));
  }

  return NextResponse.json({ success: true, status });
}
