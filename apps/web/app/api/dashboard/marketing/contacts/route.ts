import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Contact list size caps per tier (protects shared Resend quota)
const TIER_CONTACT_LIMITS: Record<string, number> = {
  premium: 500,
  elite: 2000,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const showUnsubscribed = searchParams.get('show_unsubscribed') === 'true';

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

    const serviceClient = createServiceRoleClient();
    let query = serviceClient
      .from('restaurant_contacts')
      .select('*', { count: 'exact' })
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (!showUnsubscribed) {
      query = query.eq('is_unsubscribed', false);
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: contacts, error, count } = await query;

    if (error) {
      console.error('Error fetching contacts:', error);
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    return NextResponse.json({
      contacts: contacts || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error in contacts API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { email, name } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Check contact list cap
    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('tier_id, tiers(name)')
      .eq('id', restaurantId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tiersData = (restaurant as any)?.tiers;
    const tierName: string = Array.isArray(tiersData) ? tiersData[0]?.name || 'basic' : tiersData?.name || 'basic';
    const contactLimit = TIER_CONTACT_LIMITS[tierName] || 0;

    if (contactLimit > 0) {
      const { count: currentCount } = await serviceClient
        .from('restaurant_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId);

      if ((currentCount || 0) >= contactLimit) {
        return NextResponse.json(
          { error: `Contact list limit reached (${contactLimit} for ${tierName} tier)`, limit: contactLimit },
          { status: 429 }
        );
      }
    }

    const { data: contact, error } = await serviceClient
      .from('restaurant_contacts')
      .upsert(
        {
          restaurant_id: restaurantId,
          email: email.toLowerCase().trim(),
          name: name?.trim() || null,
          source: 'manual',
        },
        { onConflict: 'restaurant_id,email' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error creating contact:', error);
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
    }

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error('Error in create contact API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
