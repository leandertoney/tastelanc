import { config } from 'dotenv';
import Stripe from 'stripe';
config({ path: new URL('../.env.local', import.meta.url) });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

console.log('=== ALL ADMIN-SALE SUBSCRIPTIONS — IMPACT ASSESSMENT ===\n');

// Search all subs with admin_sale metadata
let hasMore = true;
let startingAfter;
const adminSubs = [];
while (hasMore) {
  const res = await stripe.subscriptions.search({
    query: `metadata['admin_sale']:'true'`,
    limit: 100,
    page: startingAfter,
  });
  adminSubs.push(...res.data);
  hasMore = res.has_more;
  startingAfter = res.next_page;
}

console.log(`Found ${adminSubs.length} admin-sale subscriptions\n`);

// Group by customer
const byCustomer = new Map();
for (const sub of adminSubs) {
  const custId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  if (!byCustomer.has(custId)) byCustomer.set(custId, []);
  byCustomer.get(custId).push(sub);
}

console.log(`Affecting ${byCustomer.size} unique customers\n`);
console.log('─'.repeat(120));

let totalAtRisk = 0;
let pastDueCount = 0;
let trialingNoPMCount = 0;
let healthyCount = 0;

for (const [custId, subs] of byCustomer) {
  const customer = await stripe.customers.retrieve(custId);
  const cardsList = await stripe.paymentMethods.list({ customer: custId, type: 'card', limit: 5 });
  const hasCard = cardsList.data.length > 0;

  console.log(`\n${customer.email || customer.name || custId}`);
  console.log(`  Customer: ${custId}`);
  console.log(`  Cards on file: ${cardsList.data.length}`);
  console.log(`  Default PM: ${customer.invoice_settings?.default_payment_method || 'NONE'}`);
  console.log(`  Subs (${subs.length}):`);

  for (const sub of subs) {
    const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString().split('T')[0] : 'none';
    const periodEnd = new Date(sub.current_period_end * 1000).toISOString().split('T')[0];
    const restId = sub.metadata.restaurant_id || '?';
    const orderId = sub.metadata.sales_order_id || '?';
    const price = sub.items.data[0]?.price;
    const amt = price ? `$${(price.unit_amount / 100).toFixed(0)}/${price.recurring.interval_count}${price.recurring.interval[0]}` : '?';
    let flag = '';
    if (sub.status === 'past_due' || sub.status === 'unpaid') {
      flag = '🔴 PAST DUE';
      pastDueCount++;
      totalAtRisk += sub.items.data[0]?.price?.unit_amount || 0;
    } else if (sub.status === 'trialing' && !hasCard) {
      flag = '🟡 FAKE-TRIAL (will fail at renewal)';
      trialingNoPMCount++;
      totalAtRisk += sub.items.data[0]?.price?.unit_amount || 0;
    } else if (sub.status === 'active' || (sub.status === 'trialing' && hasCard)) {
      flag = '🟢 OK';
      healthyCount++;
    } else if (sub.status === 'canceled') {
      flag = '⚫ CANCELED';
    } else {
      flag = `⚪ ${sub.status}`;
    }
    console.log(`    ${flag.padEnd(40)} ${sub.id} | ${amt} | trial_end=${trialEnd} | period_end=${periodEnd} | rest=${restId.slice(0,8)} | order=${orderId.slice(0,8)}`);
  }
}

console.log('\n' + '═'.repeat(120));
console.log('IMPACT SUMMARY');
console.log('═'.repeat(120));
console.log(`Past-due subs (renewal already failed):       ${pastDueCount}`);
console.log(`Trialing subs with no card (will fail soon):  ${trialingNoPMCount}`);
console.log(`Healthy subs:                                  ${healthyCount}`);
console.log(`Total revenue at risk (recurring amounts):    $${(totalAtRisk / 100).toFixed(2)}`);
console.log();
console.log('NOTE: Customers PAID upfront for the current period via one-time invoice on sales-order day.');
console.log('The risk is the NEXT renewal, not the current period. Service should not be cut off.');
