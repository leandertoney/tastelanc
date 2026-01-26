import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import {
  getStripe,
  RESTAURANT_PRICES,
  RESTAURANT_PRICE_IDS,
  DURATION_LABELS,
  getDiscountPercent,
} from '@/lib/stripe';

interface CheckoutItem {
  restaurantId: string | null;
  restaurantName: string;
  isNewRestaurant: boolean;
  plan: 'premium' | 'elite';
  duration: '3mo' | '6mo' | 'yearly';
}

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getPriceId(plan: string, duration: string): string | null {
  const key = `${plan}_${duration}` as keyof typeof RESTAURANT_PRICE_IDS;
  return RESTAURANT_PRICE_IDS[key] || null;
}

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

    const body = await request.json();
    const { email, contactName, phone, items } = body as {
      email: string;
      contactName?: string;
      phone?: string;
      items: CheckoutItem[];
    };

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: 'Customer email is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one restaurant is required' }, { status: 400 });
    }

    if (items.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 restaurants per order' }, { status: 400 });
    }

    // Validate each item and calculate prices
    const itemsWithPrices = items.map((item, index) => {
      if (!item.restaurantName) {
        throw new Error(`Item ${index + 1}: Restaurant name is required`);
      }
      if (!['premium', 'elite'].includes(item.plan)) {
        throw new Error(`Item ${index + 1}: Invalid plan "${item.plan}"`);
      }
      if (!['3mo', '6mo', 'yearly'].includes(item.duration)) {
        throw new Error(`Item ${index + 1}: Invalid duration "${item.duration}"`);
      }

      const priceId = getPriceId(item.plan, item.duration);
      if (!priceId) {
        throw new Error(`Item ${index + 1}: Invalid plan/duration combination`);
      }

      const prices = RESTAURANT_PRICES[item.plan as keyof typeof RESTAURANT_PRICES];
      const priceDollars = prices[item.duration as keyof typeof prices];
      const priceCents = priceDollars * 100;

      return { ...item, priceCents, priceId };
    });

    // Calculate totals
    const subtotalCents = itemsWithPrices.reduce((sum, item) => sum + item.priceCents, 0);
    const discountPercent = getDiscountPercent(items.length);
    const discountAmountCents = Math.round(subtotalCents * discountPercent / 100);
    const totalCents = subtotalCents - discountAmountCents;

    // Create or retrieve Stripe customer
    const existingCustomers = await getStripe().customers.list({
      email,
      limit: 1,
    });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await getStripe().customers.create({
        email,
        name: contactName || items[0].restaurantName,
        phone: phone || undefined,
        metadata: {
          contact_name: contactName || '',
          created_by_admin: user.id,
        },
      });
      customerId = customer.id;
    }

    // Insert sales order into database
    const supabaseAdmin = getSupabaseAdmin();

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
        created_by_admin: user.id,
      })
      .select('id')
      .single();

    if (orderError || !salesOrder) {
      console.error('Failed to create sales order:', orderError);
      return NextResponse.json({ error: 'Failed to create sales order' }, { status: 500 });
    }

    // Insert sales order items
    const orderItems = itemsWithPrices.map(item => ({
      sales_order_id: salesOrder.id,
      restaurant_id: item.restaurantId || null,
      restaurant_name: item.restaurantName,
      is_new_restaurant: item.isNewRestaurant,
      plan: item.plan,
      duration: item.duration,
      price_cents: item.priceCents,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('sales_order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Failed to create sales order items:', itemsError);
      // Clean up the order
      await supabaseAdmin.from('sales_orders').delete().eq('id', salesOrder.id);
      return NextResponse.json({ error: 'Failed to create sales order items' }, { status: 500 });
    }

    // Build Stripe Checkout line items with discount baked into each item's price
    const lineItems = itemsWithPrices.map(item => {
      const planName = item.plan.charAt(0).toUpperCase() + item.plan.slice(1);
      const durationLabel = DURATION_LABELS[item.duration] || item.duration;
      const discountedCents = item.priceCents - Math.round(item.priceCents * discountPercent / 100);

      const name = discountPercent > 0
        ? `${item.restaurantName} — ${planName} (${durationLabel}) · ${discountPercent}% multi-location discount`
        : `${item.restaurantName} — ${planName} (${durationLabel})`;

      return {
        price_data: {
          currency: 'usd',
          product_data: { name },
          unit_amount: discountedCents,
        },
        quantity: 1,
      };
    });

    // Create Stripe Checkout Session in payment mode
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      metadata: {
        subscription_type: 'restaurant',
        admin_sale: 'true',
        multi_restaurant: 'true',
        sales_order_id: salesOrder.id,
        restaurant_count: String(items.length),
        discount_percent: String(discountPercent),
        email,
        contact_name: contactName || '',
        phone: phone || '',
        created_by_admin: user.id,
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/sales?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/sales?canceled=true`,
    };

    const session = await getStripe().checkout.sessions.create(sessionParams);

    // Update sales order with checkout session ID
    await supabaseAdmin
      .from('sales_orders')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', salesOrder.id);

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      subtotal: subtotalCents / 100,
      discountPercent,
      discountAmount: discountAmountCents / 100,
      total: totalCents / 100,
    });
  } catch (error) {
    console.error('Error creating multi-sales checkout:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
