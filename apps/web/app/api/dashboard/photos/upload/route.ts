import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caption = formData.get('caption') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Use service role client for storage and database operations
    const storageClient = createServiceRoleClient();

    // Check current photo count
    const { count, error: countError } = await storageClient
      .from('restaurant_photos')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);

    if (countError) {
      console.error('Error checking photo count:', countError);
      return NextResponse.json(
        { error: 'Failed to check photo count' },
        { status: 500 }
      );
    }

    if (count !== null && count >= 10) {
      return NextResponse.json(
        { error: 'Maximum of 10 photos allowed per restaurant' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    const timestamp = Date.now();
    const fileName = `restaurant-photos/${restaurantId}/${timestamp}.${ext}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await storageClient.storage
      .from('images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = storageClient.storage
      .from('images')
      .getPublicUrl(fileName);

    // Get current max display_order
    const { data: maxOrderData } = await storageClient
      .from('restaurant_photos')
      .select('display_order')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextDisplayOrder = maxOrderData ? maxOrderData.display_order + 1 : 0;

    // Insert photo record into database
    const { data: photoData, error: insertError } = await storageClient
      .from('restaurant_photos')
      .insert({
        restaurant_id: restaurantId,
        url: urlData.publicUrl,
        caption: caption || null,
        display_order: nextDisplayOrder,
        is_cover: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Try to clean up uploaded file
      await storageClient.storage.from('images').remove([fileName]);
      return NextResponse.json(
        { error: 'Failed to save photo record' },
        { status: 500 }
      );
    }

    return NextResponse.json(photoData);
  } catch (error) {
    console.error('Error in photo upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
