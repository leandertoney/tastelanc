import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/lib/auth/admin-access';

// Verify self-promoter access
async function verifySelfPromoterAccess(selfPromoterId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const isAdmin = await isUserAdmin(supabase);

  // Fetch self-promoter
  const { data: selfPromoter, error } = await supabase
    .from('self_promoters')
    .select('*')
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

// GET - Fetch self-promoter profile
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selfPromoterId = searchParams.get('self_promoter_id');

    if (!selfPromoterId) {
      return NextResponse.json({ error: 'Missing self_promoter_id' }, { status: 400 });
    }

    const access = await verifySelfPromoterAccess(selfPromoterId);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    return NextResponse.json({ selfPromoter: access.selfPromoter });
  } catch (error) {
    console.error('Error in GET profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update self-promoter profile
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selfPromoterId = searchParams.get('self_promoter_id');

    if (!selfPromoterId) {
      return NextResponse.json({ error: 'Missing self_promoter_id' }, { status: 400 });
    }

    const access = await verifySelfPromoterAccess(selfPromoterId);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const {
      name,
      bio,
      genre,
      profile_image_url,
      website,
      instagram,
    } = body;

    // Validate name if provided
    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    const supabase = await createClient();
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name.trim();
    if (bio !== undefined) updateData.bio = bio?.trim() || null;
    if (genre !== undefined) updateData.genre = genre || null;
    if (profile_image_url !== undefined) updateData.profile_image_url = profile_image_url || null;
    if (website !== undefined) updateData.website = website?.trim() || null;
    if (instagram !== undefined) updateData.instagram = instagram?.trim() || null;

    const { data: selfPromoter, error } = await supabase
      .from('self_promoters')
      .update(updateData)
      .eq('id', selfPromoterId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ selfPromoter });
  } catch (error) {
    console.error('Error in PUT profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
