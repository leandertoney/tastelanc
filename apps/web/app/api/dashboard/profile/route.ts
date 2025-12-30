import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    return NextResponse.json({ restaurant: accessResult.restaurant });
  } catch (error) {
    console.error('Error fetching profile:', error);
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
    const {
      name,
      description,
      address,
      city,
      state,
      zip_code,
      phone,
      email,
      website,
      categories,
      primary_color,
      secondary_color,
      // Enrichment fields
      price_range,
      signature_dishes,
      vibe_tags,
      best_for,
      neighborhood,
      parking_info,
      noise_level,
    } = body;

    // Build update object (only include fields that were provided)
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zip_code !== undefined) updateData.zip_code = zip_code;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (categories !== undefined) updateData.categories = categories;
    if (primary_color !== undefined) updateData.primary_color = primary_color;
    if (secondary_color !== undefined) updateData.secondary_color = secondary_color;
    // Enrichment fields
    if (price_range !== undefined) updateData.price_range = price_range;
    if (signature_dishes !== undefined) updateData.signature_dishes = signature_dishes;
    if (vibe_tags !== undefined) updateData.vibe_tags = vibe_tags;
    if (best_for !== undefined) updateData.best_for = best_for;
    if (neighborhood !== undefined) updateData.neighborhood = neighborhood;
    if (parking_info !== undefined) updateData.parking_info = parking_info;
    if (noise_level !== undefined) updateData.noise_level = noise_level;

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .update(updateData)
      .eq('id', restaurantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating restaurant:', error);
      return NextResponse.json(
        { error: 'Failed to update restaurant' },
        { status: 500 }
      );
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('Error in update profile API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
