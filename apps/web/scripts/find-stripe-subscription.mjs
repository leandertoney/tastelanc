import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function findRecentSubscriptions() {
  console.log('Fetching recent Stripe events...\n');

  // Get recent checkout sessions
  const sessions = await stripe.checkout.sessions.list({
    limit: 10,
    expand: ['data.subscription', 'data.customer'],
  });

  console.log('=== Recent Checkout Sessions ===\n');

  for (const session of sessions.data) {
    const created = new Date(session.created * 1000);
    console.log(`Session: ${session.id}`);
    console.log(`  Created: ${created.toLocaleString()}`);
    console.log(`  Email: ${session.customer_email || session.customer_details?.email || 'N/A'}`);
    console.log(`  Amount: $${(session.amount_total / 100).toFixed(2)}`);
    console.log(`  Status: ${session.status}`);
    console.log(`  Payment Status: ${session.payment_status}`);
    console.log(`  Subscription ID: ${session.subscription || 'N/A'}`);
    console.log(`  Customer ID: ${session.customer || 'N/A'}`);
    console.log(`  Metadata:`, session.metadata);
    console.log('');
  }

  // Also get recent subscriptions
  console.log('\n=== Recent Subscriptions ===\n');

  const subscriptions = await stripe.subscriptions.list({
    limit: 10,
    expand: ['data.customer'],
  });

  for (const sub of subscriptions.data) {
    const created = new Date(sub.created * 1000);
    const customer = sub.customer;
    const customerEmail = typeof customer === 'object' ? customer.email : 'N/A';

    console.log(`Subscription: ${sub.id}`);
    console.log(`  Created: ${created.toLocaleString()}`);
    console.log(`  Customer: ${typeof customer === 'string' ? customer : customer.id}`);
    console.log(`  Email: ${customerEmail}`);
    console.log(`  Status: ${sub.status}`);
    console.log(`  Price ID: ${sub.items.data[0]?.price.id}`);
    console.log(`  Amount: $${(sub.items.data[0]?.price.unit_amount / 100).toFixed(2)}`);
    console.log(`  Metadata:`, sub.metadata);
    console.log('');
  }
}

findRecentSubscriptions().catch(console.error);
