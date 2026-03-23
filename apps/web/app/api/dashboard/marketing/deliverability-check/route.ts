import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';
import { sendEmail } from '@/lib/resend';
import { generateDeliverabilityCheckEmail } from '@/lib/email-templates/deliverability-check-template';
import { BRAND } from '@/config/market';

export const dynamic = 'force-dynamic';

// POST — send the test email and mark status as 'pending'
export async function POST(request: Request) {
  try {
    const { restaurant_id } = await request.json();

    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const accessResult = await verifyRestaurantAccess(supabase, restaurant_id);
    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    // Get current user email and name
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Get restaurant name
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('name, deliverability_check_status')
      .eq('id', restaurant_id)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Don't re-send if already confirmed
    if (restaurant.deliverability_check_status === 'confirmed') {
      return NextResponse.json({ status: 'confirmed' });
    }

    // Get owner's display name from profile
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const ownerName = profile?.full_name || user.email;

    // Send the test email
    const { html, text } = generateDeliverabilityCheckEmail({
      ownerName,
      restaurantName: restaurant.name,
    });

    const { error: emailError } = await sendEmail({
      to: user.email,
      subject: `Reply to confirm — ${restaurant.name} on ${BRAND.name}`,
      html,
      text,
      replyTo: `info@${BRAND.domain}`,
    });

    if (emailError) {
      console.error('Deliverability email error:', emailError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    // Mark as pending
    await serviceClient
      .from('restaurants')
      .update({
        deliverability_check_status: 'pending',
        deliverability_check_sent_at: new Date().toISOString(),
      })
      .eq('id', restaurant_id);

    return NextResponse.json({ status: 'pending' });
  } catch (error) {
    console.error('Deliverability check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — update status to 'confirmed' or 'dismissed'
export async function PATCH(request: Request) {
  try {
    const { restaurant_id, status } = await request.json();

    if (!restaurant_id || !['confirmed', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const supabase = await createClient();
    const accessResult = await verifyRestaurantAccess(supabase, restaurant_id);
    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: accessResult.error || 'Access denied' },
        { status: accessResult.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();
    await serviceClient
      .from('restaurants')
      .update({ deliverability_check_status: status })
      .eq('id', restaurant_id);

    return NextResponse.json({ status });
  } catch (error) {
    console.error('Deliverability check PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
