import { config } from 'dotenv';
import Stripe from 'stripe';
config({ path: new URL('../.env.local', import.meta.url) });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

const TONY = 'cus_Tv1eHRZorgZWHK';

const invs = await stripe.invoices.list({ customer: TONY, status: 'open', limit: 10 });

console.log("TONY'S OPEN INVOICES — hosted invoice URLs (don't expire on email forward):\n");
for (const inv of invs.data) {
  const restName = inv.metadata?.restaurant_name || inv.description || '?';
  console.log(`  ${restName} — $${(inv.total / 100).toFixed(2)}`);
  console.log(`    invoice ID: ${inv.id}`);
  console.log(`    URL:        ${inv.hosted_invoice_url}`);
  console.log();
}
