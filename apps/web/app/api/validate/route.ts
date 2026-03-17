import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function generateCode(secret: string, timestamp: number): string {
  const bucket = Math.floor(timestamp / 60);
  const hmac = crypto.createHmac('sha256', secret).update(bucket.toString()).digest('hex');
  return hmac.substring(0, 6).toUpperCase();
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 }); // 1 minute window
    return true;
  }

  if (entry.count >= 10) {
    return false; // 10 attempts per minute
  }

  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many validation attempts. Please wait a moment.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-character code' },
        { status: 400 }
      );
    }

    const inputCode = code.toUpperCase();
    const serviceClient = createServiceRoleClient();
    const now = Math.floor(Date.now() / 1000);

    // Get all active (claimed) claims with their secrets
    const { data: activeClaims, error: claimsError } = await serviceClient
      .from('coupon_claims')
      .select(`
        id,
        claim_secret,
        coupon:coupons!inner(
          id,
          title,
          description,
          discount_type,
          discount_value,
          restaurant:restaurants!inner(
            name
          )
        )
      `)
      .eq('status', 'claimed');

    if (claimsError) {
      console.error('Error fetching claims:', claimsError);
      return NextResponse.json(
        { error: 'Validation service error' },
        { status: 500 }
      );
    }

    // Check current window and previous window (handles edge timing)
    let matchedClaim: (typeof activeClaims)[number] | null = null;

    for (const claim of activeClaims || []) {
      const currentCode = generateCode(claim.claim_secret, now);
      const previousCode = generateCode(claim.claim_secret, now - 60);

      if (currentCode === inputCode || previousCode === inputCode) {
        matchedClaim = claim;
        break;
      }
    }

    if (!matchedClaim) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired code' },
        { status: 200 }
      );
    }

    // Mark as redeemed
    const { error: updateError } = await serviceClient
      .from('coupon_claims')
      .update({
        status: 'redeemed',
        redeemed_at: new Date().toISOString(),
      })
      .eq('id', matchedClaim.id);

    if (updateError) {
      console.error('Error redeeming claim:', updateError);
      return NextResponse.json(
        { error: 'Failed to redeem coupon' },
        { status: 500 }
      );
    }

    const coupon = matchedClaim.coupon as unknown as {
      id: string;
      title: string;
      description: string | null;
      discount_type: string;
      discount_value: number | null;
      restaurant: { name: string };
    };

    return NextResponse.json({
      valid: true,
      coupon: {
        title: coupon.title,
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        restaurant_name: coupon.restaurant.name,
      },
    });
  } catch (error) {
    console.error('Error in validate API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
