import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/admin/invoices
// Returns all restaurant invoices with restaurant + tier info
export async function GET() {
  const supabase = await createClient();
  try { await verifyAdminAccess(supabase); }
  catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 401 }); }

  const serviceClient = createServiceRoleClient();

  const { data, error } = await serviceClient
    .from('restaurant_invoices')
    .select(`
      id,
      stripe_invoice_id,
      amount_cents,
      currency,
      status,
      due_date,
      paid_at,
      invoice_url,
      reminders_sent,
      last_reminder_at,
      downgraded_at,
      notes,
      created_at,
      restaurants!inner(
        id,
        name,
        contact_email,
        contact_name,
        tiers(name),
        markets(name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const invoices = (data || []).map((row: any) => ({
    id: row.id,
    stripe_invoice_id: row.stripe_invoice_id,
    amount_cents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    due_date: row.due_date,
    paid_at: row.paid_at,
    invoice_url: row.invoice_url,
    reminders_sent: row.reminders_sent,
    last_reminder_at: row.last_reminder_at,
    downgraded_at: row.downgraded_at,
    notes: row.notes,
    created_at: row.created_at,
    restaurant: {
      id: row.restaurants.id,
      name: row.restaurants.name,
      contact_email: row.restaurants.contact_email,
      contact_name: row.restaurants.contact_name,
      tier: row.restaurants.tiers?.name || null,
      market: row.restaurants.markets?.name || null,
    },
  }));

  return NextResponse.json({ invoices });
}
