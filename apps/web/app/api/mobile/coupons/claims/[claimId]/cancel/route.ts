import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> }
) {
  try {
    const { claimId } = await params;
    const serviceClient = createServiceRoleClient();

    // Verify auth from Bearer token (mobile sends Authorization header, not cookies)
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the claim
    const { data: claim, error: claimError } = await serviceClient
      .from('coupon_claims')
      .select('id, user_id, status, coupon_id')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }

    if (claim.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (claim.status !== 'claimed') {
      return NextResponse.json(
        { error: `Cannot cancel a coupon that has been ${claim.status}` },
        { status: 400 }
      );
    }

    // Cancel the claim
    const { error: updateError } = await serviceClient
      .from('coupon_claims')
      .update({ status: 'cancelled' })
      .eq('id', claimId);

    if (updateError) {
      console.error('Error cancelling claim:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel coupon' },
        { status: 500 }
      );
    }

    // Decrement claims count
    const { data: coupon } = await serviceClient
      .from('coupons')
      .select('claims_count')
      .eq('id', claim.coupon_id)
      .single();

    if (coupon && coupon.claims_count > 0) {
      await serviceClient
        .from('coupons')
        .update({ claims_count: coupon.claims_count - 1 })
        .eq('id', claim.coupon_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in cancel claim API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
