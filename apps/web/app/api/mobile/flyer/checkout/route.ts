import { NextResponse } from 'next/server';
import { createMobileClient } from '@/lib/supabase/mobile-auth';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';
import { getEventPromotionPriceId } from '@/lib/flyer/stripe-prices';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export async function POST(request: Request) {
  try {
    const supabase = createMobileClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { draft_id } = await request.json();

    if (!draft_id) {
      return NextResponse.json({ error: 'draft_id is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch the draft and verify ownership
    const { data: draft, error: draftError } = await serviceClient
      .from('event_drafts')
      .select('*')
      .eq('id', draft_id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    if (draft.created_by_user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (draft.status !== 'pending_payment') {
      return NextResponse.json(
        { error: `Draft is not in pending_payment status (current: ${draft.status})` },
        { status: 400 }
      );
    }

    // Look up the market-specific Stripe price
    const priceId = await getEventPromotionPriceId(serviceClient, draft.market_id);
    if (!priceId) {
      return NextResponse.json(
        { error: 'Event promotion pricing not configured for this market' },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session (one-time payment)
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        type: 'event_promotion',
        draft_id: draft.id,
        scanner_user_id: user.id,
      },
      success_url: `${SITE_URL}/flyer/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/flyer/canceled`,
      customer_email: user.email,
    });

    // Store session ID on draft
    await serviceClient
      .from('event_drafts')
      .update({ stripe_session_id: session.id })
      .eq('id', draft.id);

    return NextResponse.json({ checkout_url: session.url });
  } catch (error) {
    console.error('Error creating flyer checkout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
