import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: menuId } = await params;
    const supabase = await createClient();

    // First, get the menu to find its restaurant_id
    const { data: existingMenu, error: fetchError } = await supabase
      .from('menus')
      .select('restaurant_id')
      .eq('id', menuId)
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
    const { name, description, display_order } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Section name is required' },
        { status: 400 }
      );
    }

    // Use service role client for admin operations to bypass RLS
    const dbClient = accessResult.isAdmin ? createServiceRoleClient() : supabase;

    // Get max display_order for this menu's sections
    const { data: existingSections } = await dbClient
      .from('menu_sections')
      .select('display_order')
      .eq('menu_id', menuId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = display_order ?? ((existingSections?.[0]?.display_order ?? -1) + 1);

    // Create the section
    const { data: section, error: sectionError } = await dbClient
      .from('menu_sections')
      .insert({
        menu_id: menuId,
        name,
        description,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (sectionError) {
      console.error('Error creating section:', sectionError);
      return NextResponse.json(
        { error: 'Failed to create section' },
        { status: 500 }
      );
    }

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    console.error('Error in create section API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
