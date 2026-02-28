import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

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

    // Fetch menus with nested sections and items
    const { data: menus, error } = await supabase
      .from('menus')
      .select(`
        *,
        menu_sections (
          *,
          menu_items (*)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching menus:', error);
      return NextResponse.json(
        { error: 'Failed to fetch menus' },
        { status: 500 }
      );
    }

    // Sort sections and items by display_order
    const sortedMenus = (menus || []).map(menu => ({
      ...menu,
      menu_sections: (menu.menu_sections || [])
        .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)
        .map((section: { menu_items?: { display_order: number }[] }) => ({
          ...section,
          menu_items: (section.menu_items || [])
            .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)
        }))
    }));

    return NextResponse.json({ menus: sortedMenus });
  } catch (error) {
    console.error('Error in menus API:', error);
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
      name,
      description,
      is_active,
      display_order,
      sections, // Optional: array of sections with items for bulk creation
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Menu name is required' },
        { status: 400 }
      );
    }

    // Use service role client for admin operations to bypass RLS
    const dbClient = (accessResult.isAdmin || accessResult.isSalesRep) ? createServiceRoleClient() : supabase;

    // Get max display_order for this restaurant's menus
    const { data: existingMenus } = await dbClient
      .from('menus')
      .select('display_order')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = display_order ?? ((existingMenus?.[0]?.display_order ?? -1) + 1);

    // Create the menu
    const { data: menu, error: menuError } = await dbClient
      .from('menus')
      .insert({
        restaurant_id: restaurantId,
        name,
        description,
        is_active: is_active ?? true,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (menuError) {
      console.error('Error creating menu:', menuError);
      return NextResponse.json(
        { error: 'Failed to create menu' },
        { status: 500 }
      );
    }

    // If sections were provided, create them with their items
    if (sections && sections.length > 0) {
      for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
        const section = sections[sectionIndex];

        const { data: createdSection, error: sectionError } = await dbClient
          .from('menu_sections')
          .insert({
            menu_id: menu.id,
            name: section.name,
            description: section.description,
            display_order: sectionIndex,
          })
          .select()
          .single();

        if (sectionError) {
          console.error('Error creating section:', sectionError);
          continue;
        }

        // Create items for this section
        if (section.items && section.items.length > 0) {
          const itemsToInsert = section.items.map((item: {
            name: string;
            description?: string;
            price?: number;
            price_description?: string;
            is_available?: boolean;
            is_featured?: boolean;
            dietary_flags?: string[];
          }, index: number) => ({
            section_id: createdSection.id,
            name: item.name,
            description: item.description,
            price: item.price,
            price_description: item.price_description,
            is_available: item.is_available ?? true,
            is_featured: item.is_featured ?? false,
            dietary_flags: item.dietary_flags || [],
            display_order: index,
          }));

          const { error: itemsError } = await dbClient
            .from('menu_items')
            .insert(itemsToInsert);

          if (itemsError) {
            console.error('Error creating menu items:', itemsError);
          }
        }
      }
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
      .eq('id', menu.id)
      .single();

    return NextResponse.json({ menu: completeMenu }, { status: 201 });
  } catch (error) {
    console.error('Error in create menu API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
