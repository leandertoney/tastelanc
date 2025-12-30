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

    const { data: specials, error } = await supabase
      .from('specials')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching specials:', error);
      return NextResponse.json(
        { error: 'Failed to fetch specials' },
        { status: 500 }
      );
    }

    return NextResponse.json({ specials: specials || [] });
  } catch (error) {
    console.error('Error in specials API:', error);
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
      is_recurring,
      days_of_week,
      start_date,
      end_date,
      start_time,
      end_time,
      original_price,
      special_price,
      discount_description,
      is_active,
    } = body;

    // Use service role client for admin operations to bypass RLS
    const dbClient = accessResult.isAdmin ? createServiceRoleClient() : supabase;

    const { data: special, error } = await dbClient
      .from('specials')
      .insert({
        restaurant_id: restaurantId,
        name,
        description,
        is_recurring: is_recurring ?? true,
        days_of_week: days_of_week || [],
        start_date,
        end_date,
        start_time,
        end_time,
        original_price,
        special_price,
        discount_description,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating special:', error);
      return NextResponse.json(
        { error: 'Failed to create special' },
        { status: 500 }
      );
    }

    return NextResponse.json({ special }, { status: 201 });
  } catch (error) {
    console.error('Error in create special API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
