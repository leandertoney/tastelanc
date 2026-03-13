import { NextResponse } from 'next/server';
import { createMobileClient } from '@/lib/supabase/mobile-auth';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { publishEventFromDraft } from '@/lib/flyer/publish-event';
import crypto from 'crypto';

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

    const body = await request.json();
    const {
      flyer_image_url,
      extracted_json,
      edited_json,
      matched_venue_id,
      publishing_path,
      market_id,
    } = body;

    if (!market_id) {
      return NextResponse.json({ error: 'market_id is required' }, { status: 400 });
    }

    if (!publishing_path || !['venue_free', 'promoter_paid', 'send_to_organizer'].includes(publishing_path)) {
      return NextResponse.json({ error: 'Invalid publishing_path' }, { status: 400 });
    }

    if (publishing_path === 'venue_free' && !matched_venue_id) {
      return NextResponse.json(
        { error: 'matched_venue_id is required for free venue listings' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Generate claim token for send_to_organizer path
    let claimToken: string | null = null;
    let claimUrl: string | null = null;
    if (publishing_path === 'send_to_organizer') {
      claimToken = crypto.randomUUID();
      claimUrl = `${SITE_URL}/claim/${claimToken}`;
    }

    // Determine initial status
    let status: string;
    if (publishing_path === 'send_to_organizer') {
      status = 'pending_claim';
    } else if (publishing_path === 'promoter_paid') {
      status = 'pending_payment';
    } else {
      // venue_free: check if user owns the venue
      const { data: restaurant } = await serviceClient
        .from('restaurants')
        .select('owner_id')
        .eq('id', matched_venue_id)
        .single();

      status = (restaurant?.owner_id === user.id) ? 'draft' : 'pending_review';
    }

    // Create the draft
    const { data: draft, error: draftError } = await serviceClient
      .from('event_drafts')
      .insert({
        flyer_image_url,
        extracted_json,
        edited_json,
        created_by_user_id: user.id,
        status,
        publishing_path,
        matched_venue_id,
        claim_token: claimToken,
        market_id,
      })
      .select()
      .single();

    if (draftError) {
      console.error('Failed to create draft:', draftError);
      return NextResponse.json(
        { error: `Failed to create draft: ${draftError.message}` },
        { status: 500 }
      );
    }

    // For venue_free where user is the owner, publish immediately
    if (publishing_path === 'venue_free' && status === 'draft') {
      const publishResult = await publishEventFromDraft(serviceClient, draft);
      if (publishResult.success) {
        return NextResponse.json({
          draft_id: draft.id,
          status: 'published',
          event_id: publishResult.event_id,
        }, { status: 201 });
      }
      // If publish fails, draft still exists for retry
      return NextResponse.json({
        draft_id: draft.id,
        status: 'draft',
        error: publishResult.error,
      }, { status: 201 });
    }

    // For send_to_organizer, create pending scanner reward
    if (publishing_path === 'send_to_organizer') {
      await serviceClient
        .from('scanner_rewards')
        .insert({
          scanner_user_id: user.id,
          draft_id: draft.id,
          amount_credits: 500,
          status: 'pending',
        });
    }

    return NextResponse.json({
      draft_id: draft.id,
      status: draft.status,
      claim_token: claimToken,
      claim_url: claimUrl,
    }, { status: 201 });
  } catch (error) {
    console.error('Error in flyer draft creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createMobileClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return user's drafts
    const serviceClient = createServiceRoleClient();
    const { data: drafts, error } = await serviceClient
      .from('event_drafts')
      .select('*')
      .eq('created_by_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
    }

    return NextResponse.json({ drafts: drafts || [] });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
