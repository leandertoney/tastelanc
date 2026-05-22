import { config } from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
config({ path: new URL('../.env.local', import.meta.url) });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--apply') ? false : true;
console.log(`MODE: ${DRY_RUN ? 'DRY RUN (preview only — no writes)' : '🔴 APPLY MODE — writes will happen'}\n`);

// 1. Pull all admin-sale subs
let hasMore = true;
let nextPage;
const adminSubs = [];
while (hasMore) {
  const res = await stripe.subscriptions.search({
    query: `metadata['admin_sale']:'true'`,
    limit: 100,
    page: nextPage,
  });
  adminSubs.push(...res.data);
  hasMore = res.has_more;
  nextPage = res.next_page;
}

console.log(`Found ${adminSubs.length} admin-sale subscriptions\n`);

// 2. For each sub, look up its sales_order_item to find the original discounted price
const plans = [];
for (const sub of adminSubs) {
  const itemId = sub.metadata?.sales_order_item_id;
  const orderId = sub.metadata?.sales_order_id;
  if (!itemId) {
    console.log(`SKIP ${sub.id} — no sales_order_item_id metadata`);
    continue;
  }

  const { data: orderItem, error } = await supabase
    .from('sales_order_items')
    .select('id, restaurant_name, plan, duration, price_cents, discounted_price_cents, sales_order_id')
    .eq('id', itemId)
    .maybeSingle();

  if (error || !orderItem) {
    console.log(`SKIP ${sub.id} — sales_order_item ${itemId} not found in DB`);
    continue;
  }

  const originalCents = orderItem.discounted_price_cents ?? orderItem.price_cents;
  const currentPrice = sub.items.data[0]?.price;
  const currentRecurringCents = currentPrice?.unit_amount;
  const currency = currentPrice?.currency || 'usd';
  const interval = currentPrice?.recurring?.interval;
  const intervalCount = currentPrice?.recurring?.interval_count;

  plans.push({
    subId: sub.id,
    subStatus: sub.status,
    customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    restaurantName: orderItem.restaurant_name,
    plan: orderItem.plan,
    duration: orderItem.duration,
    originalCents,
    currentRecurringCents,
    interval,
    intervalCount,
    currency,
    currentSubItemId: sub.items.data[0]?.id,
    currentPriceId: currentPrice?.id,
    productId: typeof currentPrice?.product === 'string' ? currentPrice.product : currentPrice?.product?.id,
    latestInvoiceId: typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice?.id,
  });
}

console.log('─'.repeat(120));
console.log('PRICE RECONCILIATION PLAN');
console.log('─'.repeat(120));
console.log();
console.log('Sub                                | Restaurant                          | Cur recurring | Original    | Action');
console.log('─'.repeat(120));

let needsPriceUpdate = 0;
let alreadyMatches = 0;

for (const p of plans) {
  const cur = `$${(p.currentRecurringCents / 100).toFixed(2)}/${p.intervalCount}${p.interval[0]}`;
  const orig = `$${(p.originalCents / 100).toFixed(2)}`;
  let action;
  if (p.currentRecurringCents === p.originalCents) {
    action = '✓ matches — no change';
    alreadyMatches++;
  } else {
    action = `→ create new $${(p.originalCents/100).toFixed(2)} price + swap`;
    needsPriceUpdate++;
  }
  console.log(`${p.subId.padEnd(34)} | ${(p.restaurantName||'?').slice(0,35).padEnd(35)} | ${cur.padEnd(13)} | ${orig.padEnd(11)} | ${action}`);
}

console.log();
console.log(`Subs needing price swap: ${needsPriceUpdate}`);
console.log(`Subs already matching:    ${alreadyMatches}`);
console.log();

// Also pull all open invoices on these subs (the past-due ones)
console.log('─'.repeat(120));
console.log('OPEN INVOICES (past-due) THAT WILL ALSO NEED REPRICING');
console.log('─'.repeat(120));

const invoiceFixPlan = [];
for (const p of plans) {
  if (p.currentRecurringCents === p.originalCents) continue;
  const invs = await stripe.invoices.list({
    subscription: p.subId,
    status: 'open',
    limit: 10,
  });
  for (const inv of invs.data) {
    invoiceFixPlan.push({
      subId: p.subId,
      invoiceId: inv.id,
      restaurant: p.restaurantName,
      currentTotal: inv.total,
      newRecurringCents: p.originalCents,
    });
    console.log(`Invoice ${inv.id} (${p.restaurantName})`);
    console.log(`  Current total: $${(inv.total / 100).toFixed(2)} (= $${(inv.subtotal / 100).toFixed(2)} + tax $${((inv.tax || 0) / 100).toFixed(2)})`);
    console.log(`  Will reprice line items to $${(p.originalCents / 100).toFixed(2)} base`);
  }
}

