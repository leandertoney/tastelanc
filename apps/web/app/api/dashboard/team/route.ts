import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';
import { sendEmail } from '@/lib/resend';
import { generateTeamInviteEmail } from '@/lib/email-templates/team-invite-template';

const MAX_TEAM_MEMBERS = 5;

/**
 * GET /api/dashboard/team?restaurant_id=...
 * List team members for a restaurant. Owner/admin only.
 */
export async function GET(request: Request) {
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

  // Only owners and admins can view team members
  if (!accessResult.isOwner && !accessResult.isAdmin) {
    return NextResponse.json({ error: 'Only restaurant owners can manage team members' }, { status: 403 });
  }

  const serviceClient = createServiceRoleClient();
  const { data: members, error } = await serviceClient
    .from('restaurant_members')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .neq('status', 'revoked')
    .order('invited_at', { ascending: true });

  if (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }

  // Also include the owner info
  const restaurant = accessResult.restaurant;
  let ownerEmail: string | null = null;
  if (restaurant?.owner_id) {
    const { data: ownerData } = await serviceClient.auth.admin.getUserById(restaurant.owner_id);
    ownerEmail = ownerData?.user?.email || null;
  }

  return NextResponse.json({
    members: members || [],
    owner: {
      id: restaurant?.owner_id,
      email: ownerEmail,
    },
  });
}

/**
 * POST /api/dashboard/team?restaurant_id=...
 * Invite a new team member. Owner/admin only, Elite tier required.
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurant_id');

  if (!restaurantId) {
    return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
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
    return NextResponse.json({ error: 'Only restaurant owners can invite team members' }, { status: 403 });
  }

  const serviceClient = createServiceRoleClient();

  // Check Elite tier requirement
  const { data: restaurantWithTier } = await serviceClient
    .from('restaurants')
    .select('*, tiers(name)')
    .eq('id', restaurantId)
    .single();

  const tierName = (restaurantWithTier as any)?.tiers?.name;
  if (tierName !== 'elite' && !accessResult.isAdmin) {
    return NextResponse.json({ error: 'Elite tier is required to add team members' }, { status: 403 });
  }

  // Check member count limit
  const { count } = await serviceClient
    .from('restaurant_members')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .in('status', ['pending', 'active']);

  if (count !== null && count >= MAX_TEAM_MEMBERS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_TEAM_MEMBERS} team members allowed` },
      { status: 400 }
    );
  }

  // Don't allow inviting the owner
  const { data: ownerData } = await serviceClient.auth.admin.getUserById(accessResult.restaurant!.owner_id!);
  if (ownerData?.user?.email?.toLowerCase() === email) {
    return NextResponse.json({ error: 'Cannot invite the restaurant owner' }, { status: 400 });
  }

  // Check if already invited (active or pending)
  const { data: existing } = await serviceClient
    .from('restaurant_members')
    .select('id, status')
    .eq('restaurant_id', restaurantId)
    .eq('email', email)
    .single();

  if (existing && existing.status !== 'revoked') {
    return NextResponse.json({ error: 'This email has already been invited' }, { status: 400 });
  }

  // Check if user already has a Supabase account
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .single();

  let userId = existingProfile?.id || null;
  let needsPasswordSetup = false;

  if (!existingProfile) {
    // Create new auth user with a random temporary password
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: 'team_member' },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }

    userId = newUser.user.id;
    needsPasswordSetup = true;
  }

  // Insert or re-activate membership
  if (existing && existing.status === 'revoked') {
    // Re-activate previously revoked membership
    const { error: updateError } = await serviceClient
      .from('restaurant_members')
      .update({
        user_id: userId,
        role: 'manager',
        status: existingProfile ? 'active' : 'pending',
        invited_by: accessResult.userId!,
        invited_at: new Date().toISOString(),
        accepted_at: existingProfile ? new Date().toISOString() : null,
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error('Error updating membership:', updateError);
      return NextResponse.json({ error: 'Failed to update team membership' }, { status: 500 });
    }
  } else {
    // Insert new membership
    const { error: insertError } = await serviceClient
      .from('restaurant_members')
      .insert({
        restaurant_id: restaurantId,
        user_id: userId,
        email,
        role: 'manager',
        status: existingProfile ? 'active' : 'pending',
        invited_by: accessResult.userId!,
        accepted_at: existingProfile ? new Date().toISOString() : null,
      });

    if (insertError) {
      console.error('Error inserting membership:', insertError);
      return NextResponse.json({ error: 'Failed to create team membership' }, { status: 500 });
    }
  }

  // Send email
  const restaurantName = accessResult.restaurant?.name || 'Restaurant';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastelanc.com';

  try {
    if (needsPasswordSetup) {
      // Generate password setup token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await serviceClient.from('password_setup_tokens').insert({
        user_id: userId,
        email,
        token,
        expires_at: expiresAt.toISOString(),
        restaurant_name: restaurantName,
        cover_image_url: accessResult.restaurant?.cover_image_url || null,
      });

      const setupLink = `${siteUrl}/setup-account?token=${token}`;
      const html = generateTeamInviteEmail(setupLink, restaurantName, true);

      await sendEmail({
        to: email,
        subject: `You've been invited to manage ${restaurantName} on TasteLanc`,
        html,
      });
    } else {
      // Existing user — send dashboard link
      const dashboardLink = `${siteUrl}/dashboard`;
      const html = generateTeamInviteEmail(dashboardLink, restaurantName, false);

      await sendEmail({
        to: email,
        subject: `You've been added to ${restaurantName} on TasteLanc`,
        html,
      });
    }
  } catch (emailError) {
    console.error('Error sending invite email:', emailError);
    // Don't fail the request — membership was created, email just failed
  }

  return NextResponse.json({ success: true });
}
