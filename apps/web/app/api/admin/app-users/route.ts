import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AppUser {
  id: string;
  email: string | null;
  display_name: string | null;
  is_anonymous: boolean;
  last_seen_at: string | null;
  created_at: string;
  platform: string | null;
  app_slug: string | null;
  favorites_count: number;
  checkins_count: number;
  has_push_token: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get('format');
    const market = request.nextUrl.searchParams.get('market') || ''; // e.g. 'tastelanc', 'taste-cumberland', 'taste-fayetteville'
    const search = request.nextUrl.searchParams.get('search') || '';

    // Fetch all auth users (paginated — Supabase returns max 1000 per page)
    const allAuthUsers: Array<{
      id: string;
      email?: string;
      is_anonymous?: boolean;
      created_at: string;
      last_sign_in_at?: string;
      user_metadata?: Record<string, unknown>;
    }> = [];

    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) {
        console.error('Error listing users:', error);
        break;
      }
      allAuthUsers.push(...users);
      if (users.length < perPage) break;
      page++;
    }

    const PAGE_SIZE = 1000;

    // Fetch profiles (paginated)
    const allProfiles: Array<{ id: string; display_name: string | null; last_seen_at: string | null; role: string | null }> = [];
    for (let off = 0; ; off += PAGE_SIZE) {
      const { data: page } = await supabaseAdmin.from('profiles').select('id, display_name, last_seen_at, role').range(off, off + PAGE_SIZE - 1);
      if (!page || page.length === 0) break;
      allProfiles.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    const profiles = allProfiles;

    // Fetch push tokens (paginated)
    const allPushTokens: Array<{ user_id: string; platform: string; app_slug: string | null }> = [];
    for (let off = 0; ; off += PAGE_SIZE) {
      const { data: page } = await supabaseAdmin.from('push_tokens').select('user_id, platform, app_slug').range(off, off + PAGE_SIZE - 1);
      if (!page || page.length === 0) break;
      allPushTokens.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    const pushTokens = allPushTokens;

    // Fetch favorites (paginated)
    const allFavorites: Array<{ user_id: string }> = [];
    for (let off = 0; ; off += PAGE_SIZE) {
      const { data: page } = await supabaseAdmin.from('favorites').select('user_id').range(off, off + PAGE_SIZE - 1);
      if (!page || page.length === 0) break;
      allFavorites.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    const favorites = allFavorites;

    // Fetch checkins (paginated)
    const allCheckins: Array<{ user_id: string }> = [];
    for (let off = 0; ; off += PAGE_SIZE) {
      const { data: page } = await supabaseAdmin.from('checkins').select('user_id').range(off, off + PAGE_SIZE - 1);
      if (!page || page.length === 0) break;
      allCheckins.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    const checkins = allCheckins;

    // Build lookup maps
    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    );

    // tokenMap: user_id → { platform, app_slug }
    // If market filter is active, only include tokens matching that app_slug
    const tokenMap = new Map<string, { platform: string; app_slug: string | null }>();
    for (const t of pushTokens || []) {
      if (!tokenMap.has(t.user_id)) {
        tokenMap.set(t.user_id, { platform: t.platform, app_slug: t.app_slug || null });
      }
    }

    // If market filter set, build a set of user_ids that have a token for that market
    const marketUserIds = market
      ? new Set(
          (pushTokens || [])
            .filter((t) => t.app_slug === market)
            .map((t) => t.user_id)
        )
      : null;

    const favCountMap = new Map<string, number>();
    for (const f of favorites || []) {
      favCountMap.set(f.user_id, (favCountMap.get(f.user_id) || 0) + 1);
    }

    const checkinCountMap = new Map<string, number>();
    for (const c of checkins || []) {
      checkinCountMap.set(c.user_id, (checkinCountMap.get(c.user_id) || 0) + 1);
    }

    // Build user list (exclude admin roles)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const users: AppUser[] = [];
    let signedInCount = 0;
    let anonymousCount = 0;
    let withEmailCount = 0;
    let activeLast7 = 0;
    let activeLast30 = 0;
    let iosTokens = 0;
    let androidTokens = 0;

    for (const authUser of allAuthUsers) {
      const profile = profileMap.get(authUser.id);

      // Skip admin users
      if (profile?.role && ['super_admin', 'co_founder', 'market_admin'].includes(profile.role)) {
        continue;
      }

      // Apply market filter — skip users without a token for this market
      if (marketUserIds && !marketUserIds.has(authUser.id)) {
        continue;
      }

      // Apply search filter
      if (search) {
        const q = search.toLowerCase();
        const matchesEmail = authUser.email?.toLowerCase().includes(q);
        const matchesName = profile?.display_name?.toLowerCase().includes(q);
        if (!matchesEmail && !matchesName) continue;
      }

      const isAnon = authUser.is_anonymous ?? true;
      const token = tokenMap.get(authUser.id);
      // Use last_seen_at from profiles (set by app), fall back to last_sign_in_at from auth
      const lastSeenRaw = profile?.last_seen_at || authUser.last_sign_in_at || null;
      const lastSeen = lastSeenRaw ? new Date(lastSeenRaw) : null;

      if (isAnon) {
        anonymousCount++;
      } else {
        signedInCount++;
      }

      if (authUser.email) withEmailCount++;

      if (lastSeen) {
        if (lastSeen >= sevenDaysAgo) activeLast7++;
        if (lastSeen >= thirtyDaysAgo) activeLast30++;
      }

      if (token) {
        if (token.platform === 'ios') iosTokens++;
        else if (token.platform === 'android') androidTokens++;
      }

      users.push({
        id: authUser.id,
        email: authUser.email || null,
        display_name: profile?.display_name || null,
        is_anonymous: isAnon,
        last_seen_at: lastSeenRaw,
        created_at: authUser.created_at,
        platform: token?.platform || null,
        app_slug: token?.app_slug || null,
        favorites_count: favCountMap.get(authUser.id) || 0,
        checkins_count: checkinCountMap.get(authUser.id) || 0,
        has_push_token: !!token,
      });
    }

    // Sort by last_seen_at descending (most recent first), nulls last
    users.sort((a, b) => {
      if (!a.last_seen_at && !b.last_seen_at) return 0;
      if (!a.last_seen_at) return 1;
      if (!b.last_seen_at) return -1;
      return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
    });

    const stats = {
      total: users.length,
      signedIn: signedInCount,
      anonymous: anonymousCount,
      withEmail: withEmailCount,
      activeLast7,
      activeLast30,
      pushTokens: iosTokens + androidTokens,
      iosTokens,
      androidTokens,
    };

    // CSV export
    if (format === 'csv') {
      const signedInUsers = users.filter((u) => !u.is_anonymous && u.email);
      const header = 'Email,Name,Last Seen,Platform,App,Favorites,Check-ins,Joined';
      const rows = signedInUsers.map((u) => {
        const lastSeen = u.last_seen_at
          ? new Date(u.last_seen_at).toISOString().split('T')[0]
          : 'Never';
        const joined = new Date(u.created_at).toISOString().split('T')[0];
        const name = (u.display_name || '').replace(/,/g, ' ');
        const email = (u.email || '').replace(/,/g, ' ');
        return `${email},${name},${lastSeen},${u.platform || 'Unknown'},${u.app_slug || 'Unknown'},${u.favorites_count},${u.checkins_count},${joined}`;
      });
      const csv = [header, ...rows].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="tastelanc-app-users-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ users, stats });
  } catch (error) {
    console.error('Error in app-users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
