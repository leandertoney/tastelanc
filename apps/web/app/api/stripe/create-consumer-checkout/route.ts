export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

// Early Access pricing - active until launch
const EARLY_ACCESS_END = new Date('2099-12-31T23:59:59Z'); // Keep early access active

// Early Access price IDs ($1.99/month, $19.99/year)
const EARLY_ACCESS_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_EARLY_ACCESS_MONTHLY || 'price_1Sa4YbLikRpMKEPP0xFpkGHl',
  yearly: process.env.STRIPE_PRICE_EARLY_ACCESS_YEARLY || 'price_1Sa4b0LikRpMKEPPgGcJT2gr',
};

// Regular Consumer Premium price IDs ($4.99/month, $29/year - used after early access ends)
const CONSUMER_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_CONSUMER_PREMIUM_MONTHLY || 'price_consumer_monthly_placeholder',
  yearly: process.env.STRIPE_PRICE_CONSUMER_PREMIUM_YEARLY || 'price_consumer_yearly_placeholder',
};

// Check if early access is still active
const isEarlyAccessActive = () => new Date() < EARLY_ACCESS_END;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Please log in first' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { billingPeriod } = body;

    if (!billingPeriod || !['monthly', 'yearly'].includes(billingPeriod)) {
      return NextResponse.json(
        { error: 'Invalid billing period' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
          type: 'consumer',
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create checkout session with early access or regular pricing
    const isEarlyAccess = isEarlyAccessActive();
    const priceIds = isEarlyAccess ? EARLY_ACCESS_PRICE_IDS : CONSUMER_PRICE_IDS;
    const priceId = priceIds[billingPeriod as keyof typeof priceIds];

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      customer_update: { address: 'auto' },
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account?success=true&plan=premium`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/premium?cancelled=true`,
      automatic_tax: { enabled: true },
      metadata: {
        user_id: user.id,
        subscription_type: 'consumer',
        plan: 'premium',
        billing_period: billingPeriod,
        is_founder: isEarlyAccess ? 'true' : 'false',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating consumer checkout:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
