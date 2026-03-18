import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const { couponId } = await params;
    const serviceClient = createServiceRoleClient();

    // Verify auth from Bearer token (mobile sends Authorization header, not cookies)
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'You must be signed in to claim a coupon' },
        { status: 401 }
      );
    }
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to claim a coupon' },
        { status: 401 }
      );
    }

    // Get the coupon and check availability
    const { data: coupon, error: couponError } = await serviceClient
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .single();

    if (couponError || !coupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    if (!coupon.is_active) {
      return NextResponse.json(
        { error: 'This coupon is no longer active' },
        { status: 400 }
      );
    }

    // Check end date
    const today = new Date().toISOString().split('T')[0];
    if (coupon.end_date && coupon.end_date < today) {
      return NextResponse.json(
        { error: 'This coupon has expired' },
        { status: 400 }
      );
    }

    // Check max total claims
    if (coupon.max_claims_total && coupon.claims_count >= coupon.max_claims_total) {
      return NextResponse.json(
        { error: 'This coupon has reached its maximum number of claims' },
        { status: 400 }
      );
    }

    // Check per-user claim limit
    const { data: existingClaims } = await serviceClient
      .from('coupon_claims')
      .select('id, status')
      .eq('coupon_id', couponId)
      .eq('user_id', user.id);

    const activeClaims = (existingClaims || []).filter(c => c.status === 'claimed' || c.status === 'redeemed');
    if (activeClaims.length >= (coupon.max_claims_per_user || 1)) {
      return NextResponse.json(
        { error: 'You have already claimed this coupon' },
        { status: 400 }
      );
    }

    // Create the claim — email captured for platform use only
    const { data: claim, error: claimError } = await serviceClient
      .from('coupon_claims')
      .insert({
        coupon_id: couponId,
        user_id: user.id,
        user_email: user.email || '',
        status: 'claimed',
      })
      .select()
      .single();

    if (claimError) {
      // Handle unique constraint violation
      if (claimError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already claimed this coupon' },
          { status: 400 }
        );
      }
      console.error('Error creating claim:', claimError);
      return NextResponse.json(
        { error: 'Failed to claim coupon' },
        { status: 500 }
      );
    }

    // Increment claims_count
    await serviceClient
      .from('coupons')
      .update({ claims_count: (coupon.claims_count || 0) + 1 })
      .eq('id', couponId);

    return NextResponse.json({
      claim: {
        id: claim.id,
        coupon_id: claim.coupon_id,
        status: claim.status,
        claimed_at: claim.claimed_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error in claim coupon API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
