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

    // First, get the happy hour to find its restaurant_id
    const { data: existingHappyHour, error: fetchError } = await supabase
      .from('happy_hours')
      .select('restaurant_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingHappyHour) {
      return NextResponse.json(
        { error: 'Happy hour not found' },
        { status: 404 }
      );
    }

    const accessResult = await verifyRestaurantAccess(supabase, existingHappyHour.restaurant_id);

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
      days_of_week,
      start_time,
      end_time,
      is_active,
      image_url,
      items,
    } = body;

    // Update happy hour fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (days_of_week !== undefined) updateData.days_of_week = days_of_week;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (image_url !== undefined) updateData.image_url = image_url;
    updateData.updated_at = new Date().toISOString();

    // Use service role client for admin operations to bypass RLS
    const dbClient = (accessResult.isAdmin || accessResult.isSalesRep) ? createServiceRoleClient() : supabase;

    const { error: updateError } = await dbClient
      .from('happy_hours')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating happy hour:', updateError);
      return NextResponse.json(
        { error: 'Failed to update happy hour' },
        { status: 500 }
      );
    }

    // If items were provided, replace all items
    if (items !== undefined) {
      // Delete existing items
      await dbClient
        .from('happy_hour_items')
        .delete()
        .eq('happy_hour_id', id);

      // Insert new items
      if (items.length > 0) {
        const itemsToInsert = items.map((item: {
          name: string;
          description?: string;
          original_price?: number;
          discounted_price?: number;
          discount_description?: string;
        }, index: number) => ({
          happy_hour_id: id,
          name: item.name,
          description: item.description,
          original_price: item.original_price,
          discounted_price: item.discounted_price,
          discount_description: item.discount_description,
          display_order: index,
        }));

        const { error: itemsError } = await dbClient
          .from('happy_hour_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error creating happy hour items:', itemsError);
        }
      }
    }

    // Fetch the complete happy hour with items
    const { data: completeHappyHour } = await dbClient
      .from('happy_hours')
      .select(`
        *,
        happy_hour_items (*)
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({ happyHour: completeHappyHour });
  } catch (error) {
    console.error('Error in update happy hour API:', error);
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

    // First, get the happy hour to find its restaurant_id
    const { data: existingHappyHour, error: fetchError } = await supabase
      .from('happy_hours')
      .select('restaurant_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingHappyHour) {
      return NextResponse.json(
        { error: 'Happy hour not found' },
        { status: 404 }
      );
    }

    const accessResult = await verifyRestaurantAccess(supabase, existingHappyHour.restaurant_id);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    // Use service role client for admin operations to bypass RLS
    const dbClient = (accessResult.isAdmin || accessResult.isSalesRep) ? createServiceRoleClient() : supabase;

    // Delete items first (cascade might handle this, but be explicit)
    await dbClient
      .from('happy_hour_items')
      .delete()
      .eq('happy_hour_id', id);

    // Delete the happy hour
    const { error } = await dbClient
      .from('happy_hours')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting happy hour:', error);
      return NextResponse.json(
        { error: 'Failed to delete happy hour' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete happy hour API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
