import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

// Verify self-promoter access
async function verifySelfPromoterAccess(selfPromoterId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const isAdmin = user.email === 'admin@tastelanc.com';

  // Fetch self-promoter
  const { data: selfPromoter, error } = await supabase
    .from('self_promoters')
    .select('id, owner_id')
    .eq('id', selfPromoterId)
    .single();

  if (error || !selfPromoter) {
    return { error: 'Self-promoter not found', status: 404 };
  }

  const isOwner = selfPromoter.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return { error: 'Access denied', status: 403 };
  }

  return { selfPromoter, user, isAdmin, isOwner };
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selfPromoterId = searchParams.get('self_promoter_id');

    if (!selfPromoterId) {
      return NextResponse.json(
        { error: 'self_promoter_id is required' },
        { status: 400 }
      );
    }

    const access = await verifySelfPromoterAccess(selfPromoterId);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

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

    // Use service role client for storage operations
    const storageClient = createServiceRoleClient();

    // Generate unique filename - store in promoter-events folder
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    const timestamp = Date.now();
    const fileName = `promoter-events/${selfPromoterId}/${timestamp}.${ext}`;

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

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error('Error in promoter event image upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
