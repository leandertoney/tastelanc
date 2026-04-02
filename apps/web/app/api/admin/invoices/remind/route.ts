import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/admin/invoices/remind
// Body: { invoiceId: string }
export async function POST(request: Request) {
  const supabase = await createClient();
  try { await verifyAdminAccess(supabase); }
  catch (err: any) { return NextResponse.json({ error: err.message }, { status: err.status || 401 }); }

  const { invoiceId } = await request.json();
  if (!invoiceId) return NextResponse.json({ error: 'invoiceId required' }, { status: 400 });

  const serviceClient = createServiceRoleClient();

  const { data: inv, error: invErr } = await serviceClient
    .from('restaurant_invoices')
    .select('id, stripe_invoice_id, invoice_url, amount_cents, reminders_sent, restaurants(id, name, contact_email, contact_name, tiers(name))')
    .eq('id', invoiceId)
    .single();

  if (invErr || !inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  const restaurant = inv.restaurants as any;
  const contactEmail = restaurant?.contact_email;
  const contactName = restaurant?.contact_name || 'there';
  const restaurantName = restaurant?.name || 'your restaurant';
  const currentTierName = (restaurant?.tiers as any)?.name || 'current';
  const invoiceNumber = `TL-${inv.stripe_invoice_id.slice(-8).toUpperCase()}`;
  const amountDue = `$${((inv.amount_cents || 0) / 100).toFixed(2)}`;
  const reminderCount = (inv.reminders_sent || 0) + 1;

  if (!contactEmail) {
    return NextResponse.json({ error: 'No contact email on file for this restaurant' }, { status: 400 });
  }

  await resend.emails.send({
    from: 'TasteLanc Partners <partners@tastelanc.com>',
    to: [contactEmail],
    cc: ['info@tastelanc.com'],
    subject: `Friendly Reminder — Invoice ${invoiceNumber} is outstanding`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
        <img src="https://tastelanc.com/logo.png" alt="TasteLanc" style="height: 36px; margin-bottom: 24px;" />
        <h2 style="color: #1a1a1a; font-size: 22px; margin-bottom: 8px;">Hi ${contactName},</h2>
        <p style="color: #555; line-height: 1.6;">Just a friendly reminder that invoice <strong>${invoiceNumber}</strong> for <strong>${amountDue}</strong> is still outstanding for <strong>${restaurantName}</strong>.</p>
        <p style="color: #555; line-height: 1.6;">Your account is currently on the <strong>${currentTierName.charAt(0).toUpperCase() + currentTierName.slice(1)}</strong> tier. To keep your full access and avoid any interruption to your premium features, please complete the invoice at your earliest convenience.</p>
        ${inv.invoice_url ? `<p style="text-align: center; margin: 32px 0;"><a href="${inv.invoice_url}" style="background-color: #E8453C; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Pay Invoice ${invoiceNumber}</a></p>` : ''}
        <p style="color: #555; line-height: 1.6;">If you've already taken care of this or have any questions, just reply to this email and we'll sort it out right away!</p>
        <p style="color: #555; line-height: 1.6;">Thank you so much — we really appreciate your partnership.</p>
        <p style="color: #555; line-height: 1.6;">Talk soon,<br/><strong>The TasteLanc Partners Team</strong><br/><a href="mailto:partners@tastelanc.com" style="color: #E8453C;">partners@tastelanc.com</a></p>
      </div>
    `,
  });

  // Update reminder count and timestamp
  await serviceClient
    .from('restaurant_invoices')
    .update({
      reminders_sent: reminderCount,
      last_reminder_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  return NextResponse.json({
    success: true,
    message: `Reminder #${reminderCount} sent to ${contactEmail}`,
  });
}
