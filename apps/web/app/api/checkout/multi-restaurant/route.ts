import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getStripeForMarket, DURATION_LABELS, UNIFIED_PRICE_IDS } from '@/lib/stripe';
import {
  getPriceCents,
  isValidPlan,
  isValidInterval,
  type PlanId,
  type BillingInterval,
} from '@/lib/pricing-config';

export const runtime = 'nodejs'; // Required for Supabase SSR
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CheckoutItem {
  restaurantId: string | null;
  restaurantName: string;
  isNewRestaurant: boolean;
  plan: PlanId;
  duration: BillingInterval;
}

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * UNIFIED MULTI-RESTAURANT CHECKOUT API
 *
 * Handles checkout creation for both Sales CRM and Admin Panel.
 * - Verifies sales rep OR admin access
 * - Uses centralized unified pricing from pricing-config.ts
 * - No multi-restaurant discounts (unified pricing structure)
 * - Creates sales_order and sales_order_items in database
 * - Returns Stripe Checkout URL for payment
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Try sales access first, then admin access
    let userId: string | undefined;
    let accessType: 'sales' | 'admin' = 'sales';

    const salesAccess = await verifySalesAccess(supabase);
    if (salesAccess.canAccess && salesAccess.userId) {
      userId = salesAccess.userId;
      accessType = 'sales';
    } else {
      // Try admin access
      try {
        const admin = await verifyAdminAccess(supabase);
        userId = admin.userId;
        accessType = 'admin';
      } catch {
        // Neither sales nor admin access
        return NextResponse.json(
          { error: 'Access denied. Sales rep or admin access required.' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { email, contactName, phone, items } = body as {
      email: string;
      contactName?: string;
      phone?: string;
      items: CheckoutItem[];
    };

    // Validation
    if (!email) {
      return NextResponse.json({ error: 'Customer email is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one restaurant is required' }, { status: 400 });
    }

    if (items.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 restaurants per order' }, { status: 400 });
    }

    // Validate items and get pricing from centralized config
    const itemsWithPrices = items.map((item, index) => {
      if (!item.restaurantName) {
        throw new Error(`Item ${index + 1}: Restaurant name is required`);
      }
      if (!isValidPlan(item.plan)) {
        throw new Error(`Item ${index + 1}: Invalid plan "${item.plan}"`);
      }
      if (!isValidInterval(item.plan, item.duration)) {
        throw new Error(`Item ${index + 1}: Invalid duration "${item.duration}" for plan "${item.plan}"`);
      }

      const priceCents = getPriceCents(item.plan, item.duration);
      const priceDollars = priceCents / 100;

      return { ...item, priceCents, priceDollars };
    });

    // Calculate totals - UNIFIED PRICING: No multi-restaurant discounts
    const subtotalCents = itemsWithPrices.reduce((sum, item) => sum + item.priceCents, 0);
    const discountPercent = 0; // No discounts with unified pricing
    const discountAmountCents = 0;
    const totalCents = subtotalCents;

    const supabaseAdmin = getSupabaseAdmin();

    // Determine market by looking up restaurant markets
    const existingRestaurantIds = items.map(i => i.restaurantId).filter(Boolean) as string[];
    let marketSlug = 'lancaster-pa'; // default
    if (existingRestaurantIds.length > 0) {
      const { data: restaurantMarkets } = await supabaseAdmin
        .from('restaurants')
        .select('id, markets!inner(slug)')
        .in('id', existingRestaurantIds);
      if (restaurantMarkets && restaurantMarkets.length > 0) {
        const slugs = [...new Set(restaurantMarkets.map((r: any) => r.markets?.slug).filter(Boolean))];
        if (slugs.length > 1) {
          return NextResponse.json({ error: 'All restaurants in an order must belong to the same market' }, { status: 400 });
        }
        if (slugs.length === 1) marketSlug = slugs[0] as string;
      }
    }
    const stripe = getStripeForMarket(marketSlug);

    // Create or retrieve Stripe customer
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      await stripe.customers.update(customerId, {
        name: contactName || existingCustomers.data[0].name || items[0].restaurantName,
        phone: phone || existingCustomers.data[0].phone || undefined,
        metadata: {
          ...existingCustomers.data[0].metadata,
          contact_name: contactName || existingCustomers.data[0].metadata?.contact_name || '',
          updated_by: userId!,
          updated_by_role: accessType,
        },
      });
    } else {
      const customer = await stripe.customers.create({
        email,
        name: contactName || items[0].restaurantName,
        phone: phone || undefined,
        metadata: {
          contact_name: contactName || '',
          created_by: userId!,
          created_by_role: accessType,
        },
      });
      customerId = customer.id;
    }

    // Create sales_order in database
    const { data: salesOrder, error: orderError } = await supabaseAdmin
      .from('sales_orders')
      .insert({
        customer_email: email,
        customer_name: contactName || null,
        customer_phone: phone || null,
        stripe_customer_id: customerId,
        restaurant_count: items.length,
        discount_percent: discountPercent,
        subtotal_cents: subtotalCents,
        discount_amount_cents: discountAmountCents,
        total_cents: totalCents,
        created_by_admin: userId,
        status: 'pending',
      })
      .select('id')
      .single();

    if (orderError || !salesOrder) {
      console.error('Failed to create sales order:', orderError);
      return NextResponse.json({ error: 'Failed to create sales order' }, { status: 500 });
    }

    // Create sales_order_items for each restaurant
    const orderItems = itemsWithPrices.map(item => ({
      sales_order_id: salesOrder.id,
      restaurant_id: item.restaurantId || null,
      restaurant_name: item.restaurantName,
      is_new_restaurant: item.isNewRestaurant || !item.restaurantId,
      plan: item.plan,
      duration: item.duration,
      price_cents: item.priceCents,
      discounted_price_cents: item.priceCents, // No discounts
      processing_status: 'pending',
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('sales_order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Failed to create sales order items:', itemsError);
      await supabaseAdmin.from('sales_orders').delete().eq('id', salesOrder.id);
      return NextResponse.json({ error: 'Failed to create sales order items' }, { status: 500 });
    }

    // Determine success/cancel URLs based on access type
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';
    const successUrl = accessType === 'admin'
      ? `${baseUrl}/admin/sales?success=true&session_id={CHECKOUT_SESSION_ID}`
      : `${baseUrl}/sales/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = accessType === 'admin'
      ? `${baseUrl}/admin/sales?canceled=true`
      : `${baseUrl}/sales/checkout?canceled=true`;

    // RECURRING SUBSCRIPTION MODE
    // For single restaurant: Create automatic recurring subscription
    // For multiple restaurants: Create individual subscriptions per restaurant
    if (items.length === 1) {
      // SINGLE RESTAURANT - Use subscription mode for automatic recurring billing
      const item = itemsWithPrices[0];

      // Get the Stripe Price ID for this plan and duration
      const priceId = item.duration === 'monthly'
        ? UNIFIED_PRICE_IDS.monthly
        : UNIFIED_PRICE_IDS.yearly;

      if (!priceId) {
        throw new Error(`No Stripe Price ID found for ${item.plan} ${item.duration}`);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_update: { address: 'auto' },
        mode: 'subscription', // ✅ AUTOMATIC RECURRING SUBSCRIPTION
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId, // Use actual Stripe Price ID
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        automatic_tax: { enabled: true },
        allow_promotion_codes: true,
        subscription_data: {
          metadata: {
            restaurant_id: item.restaurantId || '',
            restaurant_name: item.restaurantName,
            sales_order_id: salesOrder.id,
            sales_order_item_id: orderItems[0] ? String(orderItems[0].sales_order_id) : '',
            admin_sale: accessType === 'admin' ? 'true' : 'false',
            sales_rep_sale: accessType === 'sales' ? 'true' : 'false',
            created_by: userId!,
            created_by_role: accessType,
            market_slug: marketSlug,
          },
        },
        metadata: {
          restaurant_id: item.restaurantId || '',
          restaurant_name: item.restaurantName,
          sales_order_id: salesOrder.id,
          contact_name: contactName || '',
          email,
          phone: phone || '',
          created_by: userId!,
          created_by_role: accessType,
          market_slug: marketSlug,
        },
      });

      return NextResponse.json({
        checkoutUrl: session.url,
        sessionId: session.id,
        salesOrderId: salesOrder.id,
        subtotal: subtotalCents / 100,
        discountPercent,
        discountAmount: discountAmountCents / 100,
        total: totalCents / 100,
        restaurantCount: items.length,
      });
    } else {
      // MULTIPLE RESTAURANTS - Create payment mode, webhook will create individual subscriptions
      // TODO: Enhance webhook to create separate recurring subscriptions per restaurant
      const lineItems = itemsWithPrices.map(item => {
        const planName = item.plan === 'unified' ? 'Premium' : item.plan.charAt(0).toUpperCase() + item.plan.slice(1);
        const durationLabel = DURATION_LABELS[item.duration] || item.duration;

        return {
          price_data: {
            currency: 'usd',
            unit_amount: item.priceCents,
            product_data: {
              name: `${item.restaurantName} - ${planName} (${durationLabel})`,
              description: `${marketSlug === 'cumberland-pa' ? 'TasteCumberland' : marketSlug === 'fayetteville-nc' ? 'TasteFayetteville' : 'TasteLanc'} ${planName} subscription`,
            },
          },
          quantity: 1,
        };
      });

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_update: { address: 'auto' },
        mode: 'payment', // One-time payment, webhook creates subscriptions
        payment_method_types: ['card'],
        line_items: lineItems,
        payment_intent_data: {
          setup_future_usage: 'off_session',
        },
        saved_payment_method_options: {
          payment_method_save: 'enabled',
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        automatic_tax: { enabled: true },
        invoice_creation: { enabled: true },
        allow_promotion_codes: true,
        metadata: {
          multi_restaurant: 'true',
          admin_sale: accessType === 'admin' ? 'true' : 'false',
          sales_rep_sale: accessType === 'sales' ? 'true' : 'false',
          sales_order_id: salesOrder.id,
          contact_name: contactName || '',
          email,
          phone: phone || '',
          created_by: userId!,
          created_by_role: accessType,
          restaurant_count: String(items.length),
          discount_percent: String(discountPercent),
          market_slug: marketSlug,
        },
      });

      return NextResponse.json({
        checkoutUrl: session.url,
        sessionId: session.id,
        salesOrderId: salesOrder.id,
        subtotal: subtotalCents / 100,
        discountPercent,
        discountAmount: discountAmountCents / 100,
        total: totalCents / 100,
        restaurantCount: items.length,
      });
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
