import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    if (!['menu_items', 'menu_sections', 'menus'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "menu_items", "menu_sections", or "menus"' },
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
      (item: { id: string; display_order: number; is_hidden_from_tab?: boolean }) => {
        const updatePayload: Record<string, unknown> = {
          display_order: item.display_order,
          updated_at: new Date().toISOString(),
        };
        // is_hidden_from_tab only applies to top-level menus
        if (type === 'menus' && item.is_hidden_from_tab !== undefined) {
          updatePayload.is_hidden_from_tab = item.is_hidden_from_tab;
        }
        return serviceClient
          .from(type)
          .update(updatePayload)
          .eq('id', item.id);
      }
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
