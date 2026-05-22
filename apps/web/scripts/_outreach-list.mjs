import { config } from 'dotenv';
import Stripe from 'stripe';
config({ path: new URL('../.env.local', import.meta.url) });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

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

// Group by customer
const byCustomer = new Map();
for (const sub of adminSubs) {
  const cid = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  if (!byCustomer.has(cid)) byCustomer.set(cid, []);
  byCustomer.get(cid).push(sub);
}

const rows = [];
for (const [cid, subs] of byCustomer) {
  const c = await stripe.customers.retrieve(cid);
  const cards = await stripe.paymentMethods.list({ customer: cid, type: 'card', limit: 1 });
  const hasCard = cards.data.length > 0;

  // Earliest sub renewal date
  let earliestRenewal = Infinity;
  let totalRecurringCents = 0;
  let needsAction = false;
  let pastDue = false;
  const subSummaries = [];
  for (const s of subs) {
    if (s.status === 'canceled') continue;
    const price = s.items.data[0]?.price;
    const renewalDate = new Date(s.current_period_end * 1000);
    if (s.current_period_end < earliestRenewal) earliestRenewal = s.current_period_end;
    totalRecurringCents += price?.unit_amount || 0;
    if (s.status === 'past_due' || s.status === 'unpaid') { needsAction = true; pastDue = true; }
    if (s.status === 'trialing' && !hasCard) needsAction = true;
    if (s.status === 'active' && !hasCard) needsAction = true;
    subSummaries.push({
      restaurant: s.metadata?.restaurant_id?.slice(0, 8) || '?',
      amount: (price?.unit_amount || 0) / 100,
      interval: `${price?.recurring?.interval_count}${price?.recurring?.interval[0]}`,
      status: s.status,
      renewal: renewalDate.toISOString().split('T')[0],
    });
  }

  if (!needsAction) continue;
  if (cid === 'cus_Tv1eHRZorgZWHK') continue; // Tony already done

  rows.push({
    customerId: cid,
    name: c.name || '(no name)',
    email: c.email || '(no email)',
    contactName: c.metadata?.contact_name || c.name || '',
    subCount: subs.length,
    totalRecurring: totalRecurringCents / 100,
    earliestRenewal: new Date(earliestRenewal * 1000).toISOString().split('T')[0],
    pastDue,
    subs: subSummaries,
  });
}

rows.sort((a, b) => a.earliestRenewal.localeCompare(b.earliestRenewal));

console.log(`PENDING OUTREACH: ${rows.length} customers (Tony excluded — already sent)\n`);
console.log('═'.repeat(110));
for (const r of rows) {
  console.log(`📧 ${r.email}`);
  console.log(`   Contact: ${r.contactName || r.name}`);
  console.log(`   Customer: ${r.customerId}`);
  console.log(`   Subs: ${r.subCount} | Total recurring: $${r.totalRecurring}/period | Earliest renewal: ${r.earliestRenewal}${r.pastDue ? ' 🔴 PAST DUE' : ''}`);
  for (const s of r.subs) {
    console.log(`     • ${s.status.padEnd(10)} $${s.amount}/${s.interval} | next ${s.renewal} | rest=${s.restaurant}`);
  }
  console.log();
}
console.log('═'.repeat(110));

// Summary by urgency
const urgent = rows.filter(r => r.earliestRenewal <= '2026-05-15');
const thisYear = rows.filter(r => r.earliestRenewal > '2026-05-15' && r.earliestRenewal <= '2026-12-31');
const nextYear = rows.filter(r => r.earliestRenewal > '2026-12-31');
console.log(`🔥 URGENT (≤ May 15):    ${urgent.length} customers`);
console.log(`📅 Later 2026:           ${thisYear.length} customers`);
console.log(`🗓  2027:                 ${nextYear.length} customers`);
