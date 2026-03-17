import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceRoleClient();

    const { data: existingCoupon, error: fetchError } = await serviceClient
      .from('coupons')
      .select('restaurant_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingCoupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    const accessResult = await verifyRestaurantAccess(supabase, existingCoupon.restaurant_id);

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

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (discount_type !== undefined) updateData.discount_type = discount_type;
    if (discount_value !== undefined) updateData.discount_value = discount_value ? parseFloat(discount_value) : null;
    if (original_price !== undefined) updateData.original_price = original_price ? parseFloat(original_price) : null;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (days_of_week !== undefined) updateData.days_of_week = days_of_week;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (max_claims_total !== undefined) updateData.max_claims_total = max_claims_total;
    if (max_claims_per_user !== undefined) updateData.max_claims_per_user = max_claims_per_user;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data: coupon, error } = await serviceClient
      .from('coupons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating coupon:', error);
      return NextResponse.json(
        { error: 'Failed to update coupon' },
        { status: 500 }
      );
    }

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('Error in update coupon API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceRoleClient();

    const { data: existingCoupon, error: fetchError } = await serviceClient
      .from('coupons')
      .select('restaurant_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingCoupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    const accessResult = await verifyRestaurantAccess(supabase, existingCoupon.restaurant_id);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const { error } = await serviceClient
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting coupon:', error);
      return NextResponse.json(
        { error: 'Failed to delete coupon' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete coupon API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
