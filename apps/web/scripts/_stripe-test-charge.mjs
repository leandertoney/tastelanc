import { config } from 'dotenv';
import Stripe from 'stripe';
config({ path: new URL('../.env.local', import.meta.url) });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

const TONY_CUSTOMER_ID = 'cus_Tv1eHRZorgZWHK';
const TEST_INVOICE = 'in_1TTA1BLikRpMKEPPpysK9rTs'; // one of Tony's $265 past-due

console.log('STEP 1: List PaymentMethods on the original Feb 4 PaymentIntent');
const originalPI = await stripe.paymentIntents.retrieve('pi_3SxBsQLikRpMKEPP3G7cKXs9');
console.log('  Original PI payment_method:', originalPI.payment_method);
console.log('  Original PI setup_future_usage:', originalPI.setup_future_usage);
console.log('  Original PI status:', originalPI.status);
console.log('  Original PI customer:', originalPI.customer);

const originalPM = originalPI.payment_method;
console.log();

console.log('STEP 2: Try to retrieve the original PM and check if it is attached to customer');
try {
  const pm = await stripe.paymentMethods.retrieve(originalPM);
  console.log('  PM:', pm.id);
  console.log('  PM customer:', pm.customer);
  console.log('  PM type:', pm.type);
  console.log('  PM card:', pm.card?.brand, '····', pm.card?.last4);
  console.log('  PM allow_redisplay:', pm.allow_redisplay);
} catch (e) {
  console.log('  ERROR retrieving PM:', e.message);
}
console.log();

console.log('STEP 3: Try to attach PM to customer (idempotent if already attached)');
try {
  const attached = await stripe.paymentMethods.attach(originalPM, { customer: TONY_CUSTOMER_ID });
  console.log('  Attached successfully:', attached.id, '→', attached.customer);
} catch (e) {
  console.log('  ATTACH ERROR:', e.code, '|', e.message);
}
console.log();

console.log('STEP 4: Set as customer default payment method');
try {
  await stripe.customers.update(TONY_CUSTOMER_ID, {
    invoice_settings: { default_payment_method: originalPM },
  });
  console.log('  Set as default ✓');
} catch (e) {
  console.log('  UPDATE DEFAULT ERROR:', e.code, '|', e.message);
}
console.log();

console.log('STEP 5: Attempt to PAY one past-due invoice using off_session=true');
console.log('  Invoice:', TEST_INVOICE);
console.log('  This is the moment of truth. If Stripe rejects, no money moves.');
try {
  const paid = await stripe.invoices.pay(TEST_INVOICE, {
    payment_method: originalPM,
    off_session: true,
  });
  console.log('  ✅ PAID! Invoice status:', paid.status, '| amount_paid: $' + (paid.amount_paid / 100).toFixed(2));
  console.log('  Charge:', paid.charge);
} catch (e) {
  console.log('  ❌ PAYMENT REJECTED');
  console.log('  Code:', e.code);
  console.log('  Decline code:', e.decline_code);
  console.log('  Message:', e.message);
  console.log('  Type:', e.type);
  if (e.payment_intent) {
    console.log('  Failed PI:', e.payment_intent.id);
    console.log('  Failed PI last_payment_error:', JSON.stringify(e.payment_intent.last_payment_error, null, 2));
  }
}
