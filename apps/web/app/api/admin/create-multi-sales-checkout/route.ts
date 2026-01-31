import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

function getPriceId(plan: string, duration: string): string | null {
  const key = `${plan}_${duration}` as keyof typeof RESTAURANT_PRICE_IDS;
  return RESTAURANT_PRICE_IDS[key] || null;
}

/**
 * Creates or retrieves a Stripe coupon for bulk discounts.
 * Coupons are reusable and named by percentage.
 */
async function getOrCreateBulkCoupon(discountPercent: number): Promise<string | null> {
  if (discountPercent <= 0) return null;

  const stripe = getStripe();
  const couponId = `BULK_${discountPercent}PCT`;

  try {
    // Try to retrieve existing coupon
    const existingCoupon = await stripe.coupons.retrieve(couponId);
    return existingCoupon.id;
  } catch {
    // Coupon doesn't exist, create it
    const coupon = await stripe.coupons.create({
      id: couponId,
      percent_off: discountPercent,
      duration: 'forever', // Applies to all billing cycles
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

    // Create or retrieve Stripe customer
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      // Update customer info if needed
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

    // Get or create bulk discount coupon
    const couponId = await getOrCreateBulkCoupon(discountPercent);

    // Create line items for Stripe Checkout
    const lineItems = itemsWithPrices.map(item => ({
      price: item.priceId,
      quantity: 1,
    }));

    // Build metadata for webhook to process
    const itemsMetadata = items.map((item) => ({
      restaurantId: item.restaurantId || '',
      restaurantName: item.restaurantName,
      isNewRestaurant: item.isNewRestaurant,
      plan: item.plan,
      duration: item.duration,
    }));

    // Create Stripe Checkout session
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
        subscription_type: 'restaurant_multi',
        admin_sale: 'true',
        contact_name: contactName || '',
        email,
        phone: phone || '',
        created_by_admin: user.id,
        restaurant_count: String(items.length),
        items_json: JSON.stringify(itemsMetadata),
      },
      allow_promotion_codes: false, // We're applying our own discount
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
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
