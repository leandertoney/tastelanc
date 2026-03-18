import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const serviceClient = createServiceRoleClient();

    // Verify auth from Bearer token (mobile sends Authorization header, not cookies)
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'You must be signed in to view your coupons' },
        { status: 401 }
      );
    }
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to view your coupons' },
        { status: 401 }
      );
    }

    const { data: claims, error } = await serviceClient
      .from('coupon_claims')
      .select(`
        id,
        status,
        claimed_at,
        redeemed_at,
        coupon:coupons!inner(
          id,
          title,
          description,
          discount_type,
          discount_value,
          original_price,
          image_url,
          start_date,
          end_date,
          days_of_week,
          start_time,
          end_time,
          restaurant:restaurants!inner(
            id,
            name,
            cover_image_url,
            slug
          )
        )
      `)
      .eq('user_id', user.id)
      .order('claimed_at', { ascending: false });

    if (error) {
      console.error('Error fetching claims:', error);
      return NextResponse.json(
        { error: 'Failed to fetch your coupons' },
        { status: 500 }
      );
    }

    return NextResponse.json({ claims: claims || [] });
  } catch (error) {
    console.error('Error in my coupons API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
