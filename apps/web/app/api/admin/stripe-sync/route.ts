import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

// Sync Stripe subscriptions to database
export async function POST(request: Request) {
  try {
    // Verify admin is making this request
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.email === 'admin@tastelanc.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const stripe = getStripe();
    const results = {
      restaurants: { synced: 0, failed: 0, details: [] as string[] },
      consumers: { synced: 0, failed: 0, details: [] as string[] },
    };

    // Get all active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      expand: ['data.customer'],
    });

    for (const sub of subscriptions.data) {
      const customer = sub.customer;
      if (typeof customer !== 'object') continue;

      const email = customer.email;
      const metadata = customer.metadata || {};
      const amount = (sub.items.data[0]?.price?.unit_amount || 0) / 100;

      // Determine subscription type
      const isConsumer = metadata.type === 'consumer' || metadata.supabase_user_id;
      const isRestaurant = metadata.business_name || amount >= 100; // Business plans are $100+

      if (isConsumer && metadata.supabase_user_id) {
        // Sync consumer subscription to profiles
        const { error } = await supabase
          .from('profiles')
          .update({
            stripe_subscription_id: sub.id,
            stripe_customer_id: customer.id,
            is_premium: true,
          })
          .eq('id', metadata.supabase_user_id);

        if (error) {
          results.consumers.failed++;
          results.consumers.details.push(`Failed: ${email} - ${error.message}`);
        } else {
          results.consumers.synced++;
          results.consumers.details.push(`Synced: ${email} → ${sub.id}`);
        }
      } else if (isRestaurant) {
        // Sync restaurant subscription
        // Try to find restaurant by owner email or business name
        const businessName = metadata.business_name || customer.name;

        if (businessName) {
          // Find restaurant by name (fuzzy match)
          const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id, name')
            .ilike('name', `%${businessName.split(' ')[0]}%`)
            .limit(5);

          if (restaurants && restaurants.length > 0) {
            // Find best match
            const exactMatch = restaurants.find(r =>
              r.name.toLowerCase() === businessName.toLowerCase()
            );
            const restaurant = exactMatch || restaurants[0];

            const { error } = await supabase
              .from('restaurants')
              .update({
                stripe_subscription_id: sub.id,
                stripe_customer_id: customer.id,
              })
              .eq('id', restaurant.id);

            if (error) {
              results.restaurants.failed++;
              results.restaurants.details.push(`Failed: ${businessName} - ${error.message}`);
            } else {
              results.restaurants.synced++;
              results.restaurants.details.push(`Synced: ${restaurant.name} → ${sub.id}`);
            }
          } else {
            results.restaurants.failed++;
            results.restaurants.details.push(`Not found: ${businessName} (${email})`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalSubscriptions: subscriptions.data.length,
      results,
    });
  } catch (error) {
    console.error('Error syncing Stripe:', error);
    return NextResponse.json(
      { error: 'Failed to sync subscriptions' },
      { status: 500 }
    );
  }
}

// Get current Stripe revenue data
export async function GET(request: Request) {
  try {
    // Verify admin is making this request
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.email === 'admin@tastelanc.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const stripe = getStripe();

    // Get all active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      expand: ['data.customer'],
    });

    let totalMRR = 0;
    const restaurants: Array<{
      name: string;
      email: string;
      amount: number;
      interval: string;
      mrr: number;
      subscriptionId: string;
      status: string;
    }> = [];
    const consumers: Array<{
      email: string;
      amount: number;
      interval: string;
      mrr: number;
      subscriptionId: string;
    }> = [];

    for (const sub of subscriptions.data) {
      const customer = sub.customer;
      if (typeof customer !== 'object') continue;

      const email = customer.email || 'unknown';
      const name = customer.name || customer.metadata?.business_name || email;
      const amount = (sub.items.data[0]?.price?.unit_amount || 0) / 100;
      const interval = sub.items.data[0]?.price?.recurring?.interval || 'month';

      // Calculate MRR (monthly recurring revenue)
      const mrr = interval === 'year' ? amount / 12 : amount;
      totalMRR += mrr;

      const metadata = customer.metadata || {};
      const isConsumer = metadata.type === 'consumer' || metadata.supabase_user_id;

      if (isConsumer) {
        consumers.push({
          email,
          amount,
          interval,
          mrr,
          subscriptionId: sub.id,
        });
      } else {
        restaurants.push({
          name,
          email,
          amount,
          interval,
          mrr,
          subscriptionId: sub.id,
          status: sub.status,
        });
      }
    }

    return NextResponse.json({
      totalSubscriptions: subscriptions.data.length,
      mrr: Math.round(totalMRR * 100) / 100,
      arr: Math.round(totalMRR * 12 * 100) / 100,
      restaurants: {
        count: restaurants.length,
        mrr: Math.round(restaurants.reduce((sum, r) => sum + r.mrr, 0) * 100) / 100,
        list: restaurants,
      },
      consumers: {
        count: consumers.length,
        mrr: Math.round(consumers.reduce((sum, c) => sum + c.mrr, 0) * 100) / 100,
        list: consumers,
      },
    });
  } catch (error) {
    console.error('Error fetching Stripe revenue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}
