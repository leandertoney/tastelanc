import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe, SELF_PROMOTER_PRICE_IDS, SELF_PROMOTER_PRICES } from '@/lib/stripe';

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
      artistName,
      contactName,
      email,
      phone,
      genre,
    } = body;

    // Validate required fields
    if (!artistName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields (artistName, email)' },
        { status: 400 }
      );
    }

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
        name: contactName || artistName,
        phone,
        metadata: {
          artist_name: artistName,
          contact_name: contactName || '',
          subscription_type: 'self_promoter',
          created_by_admin: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session for self-promoter subscription
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      customer_update: { address: 'auto' },
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: SELF_PROMOTER_PRICE_IDS.monthly,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/self-promoters/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/self-promoters/new?canceled=true`,
      automatic_tax: { enabled: true },
      metadata: {
        subscription_type: 'self_promoter',
        artist_name: artistName,
        contact_name: contactName || '',
        email,
        phone: phone || '',
        genre: genre || '',
        created_by_admin: user.id,
        admin_sale: 'true',
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      amount: SELF_PROMOTER_PRICES.monthly,
      plan: 'self_promoter',
      duration: 'monthly',
    });
  } catch (error) {
    console.error('Error creating self-promoter checkout:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
