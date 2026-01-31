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

    // Fetch happy hours with their items
    const { data: happyHours, error } = await supabase
      .from('happy_hours')
      .select(`
        *,
        happy_hour_items (*)
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching happy hours:', error);
      return NextResponse.json(
        { error: 'Failed to fetch happy hours' },
        { status: 500 }
      );
    }

    return NextResponse.json({ happyHours: happyHours || [] });
  } catch (error) {
    console.error('Error in happy hours API:', error);
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
      days_of_week,
      start_time,
      end_time,
      is_active,
      image_url,
      items,
    } = body;

    // Use service role client for admin operations to bypass RLS
    const dbClient = accessResult.isAdmin ? createServiceRoleClient() : supabase;

    // Create the happy hour
    const { data: happyHour, error: happyHourError } = await dbClient
      .from('happy_hours')
      .insert({
        restaurant_id: restaurantId,
        name,
        description,
        days_of_week: days_of_week || [],
        start_time,
        end_time,
        is_active: is_active ?? true,
        image_url: image_url || null,
      })
      .select()
      .single();

    if (happyHourError) {
      console.error('Error creating happy hour:', happyHourError);
      return NextResponse.json(
        { error: 'Failed to create happy hour' },
        { status: 500 }
      );
    }

    // If items were provided, create them
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: {
        name: string;
        description?: string;
        original_price?: number;
        discounted_price?: number;
        discount_description?: string;
      }, index: number) => ({
        happy_hour_id: happyHour.id,
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
        // Don't fail the whole request, just log the error
      }
    }

    // Fetch the complete happy hour with items
    const { data: completeHappyHour } = await dbClient
      .from('happy_hours')
      .select(`
        *,
        happy_hour_items (*)
      `)
      .eq('id', happyHour.id)
      .single();

    return NextResponse.json({ happyHour: completeHappyHour }, { status: 201 });
  } catch (error) {
    console.error('Error in create happy hour API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
