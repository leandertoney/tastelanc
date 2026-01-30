import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

async function getRestaurantIdFromItem(supabase: ReturnType<typeof createServiceRoleClient>, itemId: string) {
  const { data: item, error } = await supabase
    .from('menu_items')
    .select(`
      section_id,
      menu_sections!inner (
        menu_id,
        menus!inner (
          restaurant_id
        )
      )
    `)
    .eq('id', itemId)
    .single();

  if (error || !item) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const menuSections = item.menu_sections as any;
  return menuSections?.menus?.restaurant_id || null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const restaurantId = await getRestaurantIdFromItem(supabase, id);

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const accessResult = await verifyRestaurantAccess(supabase, restaurantId);

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
      price,
      price_description,
      is_available,
      is_featured,
      dietary_flags,
      display_order,
    } = body;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (price_description !== undefined) updateData.price_description = price_description;
    if (is_available !== undefined) updateData.is_available = is_available;
    if (is_featured !== undefined) updateData.is_featured = is_featured;
    if (dietary_flags !== undefined) updateData.dietary_flags = dietary_flags;
    if (display_order !== undefined) updateData.display_order = display_order;
    updateData.updated_at = new Date().toISOString();

    // Use service role client for admin operations to bypass RLS
    const dbClient = accessResult.isAdmin ? createServiceRoleClient() : supabase;

    const { data: item, error: updateError } = await dbClient
      .from('menu_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating item:', updateError);
      return NextResponse.json(
        { error: 'Failed to update item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error in update item API:', error);
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

    const restaurantId = await getRestaurantIdFromItem(supabase, id);

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const accessResult = await verifyRestaurantAccess(supabase, restaurantId);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    // Use service role client for admin operations to bypass RLS
    const dbClient = accessResult.isAdmin ? createServiceRoleClient() : supabase;

    const { error } = await dbClient
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting item:', error);
      return NextResponse.json(
        { error: 'Failed to delete item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete item API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
