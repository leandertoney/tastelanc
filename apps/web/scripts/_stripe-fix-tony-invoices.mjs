import { config } from 'dotenv';
import Stripe from 'stripe';
config({ path: new URL('../.env.local', import.meta.url) });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

const TONY = 'cus_Tv1eHRZorgZWHK';
const APPLY = process.argv.includes('--apply');
console.log(`MODE: ${APPLY ? '🔴 APPLY' : 'DRY RUN'}\n`);

// Plan: One invoice per subscription, attaching the relevant pending invoice item.
// Mapping based on metadata 'replaces_voided_invoice' which we set during the bad run.

const VOIDED_TO_SUB = {
  in_1TTA1BLikRpMKEPPpysK9rTs: 'sub_1SxBsaLikRpMKEPP9Hnmw5tE', // Antonio's
  in_1TTA8uLikRpMKEPPJq9yr2nU: 'sub_1SxBsfLikRpMKEPPxXH54tSK', // Josie's
  in_1TTAA8LikRpMKEPPnqMt6ysg: 'sub_1SxBseLikRpMKEPPLYJF15mc', // Queen Street
};

// Get all pending items for Tony
const pendingItems = (await stripe.invoiceItems.list({ customer: TONY, pending: true, limit: 20 })).data;
console.log(`Found ${pendingItems.length} pending items\n`);

// Get the bogus $0 "paid" invoices to identify which voided invoice each item targets via metadata
const allInvoices = (await stripe.invoices.list({ customer: TONY, limit: 30 })).data;

// Match each pending item to a sub by description (which references the original price)
// Actually, the items don't carry sub or restaurant metadata directly — we set period + description.
// Match by period start + amount.
const SUBS_TO_FIX = [
  { sub: 'sub_1SxBsaLikRpMKEPP9Hnmw5tE', restaurant: "Antonio's Pizza House" },
  { sub: 'sub_1SxBsfLikRpMKEPPxXH54tSK', restaurant: "Josie's Pub" },
  { sub: 'sub_1SxBseLikRpMKEPPLYJF15mc', restaurant: 'Queen Street Bistro' },
];

// Pending items are all $200 / 3-month period. Three of them. Three subs. They're interchangeable
// in amount but each was originally tied to one sub via the void chain. Without a clean mapping,
// the safest path: delete the 3 floating $200 items, then create one fresh invoice item per
// sub with explicit subscription metadata, and create one invoice per sub.

console.log('CLEANUP PLAN:');
console.log('  1. Delete the 3 cosmetic $0 "paid" invoices (just labels, no money)');
console.log('     — actually we can\'t delete finalized invoices, leave them as-is');
console.log('  2. Delete the 3 floating $200 pending invoice items');
console.log('  3. For each of the 3 subs: invoiceItems.create({...}) THEN invoices.create({pending_invoice_items_behavior:"include"}) THEN finalize');
console.log();

if (!APPLY) {
  console.log('DRY RUN — re-run with --apply');
  process.exit(0);
}

// Step 1: delete the 3 floating "corrected to original price" pending items
for (const item of pendingItems) {
  if (item.amount === 20000 && (item.description || '').includes('corrected to original price')) {
    console.log(`Deleting floating item ${item.id} ($${(item.amount/100).toFixed(2)})`);
    await stripe.invoiceItems.del(item.id);
  }
}

// Step 2: per-sub, create empty invoice → add specific line item → finalize.
// Using invoiceItems.create({ invoice: <specific id> }) attaches the item to THAT invoice,
// avoiding the sweep-all behavior of pending_invoice_items_behavior:'include'.
for (const fix of SUBS_TO_FIX) {
  console.log(`\n[${fix.sub}] ${fix.restaurant}`);

  // Create the empty invoice first (in draft state).
  // Bind to the subscription so the webhook recovery path (line 1890 of webhook/route.ts)
  // doesn't synthesize an `invoice_in_…` fallback ID and overwrite restaurants.stripe_subscription_id.
  const invoice = await stripe.invoices.create({
    customer: TONY,
    subscription: fix.sub,
    auto_advance: false,
    collection_method: 'charge_automatically',
    description: `${fix.restaurant} — Q2 2026 renewal (honored original price)`,
    metadata: {
      sub_id: fix.sub,
      restaurant_name: fix.restaurant,
      honored_original_price: 'true',
    },
  });
  console.log(`  Created draft invoice: ${invoice.id}`);

  // Create the line item, attaching DIRECTLY to that invoice
  const item = await stripe.invoiceItems.create({
    customer: TONY,
    invoice: invoice.id,
    amount: 20000,
    currency: 'usd',
    description: `${fix.restaurant} — Premium (3 Months) — honored original price`,
    period: {
      start: Math.floor(new Date('2026-05-04T00:00:00Z').getTime() / 1000),
      end: Math.floor(new Date('2026-08-04T00:00:00Z').getTime() / 1000),
    },
    metadata: {
      sub_id: fix.sub,
      restaurant_name: fix.restaurant,
    },
  });
  console.log(`  Attached item: ${item.id}`);

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  console.log(`  Finalized: status=${finalized.status} | total $${(finalized.total/100).toFixed(2)}`);
}

console.log('\n✅ Done. Verify with _stripe-verify-tony.mjs');
