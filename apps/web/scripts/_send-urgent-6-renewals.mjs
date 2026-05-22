// Generates ONE consolidated invoice + sends ONE personalized renewal email
// for each of the 6 urgent admin-sale customers whose subs renew May 8-12, 2026.
//
// Pattern matches Tony's flow:
//   1. Stripe: void any existing past_due/open invoice on the sub
//   2. Stripe: create a new draft invoice (collection_method=send_invoice, customer-level not sub-bound)
//      with metadata.consolidated_renewal=true so the deployed webhook auto-attaches PM on payment
//   3. Stripe: attach 1 line item at the customer's original price for the new period
//   4. Stripe: finalize → status=open → get hosted_invoice_url
//   5. Resend: send personalized email
//
// Run: node scripts/_send-urgent-6-renewals.mjs           (DRY RUN)
//      node scripts/_send-urgent-6-renewals.mjs --apply   (REAL)

import { config } from 'dotenv';
import Stripe from 'stripe';
import { Resend } from 'resend';
config({ path: new URL('../.env.local', import.meta.url) });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
const resend = new Resend(process.env.RESEND_API_KEY);
const APPLY = process.argv.includes('--apply');

const FROM = 'TasteLanc Billing <partners@tastelanc.com>';
const REPLY_TO = 'info@tastelanc.com';
const CC = ['info@tastelanc.com'];
const BCC = ['leandertoney@gmail.com'];

// Each entry: customer, sub, the data we need to construct invoice + email.
// Renewal period for all 6 = next 3 months from current renewal date.
const RECIPIENTS = [
  {
    customerId: 'cus_TwTGvha9XOmrfq',
    subId: 'sub_1SyahPLikRpMKEPP9zof2gF2',
    contactName: 'Steve',
    fullName: 'Steve Allegretti',
    email: 'thozeguyz333@gmail.com',
    restaurantName: "Thoze Guyz Pizzeria",
    renewalDateLabel: 'this Friday (May 8)',
    periodStart: '2026-05-08',
    periodEnd: '2026-08-08',
    amountCents: 25000, // current sub price; original price already matches
    pitchLine: '**Thoze Guyz Pizzeria has the #1 most check-ins on TasteLanc Lancaster.** Diners are showing up, and that momentum is yours to keep.',
    pitchLineHtml: '<strong>Thoze Guyz Pizzeria has the #1 most check-ins on TasteLanc Lancaster.</strong> Diners are showing up, and that momentum is yours to keep.',
  },
  {
    customerId: 'cus_Twc2pEEPUkcGYn',
    subId: 'sub_1SzRhsLikRpMKEPPPxLbXFAJ',
    contactName: 'Brandi',
    fullName: 'Brandi Erisman',
    email: 'mariettatavernonmarket@gmail.com',
    restaurantName: 'Marietta Tavern on Market',
    renewalDateLabel: 'this Saturday (May 9)',
    periodStart: '2026-05-09',
    periodEnd: '2026-08-09',
    amountCents: 25000,
    pitchLine: 'A heads-up: TasteLanc is heading into its biggest stretch yet — summer in Lancaster, full event calendar, new features rolling out for partner spots like **Marietta Tavern on Market**.',
    pitchLineHtml: 'A heads-up: TasteLanc is heading into its biggest stretch yet — summer in Lancaster, full event calendar, new features rolling out for partner spots like <strong>Marietta Tavern on Market</strong>.',
  },
  {
    customerId: 'cus_TwVnRT4z0KcqKw',
    subId: 'sub_1SyldRLikRpMKEPPcThsBXCK',
    contactName: 'Grace',
    fullName: 'Grace Perrone',
    email: 'grace.perrone@yahoo.com',
    restaurantName: "Fiorentino's Italian Restaurant",
    renewalDateLabel: 'this Saturday (May 9)',
    periodStart: '2026-05-09',
    periodEnd: '2026-08-09',
    amountCents: 25000,
    pitchLine: "**Fiorentino's is in the Top 10% on TasteLanc Lancaster** in both check-ins and favorites — diners are finding you and showing up.",
    pitchLineHtml: "<strong>Fiorentino's is in the Top 10% on TasteLanc Lancaster</strong> in both check-ins and favorites — diners are finding you and showing up.",
  },
  {
    customerId: 'cus_TXNk76JIn288C2',
    subId: 'sub_1SyixhLikRpMKEPPUcW6t0V6',
    contactName: 'Craig',
    fullName: 'Craig Trissler',
    email: 'craigtrissler@gmail.com',
    restaurantName: '551 West',
    renewalDateLabel: 'this Saturday (May 9)',
    periodStart: '2026-05-09',
    periodEnd: '2026-08-09',
    amountCents: 25000,
    pitchLine: '**551 West is in the Top 1% in check-ins on TasteLanc Lancaster** — that is real momentum heading into summer.',
    pitchLineHtml: '<strong>551 West is in the Top 1% in check-ins on TasteLanc Lancaster</strong> — that is real momentum heading into summer.',
  },
  {
    customerId: 'cus_TwbjExaYmSyxI2',
    subId: 'sub_1SyiYLLikRpMKEPPUzoizgrY',
    contactName: 'Kayla',
    fullName: 'Kayla Pagan',
    email: 'kaylapagan49@gmail.com',
    restaurantName: 'Station House Tavern & Sports Bar',
    renewalDateLabel: 'this Saturday (May 9)',
    periodStart: '2026-05-09',
    periodEnd: '2026-08-09',
    amountCents: 25000,
    pitchLine: '**Station House Tavern is in the Top 2% in check-ins on TasteLanc Lancaster** — diners are finding you and coming through.',
    pitchLineHtml: '<strong>Station House Tavern is in the Top 2% in check-ins on TasteLanc Lancaster</strong> — diners are finding you and coming through.',
  },
  {
    customerId: 'cus_TvQexZpt1N5Jst',
    subId: 'sub_1T05dtLikRpMKEPPb6ZIEgNC',
    contactName: 'Bill',
    fullName: 'Bill Speakman',
    email: 'bills@tellus360.com',
    restaurantName: 'Tellus 360',
    renewalDateLabel: 'next Tuesday (May 12)',
    periodStart: '2026-05-12',
    periodEnd: '2026-08-12',
    amountCents: 25000,
    pitchLine: '**Tellus 360 is in the Top 10% in saves on TasteLanc Lancaster** — diners are bookmarking you and planning visits.',
    pitchLineHtml: '<strong>Tellus 360 is in the Top 10% in saves on TasteLanc Lancaster</strong> — diners are bookmarking you and planning visits.',
  },
];

