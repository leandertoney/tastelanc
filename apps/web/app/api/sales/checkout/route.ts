import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import {
  getStripe,
  RESTAURANT_PRICES,
  getDiscountPercent,
  DURATION_LABELS,
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const body = await request.json();
    const { email, contactName, phone, items } = body as {
      email: string;
      contactName?: string;
      phone?: string;
      items: CheckoutItem[];
    };

    if (!email) {
      return NextResponse.json({ error: 'Customer email is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one restaurant is required' }, { status: 400 });
    }

    if (items.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 restaurants per order' }, { status: 400 });
    }

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

      const prices = RESTAURANT_PRICES[item.plan as keyof typeof RESTAURANT_PRICES];
      const priceDollars = prices[item.duration as keyof typeof prices];
      const priceCents = priceDollars * 100;

      return { ...item, priceCents, priceDollars };
    });

    const subtotalCents = itemsWithPrices.reduce((sum, item) => sum + item.priceCents, 0);
    const discountPercent = getDiscountPercent(items.length);
    const discountAmountCents = Math.round(subtotalCents * discountPercent / 100);
    const totalCents = subtotalCents - discountAmountCents;

    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

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
          updated_by: access.userId!,
        },
      });
    } else {
      const customer = await stripe.customers.create({
        email,
        name: contactName || items[0].restaurantName,
        phone: phone || undefined,
        metadata: {
          contact_name: contactName || '',
          created_by: access.userId!,
        },
      });
      customerId = customer.id;
    }

    // Create sales_order
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
        created_by_admin: access.userId,
        status: 'pending',
      })
      .select('id')
      .single();

    if (orderError || !salesOrder) {
      console.error('Failed to create sales order:', orderError);
      return NextResponse.json({ error: 'Failed to create sales order' }, { status: 500 });
    }

    const orderItems = itemsWithPrices.map(item => ({
      sales_order_id: salesOrder.id,
      restaurant_id: item.restaurantId || null,
      restaurant_name: item.restaurantName,
      is_new_restaurant: item.isNewRestaurant || !item.restaurantId,
      plan: item.plan,
      duration: item.duration,
      price_cents: item.priceCents,
      discounted_price_cents: item.priceCents - Math.round(item.priceCents * discountPercent / 100),
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

    const lineItems = itemsWithPrices.map(item => {
      const discountedCents = item.priceCents - Math.round(item.priceCents * discountPercent / 100);
      const planName = item.plan.charAt(0).toUpperCase() + item.plan.slice(1);
      const durationLabel = DURATION_LABELS[item.duration] || item.duration;

      return {
        price_data: {
          currency: 'usd',
          unit_amount: discountedCents,
          product_data: {
            name: `${item.restaurantName} - ${planName} (${durationLabel})`,
            description: discountPercent > 0
              ? `TasteLanc ${planName} subscription (${discountPercent}% multi-location discount applied)`
              : `TasteLanc ${planName} subscription`,
          },
        },
        quantity: 1,
      };
    });

    // Redirect back to sales dashboard on success/cancel
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_update: { address: 'auto' },
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/sales/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/sales/checkout?canceled=true`,
      automatic_tax: { enabled: true },
      invoice_creation: { enabled: true },
      metadata: {
        multi_restaurant: 'true',
        admin_sale: 'true',
        sales_order_id: salesOrder.id,
        contact_name: contactName || '',
        email,
        phone: phone || '',
        created_by: access.userId!,
        restaurant_count: String(items.length),
        discount_percent: String(discountPercent),
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
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
