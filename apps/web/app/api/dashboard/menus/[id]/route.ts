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

    // First, get the menu to find its restaurant_id
    const { data: existingMenu, error: fetchError } = await supabase
      .from('menus')
      .select('restaurant_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingMenu) {
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      );
    }

    const accessResult = await verifyRestaurantAccess(supabase, existingMenu.restaurant_id);

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
      is_active,
      display_order,
    } = body;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (display_order !== undefined) updateData.display_order = display_order;
    updateData.updated_at = new Date().toISOString();

    // Use service role client for admin operations to bypass RLS
    const dbClient = (accessResult.isAdmin || accessResult.isSalesRep) ? createServiceRoleClient() : supabase;

    const { error: updateError } = await dbClient
      .from('menus')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating menu:', updateError);
      return NextResponse.json(
        { error: 'Failed to update menu' },
        { status: 500 }
      );
    }

    // Fetch the complete menu with sections and items
    const { data: completeMenu } = await dbClient
      .from('menus')
      .select(`
        *,
        menu_sections (
          *,
          menu_items (*)
        )
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({ menu: completeMenu });
  } catch (error) {
    console.error('Error in update menu API:', error);
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

    // First, get the menu to find its restaurant_id
    const { data: existingMenu, error: fetchError } = await supabase
      .from('menus')
      .select('restaurant_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingMenu) {
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      );
    }

    const accessResult = await verifyRestaurantAccess(supabase, existingMenu.restaurant_id);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    // Use service role client for admin operations to bypass RLS
    const dbClient = (accessResult.isAdmin || accessResult.isSalesRep) ? createServiceRoleClient() : supabase;

    // Get all sections for this menu
    const { data: sections } = await dbClient
      .from('menu_sections')
      .select('id')
      .eq('menu_id', id);

    // Delete all items in all sections
    if (sections && sections.length > 0) {
      const sectionIds = sections.map(s => s.id);
      await dbClient
        .from('menu_items')
        .delete()
        .in('section_id', sectionIds);
    }

    // Delete all sections
    await dbClient
      .from('menu_sections')
      .delete()
      .eq('menu_id', id);

    // Delete the menu
    const { error } = await dbClient
      .from('menus')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting menu:', error);
      return NextResponse.json(
        { error: 'Failed to delete menu' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete menu API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
