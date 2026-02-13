export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getStripe, RESTAURANT_PRICE_IDS } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId: priceKey, restaurantId } = await request.json();

    // Resolve price key to actual Stripe price ID
    const newPriceId = RESTAURANT_PRICE_IDS[priceKey as keyof typeof RESTAURANT_PRICE_IDS];
    if (!newPriceId) {
      return NextResponse.json({ error: 'Invalid price selection' }, { status: 400 });
    }

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }

    // Verify access
    const serviceClient = createServiceRoleClient();
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('id, name, owner_id, stripe_customer_id, stripe_subscription_id')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const isAdmin = user.email === 'admin@tastelanc.com';
    if (restaurant.owner_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!restaurant.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription to upgrade. Use the upgrade button to start a new subscription.' },
        { status: 400 }
      );
    }

    // Retrieve the current subscription from Stripe
    const subscription = await getStripe().subscriptions.retrieve(restaurant.stripe_subscription_id);

    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return NextResponse.json(
        { error: 'Subscription is not active. Please contact support.' },
        { status: 400 }
      );
    }

    // Get the current subscription item
    const currentItem = subscription.items.data[0];
    if (!currentItem) {
      return NextResponse.json(
        { error: 'Subscription has no items. Please contact support.' },
        { status: 400 }
      );
    }

    // Check if trying to switch to the same price
    if (currentItem.price.id === newPriceId) {
      return NextResponse.json(
        { error: 'Already on this plan.' },
        { status: 400 }
      );
    }

    // Update the subscription with the new price, prorating charges
    const updatedSubscription = await getStripe().subscriptions.update(
      restaurant.stripe_subscription_id,
      {
        items: [
          {
            id: currentItem.id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
        // If the subscription was in trialing state, end the trial now so the upgrade takes effect
        ...(subscription.status === 'trialing' ? { trial_end: 'now' } : {}),
        metadata: {
          ...subscription.metadata,
          restaurant_id: restaurantId,
          upgraded_by: user.id,
          upgraded_at: new Date().toISOString(),
        },
      }
    );

    // Determine the new tier from the price ID
    let newTier: string | null = null;
    for (const [key, value] of Object.entries(RESTAURANT_PRICE_IDS)) {
      if (value === newPriceId) {
        // Key format: "premium_3mo", "elite_yearly", etc.
        newTier = key.split('_')[0];
        break;
      }
    }

    // Update the restaurant tier in Supabase
    if (newTier) {
      const { data: tierData } = await serviceClient
        .from('tiers')
        .select('id')
        .eq('name', newTier)
        .single();

      if (tierData) {
        await serviceClient
          .from('restaurants')
          .update({
            tier_id: tierData.id,
            stripe_subscription_id: updatedSubscription.id,
          })
          .eq('id', restaurantId);
      }
    }

    return NextResponse.json({
      success: true,
      subscription_id: updatedSubscription.id,
      new_plan: newTier,
      status: updatedSubscription.status,
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return NextResponse.json(
      { error: 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
}
