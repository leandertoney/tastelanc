import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';
import { publishEventFromDraft } from '@/lib/flyer/publish-event';
import { getEventPromotionPriceId } from '@/lib/flyer/stripe-prices';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch draft by claim token
    const { data: draft, error: draftError } = await serviceClient
      .from('event_drafts')
      .select('*')
      .eq('claim_token', token)
      .single();

    if (draftError || !draft) {
      return NextResponse.json({ error: 'Invalid claim link' }, { status: 404 });
    }

    // Check expiry
    if (draft.claim_token_expires_at && new Date(draft.claim_token_expires_at) < new Date()) {
      await serviceClient
        .from('event_drafts')
        .update({ status: 'expired' })
        .eq('id', draft.id);
      return NextResponse.json({ error: 'This claim link has expired' }, { status: 410 });
    }

    if (draft.status === 'published') {
      return NextResponse.json({ error: 'Already published' }, { status: 409 });
    }

    // Determine if payment is needed
    const requiresPayment = draft.publishing_path === 'promoter_paid' ||
      (draft.publishing_path === 'send_to_organizer' && !draft.matched_venue_id);

    if (requiresPayment) {
      // Look up market-specific Stripe price
      const priceId = await getEventPromotionPriceId(serviceClient, draft.market_id);
      if (!priceId) {
        return NextResponse.json(
          { error: 'Event promotion pricing not configured for this market' },
          { status: 500 }
        );
      }

      // Create Stripe checkout session for the organizer
      const stripe = getStripe();

      const body = await request.json().catch(() => ({}));
      const email = (body as Record<string, string>).email;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: {
          type: 'event_promotion',
          draft_id: draft.id,
          scanner_user_id: draft.created_by_user_id,
          claim_token: token,
        },
        success_url: `${SITE_URL}/claim/${token}/success`,
        cancel_url: `${SITE_URL}/claim/${token}`,
        ...(email ? { customer_email: email } : {}),
      });

      // Update draft with session ID
      await serviceClient
        .from('event_drafts')
        .update({ stripe_session_id: session.id, status: 'pending_payment' })
        .eq('id', draft.id);

      return NextResponse.json({ checkout_url: session.url });
    }

    // Free venue listing: publish directly
    // For send_to_organizer with a matched venue, the organizer can claim for free
    const publishResult = await publishEventFromDraft(serviceClient, {
      ...draft,
      publishing_path: 'venue_free',
    });

    if (!publishResult.success) {
      return NextResponse.json(
        { error: publishResult.error || 'Failed to publish event' },
        { status: 500 }
      );
    }

    // Award scanner credits
    await serviceClient
      .from('scanner_rewards')
      .update({ status: 'earned', event_id: publishResult.event_id })
      .eq('draft_id', draft.id)
      .eq('status', 'pending');

    return NextResponse.json({
      published: true,
      event_id: publishResult.event_id,
    });
  } catch (error) {
    console.error('Error claiming event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
