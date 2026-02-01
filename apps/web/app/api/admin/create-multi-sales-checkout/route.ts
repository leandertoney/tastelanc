import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  getStripe,
  RESTAURANT_PRICE_IDS,
  RESTAURANT_PRICES,
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

/**
 * Creates or retrieves a Stripe coupon for bulk discounts.
 */
async function getOrCreateBulkCoupon(discountPercent: number): Promise<string | null> {
  if (discountPercent <= 0) return null;

  const stripe = getStripe();
  const couponId = `BULK_${discountPercent}PCT`;

  try {
    const existingCoupon = await stripe.coupons.retrieve(couponId);
    return existingCoupon.id;
  } catch {
    const coupon = await stripe.coupons.create({
      id: couponId,
      percent_off: discountPercent,
      duration: 'forever',
      name: `${discountPercent}% Multi-Location Discount`,
    });
    return coupon.id;
  }
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

    // Validate each item and get price details
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

      return { ...item, priceCents, priceId, priceDollars };
    });

    // Calculate totals
    const subtotalCents = itemsWithPrices.reduce((sum, item) => sum + item.priceCents, 0);
    const discountPercent = getDiscountPercent(items.length);
    const discountAmountCents = Math.round(subtotalCents * discountPercent / 100);
    const totalCents = subtotalCents - discountAmountCents;

    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    // Create or retrieve Stripe customer
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      await stripe.customers.update(customerId, {
        name: contactName || existingCustomers.data[0].name || items[0].restaurantName,
        phone: phone || existingCustomers.data[0].phone || undefined,
        metadata: {
          ...existingCustomers.data[0].metadata,
          contact_name: contactName || existingCustomers.data[0].metadata?.contact_name || '',
          updated_by_admin: user.id,
        },
      });
    } else {
      const customer = await stripe.customers.create({
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

    // Create sales_order in database FIRST (webhook will look this up)
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
      discounted_price_cents: item.priceCents - Math.round(item.priceCents * discountPercent / 100),
      processing_status: 'pending',
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('sales_order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Failed to create sales order items:', itemsError);
      // Clean up the sales order
      await supabaseAdmin.from('sales_orders').delete().eq('id', salesOrder.id);
      return NextResponse.json({ error: 'Failed to create sales order items' }, { status: 500 });
    }

    // Get or create bulk discount coupon
    const couponId = await getOrCreateBulkCoupon(discountPercent);

    // Create line items for Stripe Checkout (one item per restaurant subscription)
    const lineItems = itemsWithPrices.map(item => ({
      price: item.priceId,
      quantity: 1,
    }));

    // Create Stripe Checkout session with sales_order_id in metadata
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_update: { address: 'auto' },
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/sales?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/sales?canceled=true`,
      discounts: couponId ? [{ coupon: couponId }] : undefined,
      automatic_tax: { enabled: true },
      metadata: {
        multi_restaurant: 'true',  // This is what the webhook checks for!
        admin_sale: 'true',
        sales_order_id: salesOrder.id,  // Webhook looks this up
        contact_name: contactName || '',
        email,
        phone: phone || '',
        created_by_admin: user.id,
        restaurant_count: String(items.length),
      },
      allow_promotion_codes: false,
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