console.log(`MODE: ${APPLY ? '🔴 APPLY (will create invoices + send emails)' : 'DRY RUN'}\n`);
console.log(`Recipients: ${RECIPIENTS.length}\n`);

const results = [];

for (const r of RECIPIENTS) {
  console.log('─'.repeat(100));
  console.log(`📧 ${r.fullName} <${r.email}>`);
  console.log(`   Restaurant: ${r.restaurantName}`);
  console.log(`   Sub: ${r.subId}`);
  console.log(`   Period: ${r.periodStart} → ${r.periodEnd} | $${r.amountCents/100}`);

  if (!APPLY) {
    console.log(`   PITCH: ${r.pitchLine}`);
    continue;
  }

  // Step 1: Void any existing open/past_due invoice on this sub
  const existingInvoices = await stripe.invoices.list({ subscription: r.subId, status: 'open', limit: 5 });
  for (const inv of existingInvoices.data) {
    console.log(`   Voiding existing open invoice ${inv.id} ($${(inv.total/100).toFixed(2)})`);
    await stripe.invoices.voidInvoice(inv.id);
  }

  // Step 2: Create draft invoice (NOT bound to sub — collection_method=send_invoice)
  // metadata.consolidated_renewal triggers the webhook to attach PM to the sub on payment
  const invoice = await stripe.invoices.create({
    customer: r.customerId,
    collection_method: 'send_invoice',
    days_until_due: 14,
    auto_advance: false,
    description: `${r.restaurantName} — Q renewal (${r.periodStart} → ${r.periodEnd})`,
    metadata: {
      consolidated_renewal: 'true',
      sub_id: r.subId,
      period: `${r.periodStart}_to_${r.periodEnd}`,
    },
  });

  // Step 3: Attach line item directly to that invoice
  await stripe.invoiceItems.create({
    customer: r.customerId,
    invoice: invoice.id,
    amount: r.amountCents,
    currency: 'usd',
    description: `${r.restaurantName} — Premium quarterly renewal`,
    period: {
      start: Math.floor(new Date(r.periodStart + 'T00:00:00Z').getTime() / 1000),
      end: Math.floor(new Date(r.periodEnd + 'T00:00:00Z').getTime() / 1000),
    },
    metadata: { sub_id: r.subId, restaurant_name: r.restaurantName },
  });

  // Step 4: Finalize → open → hosted URL
  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  const invoiceUrl = finalized.hosted_invoice_url;
  console.log(`   ✓ Invoice ${finalized.id} | $${(finalized.total/100).toFixed(2)} | ${invoiceUrl}`);

  // Step 5: Send Resend email
  const subject = `Quick action — keep your TasteLanc spot active`;
  const html = buildHtml(r, invoiceUrl);
  const text = buildText(r, invoiceUrl);

  const sendResult = await resend.emails.send({
    from: FROM,
    to: [r.email],
    cc: CC,
    bcc: BCC,
    replyTo: REPLY_TO,
    subject,
    html,
    text,
  });
  if (sendResult.error) {
    console.log(`   ❌ Email failed: ${JSON.stringify(sendResult.error)}`);
    results.push({ ...r, invoiceId: finalized.id, invoiceUrl, emailId: null, error: sendResult.error });
  } else {
    console.log(`   ✓ Email sent: ${sendResult.data?.id}`);
    results.push({ ...r, invoiceId: finalized.id, invoiceUrl, emailId: sendResult.data?.id, error: null });
  }
}

