import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function generateCode(secret: string, timestamp: number): string {
  const bucket = Math.floor(timestamp / 60); // 60-second windows
  const hmac = crypto.createHmac('sha256', secret).update(bucket.toString()).digest('hex');
  return hmac.substring(0, 6).toUpperCase();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> }
) {
  try {
    const { claimId } = await params;
    const supabase = await createClient();

    // Require authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Get the claim — only if it belongs to this user
    const { data: claim, error: claimError } = await serviceClient
      .from('coupon_claims')
      .select('id, user_id, status, claim_secret, coupon:coupons!inner(id, title, end_date)')
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
        { error: `This coupon has already been ${claim.status}` },
        { status: 400 }
      );
    }

    // Check if coupon has expired
    const coupon = claim.coupon as unknown as { id: string; title: string; end_date: string | null };
    if (coupon.end_date) {
      const today = new Date().toISOString().split('T')[0];
      if (coupon.end_date < today) {
        // Auto-expire the claim
        await serviceClient
          .from('coupon_claims')
          .update({ status: 'expired' })
          .eq('id', claimId);

        return NextResponse.json(
          { error: 'This coupon has expired' },
          { status: 400 }
        );
      }
    }

    // Generate rotating code
    const now = Math.floor(Date.now() / 1000);
    const code = generateCode(claim.claim_secret, now);

    // Calculate when this code expires
    const currentBucket = Math.floor(now / 60);
    const bucketEnd = (currentBucket + 1) * 60;
    const expiresIn = bucketEnd - now;

    return NextResponse.json({
      code,
      expires_in: expiresIn,
      valid_until: new Date(bucketEnd * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error in coupon code API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
