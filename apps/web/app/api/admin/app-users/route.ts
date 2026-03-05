import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  favorites_count: number;
  has_push_token: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get('format');

    // Fetch all auth users (paginated — Supabase returns max 1000 per page)
    const allAuthUsers: Array<{
      id: string;
      email?: string;
      is_anonymous?: boolean;
      created_at: string;
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

    // Fetch profiles (last_seen_at, display_name, role)
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, last_seen_at, role');

    // Fetch push tokens (user_id, platform)
    const { data: pushTokens } = await supabaseAdmin
      .from('push_tokens')
      .select('user_id, platform');

    // Fetch favorite counts per user
    const { data: favorites } = await supabaseAdmin
      .from('favorites')
      .select('user_id');

    // Build lookup maps
    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    );
    const tokenMap = new Map<string, { platform: string; count: number }>();
    for (const t of pushTokens || []) {
      if (!tokenMap.has(t.user_id)) {
        tokenMap.set(t.user_id, { platform: t.platform, count: 1 });
      } else {
        tokenMap.get(t.user_id)!.count++;
      }
    }
    const favCountMap = new Map<string, number>();
    for (const f of favorites || []) {
      favCountMap.set(f.user_id, (favCountMap.get(f.user_id) || 0) + 1);
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

      const isAnon = authUser.is_anonymous ?? true;
      const token = tokenMap.get(authUser.id);
      const lastSeen = profile?.last_seen_at ? new Date(profile.last_seen_at) : null;

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
        last_seen_at: profile?.last_seen_at || null,
        created_at: authUser.created_at,
        platform: token?.platform || null,
        favorites_count: favCountMap.get(authUser.id) || 0,
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
      const header = 'Email,Name,Last Seen,Platform,Favorites,Joined';
      const rows = signedInUsers.map((u) => {
        const lastSeen = u.last_seen_at
          ? new Date(u.last_seen_at).toISOString().split('T')[0]
          : 'Never';
        const joined = new Date(u.created_at).toISOString().split('T')[0];
        const name = (u.display_name || '').replace(/,/g, ' ');
        const email = (u.email || '').replace(/,/g, ' ');
        return `${email},${name},${lastSeen},${u.platform || 'Unknown'},${u.favorites_count},${joined}`;
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
