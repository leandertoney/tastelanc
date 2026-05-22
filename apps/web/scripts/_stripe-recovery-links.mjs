import { config } from 'dotenv';
import Stripe from 'stripe';
config({ path: new URL('../.env.local', import.meta.url) });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

const RETURN_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

console.log('=== GENERATING CUSTOMER PORTAL RECOVERY LINKS ===\n');
console.log('Each link expires in ~24 hours. Have customer click → "Add payment method".\n');

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

const seen = new Set();
const customers = [];
for (const s of adminSubs) {
  const cid = typeof s.customer === 'string' ? s.customer : s.customer.id;
  if (seen.has(cid)) continue;
  seen.add(cid);
  const cust = await stripe.customers.retrieve(cid);
  const cards = await stripe.paymentMethods.list({ customer: cid, type: 'card', limit: 1 });
  customers.push({ id: cid, email: cust.email, name: cust.name, hasCard: cards.data.length > 0 });
}

const PRIORITY = (email) => {
  if (email === 'tony@triobarandgrill.com') return 0;
  return 1;
};

customers.sort((a, b) => PRIORITY(a.email) - PRIORITY(b.email));

console.log(`Generating ${customers.length} portal links...\n`);

for (const c of customers) {
  if (c.hasCard) {
    console.log(`SKIP — ${c.email} already has card on file`);
    continue;
  }
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: c.id,
      return_url: `${RETURN_URL}/dashboard?payment_method_updated=true`,
    });
    console.log(`${c.email}`);
    console.log(`  Customer: ${c.id}`);
    console.log(`  Name:     ${c.name || '(none)'}`);
    console.log(`  LINK:     ${portal.url}`);
    console.log();
  } catch (e) {
    console.log(`ERROR for ${c.email}: ${e.message}`);
  }
}
