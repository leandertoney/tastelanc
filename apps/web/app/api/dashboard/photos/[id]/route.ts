import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createClient();
    const body = await request.json();

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

    // Use service role client for database operations
    const serviceClient = createServiceRoleClient();

    // Update photo
    const updateData: any = {};
    if (body.caption !== undefined) updateData.caption = body.caption;
    if (body.display_order !== undefined) updateData.display_order = body.display_order;

    const { data: updatedPhoto, error: updateError } = await serviceClient
      .from('restaurant_photos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating photo:', updateError);
      return NextResponse.json(
        { error: 'Failed to update photo' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedPhoto);
  } catch (error) {
    console.error('Error in photo PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Use service role client for database and storage operations
    const storageClient = createServiceRoleClient();

    // Delete from database first
    const { error: deleteError } = await storageClient
      .from('restaurant_photos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting photo from database:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete photo' },
        { status: 500 }
      );
    }

    // Extract storage path from URL and delete from storage
    try {
      const url = new URL(photo.url);
      const pathParts = url.pathname.split('/storage/v1/object/public/images/');
      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        await storageClient.storage.from('images').remove([filePath]);
      }
    } catch (storageError) {
      // Log but don't fail the request - database record is already deleted
      console.error('Error deleting from storage:', storageError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in photo DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
