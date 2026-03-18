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

    // Verify auth from Bearer token
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get the claim and verify ownership
    const { data: claim, error: claimError } = await serviceClient
      .from('coupon_claims')
      .select('id, user_id, status')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    if (claim.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (claim.status !== 'claimed') {
      return NextResponse.json(
        { error: `This coupon has already been ${claim.status}` },
        { status: 400 }
      );
    }

    // Mark as redeemed
    const { error: updateError } = await serviceClient
      .from('coupon_claims')
      .update({
        status: 'redeemed',
        redeemed_at: new Date().toISOString(),
      })
      .eq('id', claimId);

    if (updateError) {
      console.error('Error redeeming claim:', updateError);
      return NextResponse.json({ error: 'Failed to redeem coupon' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      confirmation_code: claimId.slice(-6).toUpperCase(),
    });
  } catch (error) {
    console.error('Error in redeem claim API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
