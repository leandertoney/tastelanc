import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ContactWithCrossRef {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  market_id: string | null;
  email: string;
  name: string | null;
  source: string;
  is_unsubscribed: boolean;
  created_at: string;
  has_app: boolean;
  is_signed_in: boolean;
  has_push_token: boolean;
  emailed: boolean;
}

export interface RestaurantContactSummary {
  restaurant_id: string;
  restaurant_name: string;
  market_id: string | null;
  total_contacts: number;
  with_app: number;
  signed_in: number;
  emailed: number;
}

export async function GET() {
  try {
    // 1. Fetch all restaurant contacts with restaurant info (paginated — Supabase JS caps at 1000/page)
    const contacts: Array<{
      id: string; restaurant_id: string; email: string; name: string | null;
      source: string; is_unsubscribed: boolean; created_at: string;
      restaurant: { name: string; market_id: string | null } | Array<{ name: string; market_id: string | null }>;
    }> = [];
    const PAGE_SIZE = 1000;
    let offset = 0;
    while (true) {
      const { data: page, error: contactsError } = await supabaseAdmin
        .from('restaurant_contacts')
        .select('id, restaurant_id, email, name, source, is_unsubscribed, created_at, restaurant:restaurants(name, market_id)')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (contactsError) {
        console.error('Error fetching restaurant contacts:', contactsError);
        return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
      }
      if (!page || page.length === 0) break;
      contacts.push(...(page as typeof contacts));
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    // 2. Fetch all auth users (paginated)
    const allAuthUsers: Array<{ id: string; email?: string; is_anonymous?: boolean }> = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) break;
      allAuthUsers.push(...users);
      if (users.length < perPage) break;
      page++;
    }

    // 3. Build email lookup maps
    const appUserEmailSet = new Set<string>();
    const signedInEmailSet = new Set<string>();
    for (const u of allAuthUsers) {
      if (u.email) {
        appUserEmailSet.add(u.email.toLowerCase());
        if (!u.is_anonymous) {
          signedInEmailSet.add(u.email.toLowerCase());
        }
      }
    }

    // 4. Fetch push token user emails (for "has push token" check)
    const allPushTokenRows: Array<{ user_id: string }> = [];
    offset = 0;
    while (true) {
      const { data: ptPage } = await supabaseAdmin
        .from('push_tokens')
        .select('user_id')
        .range(offset, offset + PAGE_SIZE - 1);
      if (!ptPage || ptPage.length === 0) break;
      allPushTokenRows.push(...ptPage);
      if (ptPage.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    const pushTokenRows = allPushTokenRows;

    const usersWithPushTokens = new Set((pushTokenRows || []).map((r) => r.user_id));

    // Build user_id lookup by email
    const emailToUserId = new Map<string, string>();
    for (const u of allAuthUsers) {
      if (u.email) emailToUserId.set(u.email.toLowerCase(), u.id);
    }

    // 5. Fetch all email send records (campaign_id → contact emails that were sent)
    const { data: emailSends } = await supabaseAdmin
      .from('restaurant_email_sends')
      .select('contact_id');

    const emailedContactIds = new Set((emailSends || []).map((s) => s.contact_id));

    // 6. Cross-reference and build enriched contact list
    const enrichedContacts: ContactWithCrossRef[] = (contacts || []).map((c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const restaurantData = (c as any).restaurant;
      const restaurantName = Array.isArray(restaurantData)
        ? restaurantData[0]?.name || 'Unknown'
        : restaurantData?.name || 'Unknown';
      const marketId = Array.isArray(restaurantData)
        ? restaurantData[0]?.market_id || null
        : restaurantData?.market_id || null;

      const emailLower = c.email.toLowerCase();
      const hasApp = appUserEmailSet.has(emailLower);
      const isSignedIn = signedInEmailSet.has(emailLower);
      const userId = emailToUserId.get(emailLower);
      const hasPushToken = userId ? usersWithPushTokens.has(userId) : false;
      const emailed = emailedContactIds.has(c.id);

      return {
        id: c.id,
        restaurant_id: c.restaurant_id,
        restaurant_name: restaurantName,
        market_id: marketId,
        email: c.email,
        name: c.name,
        source: c.source,
        is_unsubscribed: c.is_unsubscribed,
        created_at: c.created_at,
        has_app: hasApp,
        is_signed_in: isSignedIn,
        has_push_token: hasPushToken,
        emailed,
      };
    });

    // 7. Aggregate per-restaurant summaries
    const restaurantMap = new Map<string, RestaurantContactSummary>();
    for (const c of enrichedContacts) {
      if (!restaurantMap.has(c.restaurant_id)) {
        restaurantMap.set(c.restaurant_id, {
          restaurant_id: c.restaurant_id,
          restaurant_name: c.restaurant_name,
          market_id: c.market_id,
          total_contacts: 0,
          with_app: 0,
          signed_in: 0,
          emailed: 0,
        });
      }
      const summary = restaurantMap.get(c.restaurant_id)!;
      summary.total_contacts++;
      if (c.has_app) summary.with_app++;
      if (c.is_signed_in) summary.signed_in++;
      if (c.emailed) summary.emailed++;
    }

    const restaurantSummaries = Array.from(restaurantMap.values()).sort(
      (a, b) => b.total_contacts - a.total_contacts
    );

    // 8. Overall stats
    const stats = {
      total_contacts: enrichedContacts.length,
      with_app: enrichedContacts.filter((c) => c.has_app).length,
      signed_in: enrichedContacts.filter((c) => c.is_signed_in).length,
      emailed: enrichedContacts.filter((c) => c.emailed).length,
      restaurants: restaurantSummaries.length,
    };

    return NextResponse.json({ contacts: enrichedContacts, restaurantSummaries, stats });
  } catch (error) {
    console.error('Error in contacts-crossref API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
