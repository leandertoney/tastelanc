import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

async function getRestaurantIdFromSection(supabase: ReturnType<typeof createServiceRoleClient>, id: string) {
  const { data: section, error } = await supabase
    .from('menu_sections')
    .select(`
      menu_id,
      menus!inner (
        restaurant_id
      )
    `)
    .eq('id', id)
    .single();

  if (error || !section) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const menus = section.menus as any;
  return menus?.restaurant_id || null;
}

export async function POST(
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

    if (!name) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }

    // Use service role client for admin operations to bypass RLS
    const dbClient = (accessResult.isAdmin || accessResult.isSalesRep) ? createServiceRoleClient() : supabase;

    // Get max display_order for this section's items
    const { data: existingItems } = await dbClient
      .from('menu_items')
      .select('display_order')
      .eq('section_id', id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = display_order ?? ((existingItems?.[0]?.display_order ?? -1) + 1);

    // Create the item
    const { data: item, error: itemError } = await dbClient
      .from('menu_items')
      .insert({
        section_id: id,
        name,
        description,
        price,
        price_description,
        is_available: is_available ?? true,
        is_featured: is_featured ?? false,
        dietary_flags: dietary_flags || [],
        display_order: nextOrder,
      })
      .select()
      .single();

    if (itemError) {
      console.error('Error creating item:', itemError);
      return NextResponse.json(
        { error: 'Failed to create item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Error in create item API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