if (APPLY) {
  console.log('\n' + '═'.repeat(100));
  console.log('SUMMARY');
  console.log('═'.repeat(100));
  for (const r of results) {
    console.log(`${r.email.padEnd(40)} | invoice=${r.invoiceId} | email=${r.emailId || 'FAILED'}`);
  }
}

function buildHtml(r, invoiceUrl) {
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.55;">
  <div style="border-bottom:2px solid #c41e3a;padding-bottom:12px;margin-bottom:24px;">
    <h1 style="margin:0;font-size:22px;color:#1a1a1a;">TasteLanc Billing</h1>
  </div>

  <p>Hi ${r.contactName},</p>

  <p>${r.pitchLineHtml}</p>

  <p>Your 3-month subscription renews <strong>${r.renewalDateLabel}</strong>. To keep your spot active and stay in front of diners as we head into peak season, confirm your card on the invoice below — takes 30 seconds.</p>

  <div style="text-align:center;margin:32px 0;">
    <a href="${invoiceUrl}" style="display:inline-block;background:#c41e3a;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px;">Confirm card</a>
  </div>

  <p style="color:#555;font-size:14px;">Once it's on file, renewals run automatically and you don't have to think about it again.</p>

  <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px 0;">
  <p style="color:#888;font-size:12px;margin:0;">TasteLanc Billing<br><a href="mailto:info@tastelanc.com" style="color:#888;">info@tastelanc.com</a></p>
</body></html>`;
}

function buildText(r, invoiceUrl) {
  const stripped = r.pitchLine.replace(/\*\*/g, '');
  return `Hi ${r.contactName},

${stripped}

Your 3-month subscription renews ${r.renewalDateLabel}. To keep your spot active and stay in front of diners as we head into peak season, confirm your card on the invoice below — takes 30 seconds.

Confirm card: ${invoiceUrl}

Once it's on file, renewals run automatically and you don't have to think about it again.

— TasteLanc Billing
info@tastelanc.com`;
}

if (!APPLY) {
  console.log('\n' + '═'.repeat(100));
  console.log('DRY RUN COMPLETE — re-run with --apply to send for real');
}