console.log();
console.log(`Open invoices needing reprice: ${invoiceFixPlan.length}`);
console.log();

if (DRY_RUN) {
  console.log('═'.repeat(120));
  console.log('DRY RUN COMPLETE. To execute, re-run with --apply');
  console.log('═'.repeat(120));
  process.exit(0);
}

// ============================================================
// APPLY MODE
// ============================================================
console.log('═'.repeat(120));
console.log('🔴 APPLYING CHANGES');
console.log('═'.repeat(120));

// Step 1: For each sub needing change, create a new Price at the original amount
//   (under the SAME product, same interval) and swap the sub item to it.
for (const p of plans) {
  if (p.currentRecurringCents === p.originalCents) continue;

  console.log(`\n[${p.subId}] ${p.restaurantName}`);
  console.log(`  Creating new price: $${(p.originalCents/100).toFixed(2)} ${p.currency} every ${p.intervalCount} ${p.interval}`);

  const newPrice = await stripe.prices.create({
    product: p.productId,
    unit_amount: p.originalCents,
    currency: p.currency,
    recurring: { interval: p.interval, interval_count: p.intervalCount },
    nickname: `${p.restaurantName} — honored original ${p.duration}`,
    metadata: {
      honored_original_for_sub: p.subId,
      original_recurring_correction: 'true',
    },
  });
  console.log(`  Created price: ${newPrice.id}`);

  console.log(`  Swapping sub item ${p.currentSubItemId} → ${newPrice.id}`);
  await stripe.subscriptions.update(p.subId, {
    items: [{ id: p.currentSubItemId, price: newPrice.id }],
    proration_behavior: 'none',
  });
  console.log(`  ✓ Sub updated`);
}

// Step 2: For each open past-due invoice, void it.
//   Stripe will auto-generate a new invoice on the corrected price at next billing cycle.
//   But for currently-open ones, we need to: (a) void the old, (b) create a fresh invoice
//   with the corrected price, OR (b alternative) update the existing invoice line items.
//
// Cleanest approach: modify the existing invoice's line items.
// However, Stripe doesn't let you edit auto-generated subscription invoice line items.
// So: void + create-and-finalize a new one-off invoice for the past-due period.

for (const fix of invoiceFixPlan) {
  console.log(`\n[Invoice fix] ${fix.invoiceId} (${fix.restaurant})`);

  // Look up the period of the old invoice so the new one matches
  const oldInv = await stripe.invoices.retrieve(fix.invoiceId);
  const lineItem = oldInv.lines.data[0];
  const periodStart = lineItem.period.start;
  const periodEnd = lineItem.period.end;
  const description = lineItem.description;

  console.log(`  Voiding old invoice $${(oldInv.total / 100).toFixed(2)}...`);
  await stripe.invoices.voidInvoice(fix.invoiceId);
  console.log(`  ✓ Voided`);

  // Create a new invoice item at the original price for the same period
  console.log(`  Creating replacement invoice item at $${(fix.newRecurringCents / 100).toFixed(2)}...`);
  const customerId = oldInv.customer;
  await stripe.invoiceItems.create({
    customer: customerId,
    amount: fix.newRecurringCents,
    currency: oldInv.currency,
    description: description ? `${description} (corrected to original price)` : 'Honored original price',
    period: { start: periodStart, end: periodEnd },
    metadata: {
      replaces_voided_invoice: fix.invoiceId,
      honored_original_price: 'true',
    },
  });

  // Create + finalize a new invoice
  const newInv = await stripe.invoices.create({
    customer: customerId,
    auto_advance: false, // we'll finalize manually
    collection_method: 'charge_automatically',
    metadata: {
      replaces_voided_invoice: fix.invoiceId,
      honored_original_price: 'true',
    },
  });
  console.log(`  Created new invoice: ${newInv.id}`);
  const finalized = await stripe.invoices.finalizeInvoice(newInv.id);
  console.log(`  ✓ Finalized: ${finalized.id} | total $${(finalized.total / 100).toFixed(2)}`);
  console.log(`  Status: ${finalized.status} (will auto-charge once customer adds card)`);
}

console.log();
console.log('═'.repeat(120));
console.log('✅ APPLY COMPLETE');
console.log('═'.repeat(120));
console.log();
console.log('Next steps:');
console.log('  1. Send Customer Portal links → customer adds card');
console.log('  2. New past-due invoices auto-charge when card is added (collection_method=charge_automatically)');
console.log('  3. Future renewals charge at the original honored price');
