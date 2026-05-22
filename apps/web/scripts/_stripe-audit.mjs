import { config } from 'dotenv';
import Stripe from 'stripe';
config({ path: new URL('../.env.local', import.meta.url) });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

console.log('=== INCOMPLETE & PAST_DUE SUBSCRIPTIONS AUDIT ===\n');

const statuses = ['incomplete', 'incomplete_expired', 'past_due', 'unpaid'];
const allSubs = [];

for (const status of statuses) {
  let hasMore = true;
  let startingAfter;
  while (hasMore) {
    const res = await stripe.subscriptions.list({
      status,
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.default_payment_method', 'data.latest_invoice', 'data.customer'],
    });
    allSubs.push(...res.data.map(s => ({ ...s, _status_filter: status })));
    hasMore = res.has_more;
    if (hasMore) startingAfter = res.data[res.data.length - 1].id;
  }
}

console.log(`Found ${allSubs.length} subscriptions in problematic states\n`);
console.log('─'.repeat(120));

for (const sub of allSubs) {
  const customer = sub.customer;
  const email = typeof customer === 'object' ? customer.email : 'unknown';
  const customerId = typeof customer === 'object' ? customer.id : customer;
  const inv = sub.latest_invoice;
  const invStatus = inv?.status || 'none';
  const invAmount = inv ? `$${(inv.amount_due / 100).toFixed(2)}` : '—';
  const invHostedUrl = inv?.hosted_invoice_url || '—';
  const pm = sub.default_payment_method;
  const pmDesc = pm
    ? `${pm.type} ${pm.card?.brand || ''} ····${pm.card?.last4 || ''} (exp ${pm.card?.exp_month}/${pm.card?.exp_year})`
    : 'NONE';

  const customerPMs = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 10 });
  const customerDefaultPM = typeof customer === 'object' ? customer.invoice_settings?.default_payment_method : null;

  console.log(`\nSub: ${sub.id}`);
  console.log(`  Customer:           ${email} (${customerId})`);
  console.log(`  Status:             ${sub.status}`);
  console.log(`  Collection method:  ${sub.collection_method}`);
  console.log(`  Created:            ${new Date(sub.created * 1000).toISOString().split('T')[0]}`);
  console.log(`  Default PM on sub:  ${pmDesc}`);
  console.log(`  Customer default PM: ${customerDefaultPM || 'NONE'}`);
  console.log(`  Cards on customer:  ${customerPMs.data.length} card(s) on file`);
  if (customerPMs.data.length > 0) {
    customerPMs.data.forEach(c => {
      console.log(`    - ${c.card.brand} ····${c.card.last4} (exp ${c.card.exp_month}/${c.card.exp_year}) [${c.id}]`);
    });
  }
  console.log(`  Latest invoice:     ${inv?.id || 'none'} | status=${invStatus} | amount=${invAmount}`);
  if (inv?.attempt_count !== undefined) console.log(`  Attempt count:      ${inv.attempt_count}`);
  if (inv?.next_payment_attempt) console.log(`  Next attempt:       ${new Date(inv.next_payment_attempt * 1000).toISOString()}`);
  console.log(`  Invoice URL:        ${invHostedUrl}`);
}

console.log('\n' + '─'.repeat(120));
console.log('\n=== SUMMARY ===');
const byStatus = {};
const byHasPM = { withPM: 0, noPM: 0 };
for (const sub of allSubs) {
  byStatus[sub.status] = (byStatus[sub.status] || 0) + 1;
  if (sub.default_payment_method) byHasPM.withPM++;
  else byHasPM.noPM++;
}
console.log('By status:', byStatus);
console.log('By payment method on sub:', byHasPM);
