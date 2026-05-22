// Run this AFTER Tony pays the consolidated invoice in_1TTV50LikRpMKEPPsOoftG0X.
// It attaches the saved card as default on all 5 subs and resets the 3 quarterly subs'
// billing cycle to Aug 4 so they exit past_due.
import { config } from 'dotenv';
import Stripe from 'stripe';
config({ path: new URL('../.env.local', import.meta.url) });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

const TONY = 'cus_Tv1eHRZorgZWHK';
const CONSOLIDATED_INVOICE = 'in_1TTV50LikRpMKEPPsOoftG0X';
const APPLY = process.argv.includes('--apply');
console.log(`MODE: ${APPLY ? '🔴 APPLY' : 'DRY RUN'}\n`);

const TONY_SUBS = {
  quarterly: [
    'sub_1SxBsaLikRpMKEPP9Hnmw5tE', // Antonio's
    'sub_1SxBsfLikRpMKEPPxXH54tSK', // Josie's
    'sub_1SxBseLikRpMKEPPLYJF15mc', // Queen Street
  ],
  annual: [
    'sub_1SxBscLikRpMKEPPVzR2jBfu', // Trio Bar
    'sub_1SxBsZLikRpMKEPPVhtL3MRW', // Bunker
  ],
};

// Verify invoice paid
const inv = await stripe.invoices.retrieve(CONSOLIDATED_INVOICE);
console.log(`Consolidated invoice ${CONSOLIDATED_INVOICE} status: ${inv.status} | paid=${inv.paid}`);
if (inv.status !== 'paid') {
  console.log('❌ Invoice not paid yet — abort. Re-run after Tony pays.');
  process.exit(1);
}

// Get the PM Tony used to pay
const charges = await stripe.charges.list({ customer: TONY, limit: 5 });
const recentCharge = charges.data.find(c => c.invoice === CONSOLIDATED_INVOICE && c.status === 'succeeded');
if (!recentCharge?.payment_method) {
  console.log('❌ No PM found on the paid invoice. Abort.');
  process.exit(1);
}
const PM_ID = recentCharge.payment_method;
console.log(`Found PM used: ${PM_ID}`);

// Verify PM is attached to customer
const pm = await stripe.paymentMethods.retrieve(PM_ID);
console.log(`PM ${pm.card?.brand} ····${pm.card?.last4} | customer=${pm.customer}`);
if (pm.customer !== TONY) {
  console.log(`Attaching PM to customer...`);
  if (APPLY) await stripe.paymentMethods.attach(PM_ID, { customer: TONY });
}

// Set as customer default
console.log(`Setting as customer default PM`);
if (APPLY) {
  await stripe.customers.update(TONY, { invoice_settings: { default_payment_method: PM_ID } });
}

// Attach to all 5 subs
console.log(`\nAttaching PM as default on 5 subs:`);
for (const subId of [...TONY_SUBS.quarterly, ...TONY_SUBS.annual]) {
  console.log(`  ${subId}`);
  if (APPLY) {
    await stripe.subscriptions.update(subId, { default_payment_method: PM_ID });
    console.log(`    ✓ default_payment_method set`);
  }
}

// Reset billing cycle anchor on the 3 quarterly subs to Aug 4 to clear past_due
console.log(`\nResetting billing_cycle_anchor on 3 quarterly subs to clear past_due:`);
const NEW_ANCHOR = Math.floor(new Date('2026-08-04T00:00:00Z').getTime() / 1000);
for (const subId of TONY_SUBS.quarterly) {
  console.log(`  ${subId} → anchor=2026-08-04`);
  if (APPLY) {
    const updated = await stripe.subscriptions.update(subId, {
      billing_cycle_anchor: NEW_ANCHOR,
      proration_behavior: 'none',
    });
    console.log(`    ✓ status=${updated.status} | next renewal=${new Date(updated.current_period_end * 1000).toISOString().split('T')[0]}`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('Verifying final state:');
const subs = await stripe.subscriptions.list({ customer: TONY, status: 'all', limit: 20 });
for (const s of subs.data) {
  const price = s.items.data[0]?.price;
  console.log(`  ${s.id} | ${s.status} | $${(price?.unit_amount/100).toFixed(2)}/${price?.recurring?.interval_count}${price?.recurring?.interval[0]} | PM=${s.default_payment_method || 'NONE'} | next=${new Date(s.current_period_end*1000).toISOString().split('T')[0]}`);
}

if (!APPLY) {
  console.log('\nDRY RUN — re-run with --apply');
}
