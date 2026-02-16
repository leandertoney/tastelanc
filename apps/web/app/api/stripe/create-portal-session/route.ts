export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { isUserAdmin } from '@/lib/auth/admin-access';
import { BRAND } from '@/config/market';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS for lookups (user is already authenticated above)
    const serviceClient = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const adminMode = searchParams.get('admin_mode') === 'true';
    let customerId: string | null = null;

    // If admin mode with a specific restaurant_id, look up that restaurant directly
    const isAdmin = await isUserAdmin(supabase);
    if (adminMode && restaurantId && isAdmin) {
      const { data: restaurant } = await serviceClient
        .from('restaurants')
        .select('stripe_customer_id')
        .eq('id', restaurantId)
        .not('stripe_customer_id', 'is', null)
        .single();

      customerId = restaurant?.stripe_customer_id || null;
    }

    // Check if a restaurant_id was provided (restaurant owner dashboard)
    if (!customerId && restaurantId) {
      const { data: restaurant } = await serviceClient
        .from('restaurants')
        .select('stripe_customer_id')
        .eq('id', restaurantId)
        .eq('owner_id', user.id)
        .not('stripe_customer_id', 'is', null)
        .single();

      customerId = restaurant?.stripe_customer_id || null;
    }

    // Fallback: check owner's restaurants by owner_id
    if (!customerId) {
      const { data: restaurant } = await serviceClient
        .from('restaurants')
        .select('stripe_customer_id')
        .eq('owner_id', user.id)
        .not('stripe_customer_id', 'is', null)
        .limit(1)
        .single();

      customerId = restaurant?.stripe_customer_id || null;
    }

    // Check consumer_subscriptions
    if (!customerId) {
      const { data: consumerSub } = await serviceClient
        .from('consumer_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      customerId = consumerSub?.stripe_customer_id || null;
    }

    // Last resort: check self_promoters
    if (!customerId) {
      const { data: promoter } = await serviceClient
        .from('self_promoters')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .not('stripe_customer_id', 'is', null)
        .limit(1)
        .single();

      customerId = promoter?.stripe_customer_id || null;
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 400 }
      );
    }

    // Determine return URL based on context
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;
    const returnUrl = restaurantId
      ? `${siteUrl}/dashboard/subscription`
      : `${siteUrl}/account`;

    // Create billing portal session
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
