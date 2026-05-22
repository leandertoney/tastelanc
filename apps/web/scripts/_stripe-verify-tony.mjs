import { config } from 'dotenv';
import Stripe from 'stripe';
config({ path: new URL('../.env.local', import.meta.url) });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
const TONY = 'cus_Tv1eHRZorgZWHK';

console.log('=== TONY POST-RECONCILIATION STATE ===\n');

// All subs
const subs = await stripe.subscriptions.list({ customer: TONY, status: 'all', limit: 20 });
console.log(`SUBS (${subs.data.length})`);
for (const s of subs.data) {
  const price = s.items.data[0]?.price;
  console.log(`  ${s.id} | ${s.status} | $${(price?.unit_amount/100).toFixed(2)}/${price?.recurring?.interval_count}${price?.recurring?.interval[0]} | trial_end=${s.trial_end ? new Date(s.trial_end*1000).toISOString().split('T')[0] : 'none'} | period_end=${new Date(s.current_period_end*1000).toISOString().split('T')[0]}`);
}

console.log();
const invs = await stripe.invoices.list({ customer: TONY, limit: 30 });
console.log(`INVOICES (${invs.data.length})`);
for (const i of invs.data) {
  const lines = i.lines.data.map(l => `${l.description?.slice(0,40)} $${(l.amount/100).toFixed(2)} period ${new Date(l.period.start*1000).toISOString().split('T')[0]}→${new Date(l.period.end*1000).toISOString().split('T')[0]}`).join(' || ');
  console.log(`  ${i.id} | ${i.status} | total $${(i.total/100).toFixed(2)} | sub=${i.subscription || 'none'}`);
  console.log(`    lines: ${lines}`);
  if (i.metadata?.replaces_voided_invoice) console.log(`    REPLACES: ${i.metadata.replaces_voided_invoice}`);
}

// Pending invoice items?
console.log();
const pending = await stripe.invoiceItems.list({ customer: TONY, limit: 20, pending: true });
console.log(`PENDING INVOICE ITEMS (${pending.data.length})`);
for (const p of pending.data) {
  console.log(`  ${p.id} | $${(p.amount/100).toFixed(2)} | ${p.description}`);
}

// All invoice items (including those already on invoices)
const allItems = await stripe.invoiceItems.list({ customer: TONY, limit: 30 });
console.log(`\nALL INVOICE ITEMS (${allItems.data.length})`);
for (const p of allItems.data) {
  console.log(`  ${p.id} | $${(p.amount/100).toFixed(2)} | desc=${p.description} | invoice=${p.invoice || 'none'}`);
}
