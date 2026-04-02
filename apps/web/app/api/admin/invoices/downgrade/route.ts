import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

const BASIC_TIER_ID = '00000000-0000-0000-0000-000000000001';

// POST /api/admin/invoices/downgrade
// Body: { invoiceId: string } — the restaurant_invoices.id (not Stripe invoice ID)
export async function POST(request: Request) {
  const supabase = await createClient();
  try { await verifyAdminAccess(supabase); }
  catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 401 }); }

  const { invoiceId } = await request.json();
  if (!invoiceId) return NextResponse.json({ error: 'invoiceId required' }, { status: 400 });

  const serviceClient = createServiceRoleClient();

  // Get invoice + restaurant details
  const { data: inv, error: invErr } = await serviceClient
    .from('restaurant_invoices')
    .select('id, restaurant_id, stripe_invoice_id, invoice_url, amount_cents, restaurants(id, name, tier_id, contact_email, contact_name, stripe_customer_id, tiers(id, name))')
    .eq('id', invoiceId)
    .single();

  if (invErr || !inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  const restaurant = inv.restaurants as any;
  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

  // Already on basic — nothing to do
  if (restaurant.tier_id === BASIC_TIER_ID) {
    return NextResponse.json({ message: 'Already on Basic tier' });
  }

  const previousTierId = restaurant.tier_id;

  // Downgrade restaurant to Basic
  const { error: downgradeErr } = await serviceClient
    .from('restaurants')
    .update({ tier_id: BASIC_TIER_ID })
    .eq('id', restaurant.id);

  if (downgradeErr) return NextResponse.json({ error: 'Failed to downgrade restaurant' }, { status: 500 });

  // Record the downgrade on the invoice so we can restore later
  await serviceClient
    .from('restaurant_invoices')
    .update({
      status: 'downgraded',
      tier_before_downgrade_id: previousTierId,
      downgraded_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  // Send notification email to restaurant contact
  const contactEmail = restaurant.contact_email;
  const contactName = restaurant.contact_name || 'there';
  const previousTierName = (restaurant.tiers as any)?.name || 'premium';
  const invoiceNumber = `TL-${inv.stripe_invoice_id.slice(-8).toUpperCase()}`;
  const amountDue = `$${((inv.amount_cents || 0) / 100).toFixed(2)}`;

  if (contactEmail) {
    try {
      await resend.emails.send({
        from: 'TasteLanc Partners <partners@tastelanc.com>',
        to: [contactEmail],
        cc: ['info@tastelanc.com'],
        subject: `Your TasteLanc Account — Invoice ${invoiceNumber}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
            <img src="https://tastelanc.com/logo.png" alt="TasteLanc" style="height: 36px; margin-bottom: 24px;" />
            <h2 style="color: #1a1a1a; font-size: 22px; margin-bottom: 8px;">Hi ${contactName},</h2>
            <p style="color: #555; line-height: 1.6;">Hope you're doing well! We just wanted to give you a quick heads up regarding your TasteLanc partnership account.</p>
            <p style="color: #555; line-height: 1.6;">We noticed that invoice <strong>${invoiceNumber}</strong> for <strong>${amountDue}</strong> hasn't been completed yet. No worries at all — we completely understand that things get busy, and this may have simply slipped through the cracks!</p>
            <p style="color: #555; line-height: 1.6;">Because of the outstanding balance, we've temporarily moved <strong>${restaurant.name}</strong> to our <strong>Basic tier</strong>. Your restaurant is still fully visible on the app, but some premium features — including Happy Hours, Specials, and enhanced placement — are paused for now.</p>
            <div style="background: #f9f9f9; border-left: 4px solid #22c55e; padding: 16px; border-radius: 4px; margin: 24px 0;">
              <p style="margin: 0; font-weight: 600; color: #1a1a1a;">The good news — it's a super quick fix!</p>
              <p style="margin: 8px 0 0; color: #555;">Once your invoice is completed, we'll get you upgraded right back to <strong>${previousTierName.charAt(0).toUpperCase() + previousTierName.slice(1)}</strong> immediately.</p>
            </div>
            ${inv.invoice_url ? `<p style="text-align: center; margin: 32px 0;"><a href="${inv.invoice_url}" style="background-color: #E8453C; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Complete Invoice ${invoiceNumber}</a></p>` : ''}
            <p style="color: #555; line-height: 1.6;">If you have any questions or if anything came up, just reply to this email and we'll work through it together. We truly appreciate your partnership and love having <strong>${restaurant.name}</strong> on the platform!</p>
            <p style="color: #555; line-height: 1.6;">Talk soon,<br/><strong>The TasteLanc Partners Team</strong><br/><a href="mailto:partners@tastelanc.com" style="color: #E8453C;">partners@tastelanc.com</a></p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Failed to send downgrade notification email:', emailErr);
    }
  }

  return NextResponse.json({
    success: true,
    message: `${restaurant.name} downgraded to Basic. Previous tier saved for auto-restore on payment.`,
    emailSent: !!contactEmail,
  });
}
