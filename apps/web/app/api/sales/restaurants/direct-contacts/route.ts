import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';

export async function GET() {
  try {
    const supabase = await createClient();
    const access = await verifySalesAccess(supabase);

    if (!access.canAccess) {
      return NextResponse.json(
        { error: access.error },
        { status: access.userId ? 403 : 401 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Fetch restaurants with enriched contact data
    let query = serviceClient
      .from('restaurants')
      .select('id, name, city, state, phone, website, contact_name, contact_phone, contact_email, contact_title, address, zip_code, categories')
      .not('contact_name', 'is', null)
      .order('name', { ascending: true });

    // Market scoping
    if (access.marketIds !== null && access.marketIds.length > 0) {
      if (access.marketIds.length === 1) {
        query = query.eq('market_id', access.marketIds[0]);
      } else {
        query = query.in('market_id', access.marketIds);
      }
    }

    const { data: restaurants, error } = await query;

    if (error) {
      console.error('Error fetching direct contacts:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    // Filter out restaurants that already have leads
    const restaurantIds = (restaurants || []).map((r: { id: string }) => r.id);
    let leadRestaurantIds = new Set<string>();

    if (restaurantIds.length > 0) {
      const { data: existingLeads } = await serviceClient
        .from('business_leads')
        .select('restaurant_id')
        .in('restaurant_id', restaurantIds);

      if (existingLeads) {
        leadRestaurantIds = new Set(
          existingLeads.map((l: { restaurant_id: string }) => l.restaurant_id).filter(Boolean)
        );
      }
    }

    const contacts = (restaurants || []).map((r: Record<string, unknown>) => ({
      ...r,
      has_lead: leadRestaurantIds.has(r.id as string),
    }));

    return NextResponse.json({
      contacts,
      total: contacts.length,
      without_leads: contacts.filter((c: { has_lead: boolean }) => !c.has_lead).length,
    });
  } catch (error) {
    console.error('Error in direct contacts API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
