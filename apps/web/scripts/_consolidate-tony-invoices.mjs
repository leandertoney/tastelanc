import { config } from 'dotenv';
import Stripe from 'stripe';
config({ path: new URL('../.env.local', import.meta.url) });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

const TONY = 'cus_Tv1eHRZorgZWHK';
const APPLY = process.argv.includes('--apply');
console.log(`MODE: ${APPLY ? '🔴 APPLY' : 'DRY RUN'}\n`);

// The 3 separate $212 invoices created in the prior step
const TO_VOID = [
  { id: 'in_1TTUt5LikRpMKEPPoOfECrky', sub: 'sub_1SxBsaLikRpMKEPP9Hnmw5tE', restaurant: "Antonio's Pizza House" },
  { id: 'in_1TTUt8LikRpMKEPPmGWIeE52', sub: 'sub_1SxBsfLikRpMKEPPxXH54tSK', restaurant: "Josie's Pub" },
  { id: 'in_1TTUtCLikRpMKEPPvu1wiKNb', sub: 'sub_1SxBseLikRpMKEPPLYJF15mc', restaurant: 'Queen Street Bistro' },
];

const PERIOD_START = Math.floor(new Date('2026-05-04T00:00:00Z').getTime() / 1000);
const PERIOD_END = Math.floor(new Date('2026-08-04T00:00:00Z').getTime() / 1000);

console.log('Plan:');
console.log('  1. Void 3 separate $212 invoices');
console.log('  2. Create 1 consolidated invoice (NOT bound to any single sub)');
console.log('  3. Add 3 line items @ $200 each, one per restaurant, period May 4 → Aug 4');
console.log('  4. Finalize → status=open, total = $600 + tax ≈ $636');
console.log('  5. Use collection_method = send_invoice (Tony pays via hosted link)\n');

if (!APPLY) {
  console.log('DRY RUN — re-run with --apply');
  process.exit(0);
}

console.log('STEP 1: Voiding 3 separate invoices');
for (const v of TO_VOID) {
  // Verify still open
  const inv = await stripe.invoices.retrieve(v.id);
  if (inv.status !== 'open') {
    console.log(`  SKIP ${v.id} — status is ${inv.status}, not open`);
    continue;
  }
  await stripe.invoices.voidInvoice(v.id);
  console.log(`  ✓ Voided ${v.id} (${v.restaurant})`);
}

console.log('\nSTEP 2: Creating consolidated draft invoice');
const consolidated = await stripe.invoices.create({
  customer: TONY,
  collection_method: 'send_invoice',
  days_until_due: 14,
  auto_advance: false,
  description: 'TasteLanc Q2 2026 renewal — consolidated for all locations',
  metadata: {
    consolidated_renewal: 'true',
    period: '2026-05-04_to_2026-08-04',
    replaces_invoices: TO_VOID.map(v => v.id).join(','),
  },
});
console.log(`  Created draft: ${consolidated.id}`);

console.log('\nSTEP 3: Attaching 3 line items');
for (const v of TO_VOID) {
  const item = await stripe.invoiceItems.create({
    customer: TONY,
    invoice: consolidated.id,
    amount: 20000,
    currency: 'usd',
    description: `${v.restaurant} — Premium quarterly renewal`,
    period: { start: PERIOD_START, end: PERIOD_END },
    metadata: { sub_id: v.sub, restaurant_name: v.restaurant },
  });
  console.log(`  ✓ ${v.restaurant} — $200 (${item.id})`);
}

console.log('\nSTEP 4: Finalizing');
const finalized = await stripe.invoices.finalizeInvoice(consolidated.id);
console.log(`  ✓ Finalized: ${finalized.id} | status=${finalized.status} | total=$${(finalized.total/100).toFixed(2)}`);
console.log(`  Hosted URL: ${finalized.hosted_invoice_url}`);

console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('NOTE: When Tony pays this invoice, Stripe will save his card to the customer.');
console.log('A separate follow-up step is needed to attach that PM as default on all 5 subs');
console.log('so the 2027 annual renewals also auto-charge. Run _attach-pm-to-tony-subs.mjs');
console.log('after he pays.');
