import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';
import type { DayOfWeek } from '@/types/database';

const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

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

    // Fetch hours for this restaurant
    const { data: hours, error } = await supabase
      .from('restaurant_hours')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('day_of_week');

    if (error) {
      console.error('Error fetching hours:', error);
      return NextResponse.json(
        { error: 'Failed to fetch hours' },
        { status: 500 }
      );
    }

    return NextResponse.json({ hours: hours || [] });
  } catch (error) {
    console.error('Error in hours API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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
    const { hours } = body;

    if (!Array.isArray(hours)) {
      return NextResponse.json(
        { error: 'hours must be an array' },
        { status: 400 }
      );
    }

    // Validate that we have all 7 days
    const providedDays = hours.map((h: { day_of_week: DayOfWeek }) => h.day_of_week);
    const missingDays = DAYS_OF_WEEK.filter((d) => !providedDays.includes(d));

    if (missingDays.length > 0) {
      return NextResponse.json(
        { error: `Missing hours for: ${missingDays.join(', ')}` },
        { status: 400 }
      );
    }

    // Use service role client for admin operations to bypass RLS
    const dbClient = (accessResult.isAdmin || accessResult.isSalesRep) ? createServiceRoleClient() : supabase;

    // Delete existing hours for this restaurant
    const { error: deleteError } = await dbClient
      .from('restaurant_hours')
      .delete()
      .eq('restaurant_id', restaurantId);

    if (deleteError) {
      console.error('Error deleting existing hours:', deleteError);
      return NextResponse.json(
        { error: 'Failed to update hours' },
        { status: 500 }
      );
    }

    // Insert new hours
    const hoursToInsert = hours.map((h: {
      day_of_week: DayOfWeek;
      open_time: string | null;
      close_time: string | null;
      is_closed: boolean;
    }) => ({
      restaurant_id: restaurantId,
      day_of_week: h.day_of_week,
      open_time: h.is_closed ? null : h.open_time,
      close_time: h.is_closed ? null : h.close_time,
      is_closed: h.is_closed,
    }));

    const { data: newHours, error: insertError } = await dbClient
      .from('restaurant_hours')
      .insert(hoursToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting hours:', insertError);
      return NextResponse.json(
        { error: 'Failed to save hours' },
        { status: 500 }
      );
    }

    return NextResponse.json({ hours: newHours });
  } catch (error) {
    console.error('Error in update hours API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
