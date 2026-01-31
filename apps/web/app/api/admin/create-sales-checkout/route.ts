import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe, RESTAURANT_PRICE_IDS, RESTAURANT_PRICES } from '@/lib/stripe';

// Map plan and duration to price ID
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

    // Check admin by email (consistent with middleware)
    const isAdmin = user.email === 'admin@tastelanc.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      businessName,
      contactName,
      email,
      phone,
      restaurantId, // Existing restaurant ID (optional)
      plan, // 'starter', 'premium', 'elite'
      duration, // '3mo', '6mo', 'yearly'
    } = body;

    // Validate required fields
    if (!businessName || !email || !plan || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the price ID
    const priceId = getPriceId(plan, duration);
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan or duration' },
        { status: 400 }
      );
    }

    // Get price amount for display
    const priceInfo = RESTAURANT_PRICES[plan as keyof typeof RESTAURANT_PRICES];
    const durationKey = duration as keyof typeof priceInfo;
    const amount = priceInfo?.[durationKey];

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
        name: contactName || businessName,
        phone,
        metadata: {
          business_name: businessName,
          contact_name: contactName || '',
          created_by_admin: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/sales/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/sales/new?canceled=true`,
      automatic_tax: { enabled: true },
      metadata: {
        subscription_type: 'restaurant',
        business_name: businessName,
        contact_name: contactName || '',
        email,
        phone: phone || '',
        restaurant_id: restaurantId || '',
        plan,
        duration,
        created_by_admin: user.id,
        admin_sale: 'true',
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Pre-fill customer email
      customer_email: undefined, // Already have customer
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      amount,
      plan,
      duration,
    });
  } catch (error) {
    console.error('Error creating sales checkout:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
