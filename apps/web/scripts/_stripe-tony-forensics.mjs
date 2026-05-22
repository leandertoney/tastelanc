import { config } from 'dotenv';
import Stripe from 'stripe';
config({ path: new URL('../.env.local', import.meta.url) });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

const TONY_CUSTOMER_ID = 'cus_Tv1eHRZorgZWHK';

console.log('=== TONY @ TRIO BAR & GRILL — FULL FORENSICS ===\n');

const customer = await stripe.customers.retrieve(TONY_CUSTOMER_ID, { expand: ['invoice_settings.default_payment_method'] });
console.log('CUSTOMER');
console.log('  ID:', customer.id);
console.log('  Email:', customer.email);
console.log('  Name:', customer.name);
console.log('  Created:', new Date(customer.created * 1000).toISOString());
console.log('  Default PM:', customer.invoice_settings?.default_payment_method?.id || 'NONE');
console.log('  Metadata:', JSON.stringify(customer.metadata, null, 2));
console.log();

console.log('─'.repeat(120));
console.log('ALL SUBSCRIPTIONS (any status)');
const subs = await stripe.subscriptions.list({
  customer: TONY_CUSTOMER_ID,
  status: 'all',
  limit: 100,
  expand: ['data.default_payment_method', 'data.latest_invoice'],
});
console.log(`Found ${subs.data.length} subs\n`);

for (const s of subs.data) {
  const item = s.items.data[0];
  const price = item?.price;
  let productName = '';
  if (price?.product) {
    try {
      const prod = await stripe.products.retrieve(price.product);
      productName = prod.name;
    } catch {}
  }
  console.log(`Sub ${s.id}`);
  console.log(`  Status:           ${s.status}`);
  console.log(`  Created:          ${new Date(s.created * 1000).toISOString().split('T')[0]}`);
  console.log(`  Current period:   ${new Date(s.current_period_start * 1000).toISOString().split('T')[0]} → ${new Date(s.current_period_end * 1000).toISOString().split('T')[0]}`);
  console.log(`  Trial end:        ${s.trial_end ? new Date(s.trial_end * 1000).toISOString().split('T')[0] : 'none'}`);
  console.log(`  Cancel at:        ${s.cancel_at ? new Date(s.cancel_at * 1000).toISOString().split('T')[0] : 'none'}`);
  console.log(`  Canceled at:      ${s.canceled_at ? new Date(s.canceled_at * 1000).toISOString().split('T')[0] : 'none'}`);
  console.log(`  Collection:       ${s.collection_method}`);
  console.log(`  Price:            ${price?.id} ($${(price?.unit_amount / 100).toFixed(2)} ${price?.currency} / ${price?.recurring?.interval_count} ${price?.recurring?.interval})`);
  console.log(`  Product:          ${productName}`);
  console.log(`  Default PM:       ${s.default_payment_method?.id || 'NONE'}`);
  console.log(`  Latest invoice:   ${s.latest_invoice?.id} status=${s.latest_invoice?.status} amount=$${((s.latest_invoice?.amount_due || 0) / 100).toFixed(2)}`);
  console.log(`  Sub metadata:     ${JSON.stringify(s.metadata)}`);
  console.log();
}

console.log('─'.repeat(120));
console.log('ALL PAYMENTS (any status)');
const charges = await stripe.charges.list({ customer: TONY_CUSTOMER_ID, limit: 100 });
console.log(`Found ${charges.data.length} charges\n`);
for (const c of charges.data) {
  console.log(`Charge ${c.id}`);
  console.log(`  Amount:    $${(c.amount / 100).toFixed(2)} ${c.currency.toUpperCase()}`);
  console.log(`  Status:    ${c.status}${c.refunded ? ' (REFUNDED)' : ''}`);
  console.log(`  Created:   ${new Date(c.created * 1000).toISOString().split('T')[0]}`);
  console.log(`  Desc:      ${c.description}`);
  console.log(`  Invoice:   ${c.invoice || 'none'}`);
  console.log(`  PI:        ${c.payment_intent || 'none'}`);
  console.log(`  Metadata:  ${JSON.stringify(c.metadata)}`);
  console.log();
}

console.log('─'.repeat(120));
console.log('FEB 4 PAYMENT INTENT DETAILS');
const piList = await stripe.paymentIntents.list({ customer: TONY_CUSTOMER_ID, limit: 100 });
for (const pi of piList.data) {
  if (pi.amount > 100000) {
    console.log(`PaymentIntent ${pi.id}`);
    console.log(`  Amount:        $${(pi.amount / 100).toFixed(2)}`);
    console.log(`  Amount received: $${(pi.amount_received / 100).toFixed(2)}`);
    console.log(`  Status:        ${pi.status}`);
    console.log(`  Created:       ${new Date(pi.created * 1000).toISOString()}`);
    console.log(`  Description:   ${pi.description}`);
    console.log(`  Metadata:      ${JSON.stringify(pi.metadata, null, 2)}`);
    console.log(`  Invoice:       ${pi.invoice || 'none'}`);
    console.log(`  PM types:      ${pi.payment_method_types?.join(',')}`);
    console.log();
  }
}

console.log('─'.repeat(120));
console.log('ALL INVOICES');
const invs = await stripe.invoices.list({ customer: TONY_CUSTOMER_ID, limit: 100 });
console.log(`Found ${invs.data.length} invoices\n`);
for (const inv of invs.data) {
  console.log(`Invoice ${inv.id}`);
  console.log(`  Number:    ${inv.number}`);
  console.log(`  Status:    ${inv.status}  | paid=${inv.paid}`);
  console.log(`  Amount:    due=$${(inv.amount_due / 100).toFixed(2)} paid=$${(inv.amount_paid / 100).toFixed(2)}`);
  console.log(`  Created:   ${new Date(inv.created * 1000).toISOString().split('T')[0]}`);
  console.log(`  Sub:       ${inv.subscription || 'none'}`);
  console.log(`  PI:        ${inv.payment_intent || 'none'}`);
  console.log(`  Lines:`);
  for (const line of inv.lines.data) {
    console.log(`    - ${line.description} | $${(line.amount / 100).toFixed(2)} | period ${new Date(line.period.start * 1000).toISOString().split('T')[0]} → ${new Date(line.period.end * 1000).toISOString().split('T')[0]}`);
  }
  console.log(`  Metadata:  ${JSON.stringify(inv.metadata)}`);
  console.log();
}
