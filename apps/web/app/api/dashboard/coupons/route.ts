import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const accessResult = await verifyRestaurantAccess(supabase, restaurantId);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const dbClient = (accessResult.isAdmin || accessResult.isSalesRep) ? createServiceRoleClient() : supabase;

    const { data: coupons, error } = await dbClient
      .from('coupons')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coupons:', error);
      return NextResponse.json(
        { error: 'Failed to fetch coupons' },
        { status: 500 }
      );
    }

    return NextResponse.json({ coupons: coupons || [] });
  } catch (error) {
    console.error('Error in coupons API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const accessResult = await verifyRestaurantAccess(supabase, restaurantId);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const body = await request.json();
    const {
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
      max_claims_total,
      max_claims_per_user,
      is_active,
    } = body;

    if (!title || !discount_type) {
      return NextResponse.json(
        { error: 'title and discount_type are required' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    const { data: coupon, error } = await serviceClient
      .from('coupons')
      .insert({
        restaurant_id: restaurantId,
        title,
        description: description || null,
        discount_type,
        discount_value: discount_value ? parseFloat(discount_value) : null,
        original_price: original_price ? parseFloat(original_price) : null,
        image_url: image_url || null,
        start_date: start_date || new Date().toISOString().split('T')[0],
        end_date: end_date || null,
        days_of_week: days_of_week || [],
        start_time: start_time || null,
        end_time: end_time || null,
        max_claims_total: max_claims_total ? parseInt(max_claims_total) : null,
        max_claims_per_user: max_claims_per_user ? parseInt(max_claims_per_user) : 1,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating coupon:', error);
      return NextResponse.json(
        { error: 'Failed to create coupon' },
        { status: 500 }
      );
    }

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    console.error('Error in create coupon API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
