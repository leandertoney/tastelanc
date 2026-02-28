import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // First, get the special to find its restaurant_id
    const { data: existingSpecial, error: fetchError } = await supabase
      .from('specials')
      .select('restaurant_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingSpecial) {
      return NextResponse.json(
        { error: 'Special not found' },
        { status: 404 }
      );
    }

    const accessResult = await verifyRestaurantAccess(supabase, existingSpecial.restaurant_id);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      is_recurring,
      days_of_week,
      start_date,
      end_date,
      start_time,
      end_time,
      original_price,
      special_price,
      discount_description,
      image_url,
      is_active,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_recurring !== undefined) updateData.is_recurring = is_recurring;
    if (days_of_week !== undefined) updateData.days_of_week = days_of_week;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (original_price !== undefined) updateData.original_price = original_price;
    if (special_price !== undefined) updateData.special_price = special_price;
    if (discount_description !== undefined) updateData.discount_description = discount_description;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    // Use service role client for admin operations to bypass RLS
    const dbClient = (accessResult.isAdmin || accessResult.isSalesRep) ? createServiceRoleClient() : supabase;

    const { data: special, error } = await dbClient
      .from('specials')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating special:', error);
      return NextResponse.json(
        { error: 'Failed to update special' },
        { status: 500 }
      );
    }

    return NextResponse.json({ special });
  } catch (error) {
    console.error('Error in update special API:', error);
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

    // First, get the special to find its restaurant_id
    const { data: existingSpecial, error: fetchError } = await supabase
      .from('specials')
      .select('restaurant_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingSpecial) {
      return NextResponse.json(
        { error: 'Special not found' },
        { status: 404 }
      );
    }

    const accessResult = await verifyRestaurantAccess(supabase, existingSpecial.restaurant_id);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    // Use service role client for admin operations to bypass RLS
    const dbClient = (accessResult.isAdmin || accessResult.isSalesRep) ? createServiceRoleClient() : supabase;

    const { error } = await dbClient
      .from('specials')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting special:', error);
      return NextResponse.json(
        { error: 'Failed to delete special' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete special API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
