import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

async function getRestaurantIdFromSection(supabase: ReturnType<typeof createServiceRoleClient>, sectionId: string) {
  const { data: section, error } = await supabase
    .from('menu_sections')
    .select(`
      menu_id,
      menus!inner (
        restaurant_id
      )
    `)
    .eq('id', sectionId)
    .single();

  if (error || !section) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const menus = section.menus as any;
  return menus?.restaurant_id || null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const restaurantId = await getRestaurantIdFromSection(supabase, id);

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Section not found' },
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
    const { name, description, display_order } = body;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (display_order !== undefined) updateData.display_order = display_order;
    updateData.updated_at = new Date().toISOString();

    // Use service role client for admin operations to bypass RLS
    const dbClient = (accessResult.isAdmin || accessResult.isSalesRep) ? createServiceRoleClient() : supabase;

    const { data: section, error: updateError } = await dbClient
      .from('menu_sections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating section:', updateError);
      return NextResponse.json(
        { error: 'Failed to update section' },
        { status: 500 }
      );
    }

    return NextResponse.json({ section });
  } catch (error) {
    console.error('Error in update section API:', error);
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

    const restaurantId = await getRestaurantIdFromSection(supabase, id);

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Section not found' },
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
    const dbClient = (accessResult.isAdmin || accessResult.isSalesRep) ? createServiceRoleClient() : supabase;

    // Delete all items in this section first
    await dbClient
      .from('menu_items')
      .delete()
      .eq('section_id', id);

    // Delete the section
    const { error } = await dbClient
      .from('menu_sections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting section:', error);
      return NextResponse.json(
        { error: 'Failed to delete section' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete section API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
