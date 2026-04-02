import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';

// POST /api/admin/invoices/resolve
// Body: { invoiceId: string, notes?: string }
// Marks invoice resolved and restores tier if it was downgraded
export async function POST(request: Request) {
  const supabase = await createClient();
  try { await verifyAdminAccess(supabase); }
  catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 401 }); }

  const { invoiceId, notes } = await request.json();
  if (!invoiceId) return NextResponse.json({ error: 'invoiceId required' }, { status: 400 });

  const serviceClient = createServiceRoleClient();

  const { data: inv, error: invErr } = await serviceClient
    .from('restaurant_invoices')
    .select('id, restaurant_id, tier_before_downgrade_id, restaurants(name)')
    .eq('id', invoiceId)
    .single();

  if (invErr || !inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  // If restaurant was downgraded, restore their tier
  let tierRestored = false;
  if (inv.tier_before_downgrade_id) {
    await serviceClient
      .from('restaurants')
      .update({ tier_id: inv.tier_before_downgrade_id })
      .eq('id', inv.restaurant_id);
    tierRestored = true;
  }

  // Mark invoice as resolved
  await serviceClient
    .from('restaurant_invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      tier_before_downgrade_id: null,
      downgraded_at: null,
      notes: notes || null,
    })
    .eq('id', invoiceId);

  const restaurantName = (inv.restaurants as any)?.name || 'Restaurant';

  return NextResponse.json({
    success: true,
    message: `Invoice marked resolved${tierRestored ? ` and ${restaurantName} tier restored` : ''}.`,
    tierRestored,
  });
}
