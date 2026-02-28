import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifySalesAccess } from '@/lib/auth/sales-access';
import { getPayPeriod, getCommissionPayout, getCurrentTier, TIER_RESET_DAYS } from '@/config/commission';

export async function GET(request: Request) {
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
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get('rep_id') || (access.isSalesRep ? access.userId : null);
    const periodFilter = searchParams.get('period'); // 'current', 'last', or YYYY-MM-DD

    let query = serviceClient
      .from('sales_commissions')
      .select('*')
      .order('sale_date', { ascending: false });

    // Scope to rep unless admin viewing all
    if (!access.isAdmin || repId) {
      query = query.eq('sales_rep_id', repId || access.userId);
    }

    // Period filtering
    if (periodFilter === 'current' || !periodFilter) {
      const now = new Date();
      const pp = getPayPeriod(now);
      query = query.gte('sale_date', pp.start.toISOString().split('T')[0])
        .lte('sale_date', pp.end.toISOString().split('T')[0]);
    } else if (periodFilter === 'last') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const pp = getPayPeriod(lastWeek);
      query = query.gte('sale_date', pp.start.toISOString().split('T')[0])
        .lte('sale_date', pp.end.toISOString().split('T')[0]);
    } else if (periodFilter === 'all') {
      // No date filter
    }

    const { data: commissions, error } = await query;

    if (error) {
      console.error('Error fetching commissions:', error);
      return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
    }

    // Compute summary stats
    const targetRepId = repId || access.userId;
    const pending = (commissions || []).filter((c) => c.status === 'pending');
    const paid = (commissions || []).filter((c) => c.status === 'paid');
    const totalPending = pending.reduce((sum, c) => sum + Number(c.commission_amount), 0);
    const totalPaid = paid.reduce((sum, c) => sum + Number(c.commission_amount), 0);
    const totalEarned = (commissions || []).filter((c) => c.status !== 'void').reduce((sum, c) => sum + Number(c.commission_amount), 0);

    // Count signups in current 30-day window for tier calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - TIER_RESET_DAYS);

    const { count: signupsIn30Days } = await serviceClient
      .from('sales_commissions')
      .select('id', { count: 'exact', head: true })
      .eq('sales_rep_id', targetRepId)
      .eq('is_renewal', false)
      .neq('status', 'void')
      .gte('sale_date', thirtyDaysAgo.toISOString().split('T')[0]);

    const currentTier = getCurrentTier(signupsIn30Days || 0);
    const signupsUntilBonus = currentTier.rate === 0.20 ? 0 : 7 - (signupsIn30Days || 0);

    // Current pay period info
    const pp = getPayPeriod(new Date());

    return NextResponse.json({
      commissions: commissions || [],
      summary: {
        totalPending,
        totalPaid,
        totalEarned,
        currentTier: currentTier.label,
        currentRate: currentTier.rate,
        signupsIn30Days: signupsIn30Days || 0,
        signupsUntilBonus: Math.max(0, signupsUntilBonus),
        payPeriod: {
          start: pp.start.toISOString().split('T')[0],
          end: pp.end.toISOString().split('T')[0],
          payDate: pp.payDate.toISOString().split('T')[0],
        },
      },
    });
  } catch (error) {
    console.error('Error in commissions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const body = await request.json();
    const {
      sales_rep_id,
      lead_id,
      business_name,
      plan_name,
      length_months,
      sale_amount,
      is_renewal,
      sale_date,
    } = body;

    if (!business_name || !plan_name || !length_months || !sale_amount) {
      return NextResponse.json(
        { error: 'business_name, plan_name, length_months, and sale_amount are required' },
        { status: 400 }
      );
    }

    const repId = sales_rep_id || access.userId;
    const saleDate = sale_date ? new Date(sale_date) : new Date();
    const pp = getPayPeriod(saleDate);

    // Count signups in current 30-day window for this rep
    const thirtyDaysAgo = new Date(saleDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - TIER_RESET_DAYS);

    const { count: signupsIn30Days } = await serviceClient
      .from('sales_commissions')
      .select('id', { count: 'exact', head: true })
      .eq('sales_rep_id', repId)
      .eq('is_renewal', false)
      .neq('status', 'void')
      .gte('sale_date', thirtyDaysAgo.toISOString().split('T')[0]);

    // Current signup count (including this one if it's not a renewal)
    const totalSignups = (signupsIn30Days || 0) + (is_renewal ? 0 : 1);
    const commissionAmount = getCommissionPayout({
      planName: plan_name,
      lengthMonths: length_months,
      isRenewal: is_renewal || false,
      signupsInPeriod: totalSignups,
    });

    const tier = getCurrentTier(totalSignups);

    const { data: commission, error } = await serviceClient
      .from('sales_commissions')
      .insert({
        sales_rep_id: repId,
        lead_id: lead_id || null,
        business_name,
        plan_name,
        length_months,
        sale_amount: Number(sale_amount),
        commission_amount: commissionAmount,
        commission_rate: tier.rate,
        is_renewal: is_renewal || false,
        sale_date: saleDate.toISOString().split('T')[0],
        pay_period_start: pp.start.toISOString().split('T')[0],
        pay_period_end: pp.end.toISOString().split('T')[0],
        pay_date: pp.payDate.toISOString().split('T')[0],
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating commission:', error);
      return NextResponse.json({ error: 'Failed to create commission' }, { status: 500 });
    }

    return NextResponse.json({ commission });
  } catch (error) {
    console.error('Error in create commission API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
