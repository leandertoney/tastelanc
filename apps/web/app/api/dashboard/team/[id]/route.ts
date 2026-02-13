import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';
import { sendEmail } from '@/lib/resend';
import { generateTeamInviteEmail } from '@/lib/email-templates/team-invite-template';

/**
 * DELETE /api/dashboard/team/[id]?restaurant_id=...
 * Remove a team member (soft delete). Owner/admin only.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memberId } = await params;
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurant_id');

  if (!restaurantId) {
    return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const accessResult = await verifyRestaurantAccess(supabase, restaurantId);

  if (!accessResult.canAccess) {
    return NextResponse.json(
      { error: accessResult.error || 'Access denied' },
      { status: accessResult.userId ? 403 : 401 }
    );
  }

  if (!accessResult.isOwner && !accessResult.isAdmin) {
    return NextResponse.json({ error: 'Only restaurant owners can remove team members' }, { status: 403 });
  }

  const serviceClient = createServiceRoleClient();

  // Verify member belongs to this restaurant
  const { data: member } = await serviceClient
    .from('restaurant_members')
    .select('*')
    .eq('id', memberId)
    .eq('restaurant_id', restaurantId)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  // Soft delete — set status to 'revoked'
  const { error: updateError } = await serviceClient
    .from('restaurant_members')
    .update({ status: 'revoked' })
    .eq('id', memberId);

  if (updateError) {
    console.error('Error removing team member:', updateError);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * PATCH /api/dashboard/team/[id]?restaurant_id=...
 * Resend invite for a pending team member. Owner/admin only.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memberId } = await params;
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurant_id');

  if (!restaurantId) {
    return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const accessResult = await verifyRestaurantAccess(supabase, restaurantId);

  if (!accessResult.canAccess) {
    return NextResponse.json(
      { error: accessResult.error || 'Access denied' },
      { status: accessResult.userId ? 403 : 401 }
    );
  }

  if (!accessResult.isOwner && !accessResult.isAdmin) {
    return NextResponse.json({ error: 'Only restaurant owners can resend invites' }, { status: 403 });
  }

  const serviceClient = createServiceRoleClient();

  // Get the pending member
  const { data: member } = await serviceClient
    .from('restaurant_members')
    .select('*')
    .eq('id', memberId)
    .eq('restaurant_id', restaurantId)
    .eq('status', 'pending')
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Pending team member not found' }, { status: 404 });
  }

  // Generate a new setup token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const restaurantName = accessResult.restaurant?.name || 'Restaurant';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

  try {
    await serviceClient.from('password_setup_tokens').insert({
      user_id: member.user_id,
      email: member.email,
      token,
      expires_at: expiresAt.toISOString(),
      restaurant_name: restaurantName,
      cover_image_url: accessResult.restaurant?.cover_image_url || null,
    });

    const setupLink = `${siteUrl}/setup-account?token=${token}`;
    const html = generateTeamInviteEmail(setupLink, restaurantName, true);

    await sendEmail({
      to: member.email,
      subject: `Reminder: You've been invited to manage ${restaurantName} on TasteLanc`,
      html,
    });

    // Update invited_at timestamp
    await serviceClient
      .from('restaurant_members')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', memberId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error resending invite:', err);
    return NextResponse.json({ error: 'Failed to resend invite' }, { status: 500 });
  }
}
