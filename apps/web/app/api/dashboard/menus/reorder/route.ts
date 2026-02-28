import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { type, items, restaurant_id } = body;

    if (!type || !items || !restaurant_id) {
      return NextResponse.json(
        { error: 'Missing required fields: type, items, restaurant_id' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items must be a non-empty array of { id, display_order }' },
        { status: 400 }
      );
    }

    if (!['menu_items', 'menu_sections'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "menu_items" or "menu_sections"' },
        { status: 400 }
      );
    }

    const accessResult = await verifyRestaurantAccess(supabase, restaurant_id);

    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();

    const updates = items.map(
      (item: { id: string; display_order: number }) =>
        serviceClient
          .from(type)
          .update({ display_order: item.display_order, updated_at: new Date().toISOString() })
          .eq('id', item.id)
    );

    const results = await Promise.all(updates);
    const errors = results.filter((r) => r.error);

    if (errors.length > 0) {
      console.error('Reorder errors:', errors.map((e) => e.error));
      return NextResponse.json(
        { error: 'Some items failed to reorder' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in reorder API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
