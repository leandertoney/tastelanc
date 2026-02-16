export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getStripe, RESTAURANT_PRICE_IDS } from '@/lib/stripe';
import { isUserAdmin } from '@/lib/auth/admin-access';
import { BRAND } from '@/config/market';
import type Stripe from 'stripe';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId: priceKey, restaurantId } = await request.json();

    // Resolve price key (e.g., "premium_yearly") to actual Stripe price ID
    const resolvedPriceId = RESTAURANT_PRICE_IDS[priceKey as keyof typeof RESTAURANT_PRICE_IDS];
    if (!resolvedPriceId) {
      return NextResponse.json({ error: 'Invalid price selection' }, { status: 400 });
    }

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }

    // Verify the user owns this restaurant
    const serviceClient = createServiceRoleClient();
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('id, name, owner_id, stripe_customer_id, stripe_subscription_id')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Allow owner or admin
    const isAdmin = await isUserAdmin(supabase);
    if (restaurant.owner_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get or create Stripe customer
    let customerId: string;

    if (restaurant.stripe_customer_id) {
      customerId = restaurant.stripe_customer_id;
    } else {
      // Create a new Stripe customer
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
          restaurant_id: restaurantId,
        },
      });
      customerId = customer.id;

      // Save customer ID to the restaurant
      await serviceClient
        .from('restaurants')
        .update({ stripe_customer_id: customerId })
        .eq('id', restaurantId);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

    // Check if this is an upgrade (restaurant already has an active subscription)
    let oldSubscriptionId: string | null = null;
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;

    if (restaurant.stripe_subscription_id) {
      oldSubscriptionId = restaurant.stripe_subscription_id;

      try {
        const oldSub = await getStripe().subscriptions.retrieve(oldSubscriptionId!);
        const oldSubItem = oldSub.items.data[0];

        // Don't allow switching to the same price
        if (oldSubItem?.price?.id === resolvedPriceId) {
          return NextResponse.json(
            { error: 'Already on this plan and billing period.' },
            { status: 400 }
          );
        }

        // Calculate proration credit based on unused time
        const currentAmount = oldSubItem?.price?.unit_amount || 0;
        if (currentAmount > 0 && oldSubItem) {
          const now = Math.floor(Date.now() / 1000);
          let periodStart: number;
          let periodEnd: number;

          if (oldSub.status === 'trialing' && oldSub.trial_start && oldSub.trial_end) {
            // Trialing = paid via admin sales, trial period represents the paid duration
            periodStart = oldSub.trial_start;
            periodEnd = oldSub.trial_end;
          } else if (oldSub.status === 'active') {
            // Active = normal Stripe billing cycle
            periodStart = oldSubItem.current_period_start;
            periodEnd = oldSubItem.current_period_end;
          } else {
            // Other statuses (past_due, etc.) — skip proration
            periodStart = 0;
            periodEnd = 0;
          }

          if (periodEnd > now && periodEnd > periodStart) {
            const totalPeriod = periodEnd - periodStart;
            const usedPeriod = now - periodStart;
            const unusedRatio = Math.max(0, (totalPeriod - usedPeriod) / totalPeriod);
            const creditCents = Math.round(currentAmount * unusedRatio);

            // Only create a coupon if the credit is meaningful (> $1)
            if (creditCents > 100) {
              const coupon = await getStripe().coupons.create({
                amount_off: creditCents,
                currency: 'usd',
                duration: 'once',
                name: `Plan credit from ${restaurant.name}`,
                max_redemptions: 1,
              });
              discounts = [{ coupon: coupon.id }];
              console.log(`Created proration coupon: $${(creditCents / 100).toFixed(2)} credit for ${restaurant.name}`);
            }
          }
        }
      } catch (err) {
        // If we can't retrieve the old subscription, proceed without credit
        console.warn('Could not retrieve old subscription for proration:', err);
      }
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_update: { address: 'auto' },
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: resolvedPriceId,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/dashboard/subscription?success=true`,
      cancel_url: `${siteUrl}/dashboard/subscription?canceled=true`,
      automatic_tax: { enabled: true },
      subscription_data: {
        metadata: {
          restaurant_id: restaurantId,
          user_id: user.id,
        },
      },
      metadata: {
        user_id: user.id,
        restaurant_id: restaurantId,
        subscription_type: 'restaurant',
        // If upgrading, store old subscription ID so webhook can cancel it
        ...(oldSubscriptionId ? { old_subscription_id: oldSubscriptionId } : {}),
      },
    };

    // Apply proration discount if calculated
    if (discounts) {
      sessionParams.discounts = discounts;
    }

    const session = await getStripe().checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
