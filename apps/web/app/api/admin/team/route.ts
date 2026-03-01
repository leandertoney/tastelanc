import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/auth/admin-access';

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = await verifyAdminAccess(supabase);

    // Only super_admin and co_founder can manage team
    if (admin.role !== 'super_admin' && admin.role !== 'co_founder') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch all profiles with admin roles
    const { data: adminProfiles } = await serviceClient
      .from('profiles')
      .select('id, role, admin_market_id, email, display_name');

    // Fetch all sales reps
    const { data: salesReps } = await serviceClient
      .from('sales_reps')
      .select('*');

    // Fetch all markets for name resolution
    const { data: markets } = await serviceClient
      .from('markets')
      .select('id, name, slug, is_active')
      .order('name');

    // Fetch lead counts per rep
    const { data: leadCounts } = await serviceClient
      .from('business_leads')
      .select('assigned_to');

    const leadCountMap: Record<string, number> = {};
    if (leadCounts) {
      for (const l of leadCounts) {
        if (l.assigned_to) {
          leadCountMap[l.assigned_to] = (leadCountMap[l.assigned_to] || 0) + 1;
        }
      }
    }

    const marketMap: Record<string, string> = {};
    if (markets) {
      for (const m of markets) {
        marketMap[m.id] = m.name;
      }
    }

    // Build unified team member list
    const memberMap = new Map<string, Record<string, unknown>>();

    // Add admin profiles
    if (adminProfiles) {
      for (const p of adminProfiles) {
        if (!p.role) continue; // skip non-admin profiles
        memberMap.set(p.id, {
          id: p.id,
          name: p.display_name || p.email || 'Unknown',
          email: p.email || '',
          profileRole: p.role,
          adminMarketId: p.admin_market_id,
          adminMarketName: p.admin_market_id ? marketMap[p.admin_market_id] || null : null,
          isSalesRep: false,
          salesRepData: null,
          leadCount: leadCountMap[p.id] || 0,
          marketNames: p.role === 'super_admin' || p.role === 'co_founder'
            ? ['All Markets']
            : p.admin_market_id ? [marketMap[p.admin_market_id] || 'Unknown'] : [],
        });
      }
    }

    // Add/merge sales reps
    if (salesReps) {
      for (const rep of salesReps) {
        const existing = memberMap.get(rep.id);
        const repMarketNames = (rep.market_ids || []).map((id: string) => marketMap[id] || 'Unknown');

        if (existing) {
          // Merge — person is both admin and sales rep
          existing.isSalesRep = true;
          existing.salesRepData = {
            market_ids: rep.market_ids || [],
            is_active: rep.is_active,
            phone: rep.phone,
            preferred_sender_name: rep.preferred_sender_name,
            preferred_sender_email: rep.preferred_sender_email,
          };
          existing.name = rep.name || existing.name;
          if (!existing.email || existing.email === '') existing.email = rep.email;
          // Use rep market names if profile didn't set them (for co_founder/super_admin they already say "All Markets")
          if ((existing.marketNames as string[]).length === 0) {
            existing.marketNames = repMarketNames;
          }
        } else {
          memberMap.set(rep.id, {
            id: rep.id,
            name: rep.name,
            email: rep.email,
            profileRole: null,
            adminMarketId: null,
            adminMarketName: null,
            isSalesRep: true,
            salesRepData: {
              market_ids: rep.market_ids || [],
              is_active: rep.is_active,
              phone: rep.phone,
              preferred_sender_name: rep.preferred_sender_name,
              preferred_sender_email: rep.preferred_sender_email,
            },
            leadCount: leadCountMap[rep.id] || 0,
            marketNames: repMarketNames,
          });
        }
      }
    }

    // Sort: super_admin first, then co_founder, then market_admin, then sales reps
    const roleOrder: Record<string, number> = { super_admin: 0, co_founder: 1, market_admin: 2 };
    const members = Array.from(memberMap.values()).sort((a, b) => {
      const aOrder = roleOrder[a.profileRole as string] ?? 3;
      const bOrder = roleOrder[b.profileRole as string] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.name as string).localeCompare(b.name as string);
    });

    return NextResponse.json({ members, markets: markets || [] });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Error in team API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
