import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createClient();

    // Verify photo exists and get restaurant_id
    const { data: photo, error: photoError } = await supabase
      .from('restaurant_photos')
      .select('restaurant_id, url')
      .eq('id', id)
      .single();

    if (photoError || !photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Verify access (handles both owner and admin mode)
    const accessResult = await verifyRestaurantAccess(supabase, photo.restaurant_id);
    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    // Use service role client for database operations to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Unset all other photos as cover for this restaurant
    const { error: unsetError } = await serviceClient
      .from('restaurant_photos')
      .update({ is_cover: false })
      .eq('restaurant_id', photo.restaurant_id);

    if (unsetError) {
      console.error('Error unsetting cover photos:', unsetError);
      return NextResponse.json(
        { error: 'Failed to update cover photo' },
        { status: 500 }
      );
    }

    // Set this photo as cover
    const { data: updatedPhoto, error: updateError } = await serviceClient
      .from('restaurant_photos')
      .update({ is_cover: true })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error setting cover photo:', updateError);
      return NextResponse.json(
        { error: 'Failed to set cover photo' },
        { status: 500 }
      );
    }

    // Also update the restaurant's cover_image_url
    const { error: restaurantUpdateError } = await serviceClient
      .from('restaurants')
      .update({ cover_image_url: photo.url })
      .eq('id', photo.restaurant_id);

    if (restaurantUpdateError) {
      console.error('Error updating restaurant cover_image_url:', restaurantUpdateError);
      // Don't fail the request - the photo is still set as cover
    }

    return NextResponse.json(updatedPhoto);
  } catch (error) {
    console.error('Error in set cover photo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
