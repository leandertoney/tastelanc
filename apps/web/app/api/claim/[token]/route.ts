import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    const { data: draft, error } = await serviceClient
      .from('event_drafts')
      .select('id, flyer_image_url, extracted_json, edited_json, status, publishing_path, matched_venue_id, claim_token_expires_at, market_id')
      .eq('claim_token', token)
      .single();

    if (error || !draft) {
      return NextResponse.json({ error: 'Invalid or expired claim link' }, { status: 404 });
    }

    // Check expiry
    if (draft.claim_token_expires_at && new Date(draft.claim_token_expires_at) < new Date()) {
      // Mark as expired
      await serviceClient
        .from('event_drafts')
        .update({ status: 'expired' })
        .eq('id', draft.id);

      return NextResponse.json({ error: 'This claim link has expired' }, { status: 410 });
    }

    // Check if already claimed/published
    if (draft.status === 'published') {
      return NextResponse.json({
        error: 'This event has already been published',
        status: draft.status,
      }, { status: 409 });
    }

    // Merge extracted + edited for display
    const extracted = (draft.extracted_json || {}) as Record<string, unknown>;
    const edited = (draft.edited_json || {}) as Record<string, unknown>;
    const merged = { ...extracted, ...edited };

    return NextResponse.json({
      draft_id: draft.id,
      flyer_image_url: draft.flyer_image_url,
      event_details: merged,
      publishing_path: draft.publishing_path,
      status: draft.status,
      requires_payment: draft.publishing_path === 'promoter_paid' || draft.publishing_path === 'send_to_organizer',
    });
  } catch (error) {
    console.error('Error fetching claim:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
