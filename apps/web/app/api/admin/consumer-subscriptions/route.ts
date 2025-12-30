import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get all consumer subscriptions
    const { data: subscriptions, error } = await supabaseAdmin
      .from('consumer_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching consumer subscriptions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get user emails for each subscription
    const subscriptionsWithEmail = await Promise.all(
      (subscriptions || []).map(async (sub) => {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
        return {
          ...sub,
          email: userData?.user?.email || 'Unknown',
          full_name: userData?.user?.user_metadata?.full_name || null,
        };
      })
    );

    // Calculate stats
    const activeSubscriptions = subscriptionsWithEmail.filter((s) => s.status === 'active');
    const monthlyActive = activeSubscriptions.filter((s) => s.billing_period === 'monthly');
    const yearlyActive = activeSubscriptions.filter((s) => s.billing_period === 'yearly');
    const founders = activeSubscriptions.filter((s) => s.is_founder);

    // Calculate revenue (early access pricing)
    const monthlyRevenue = monthlyActive.length * 1.99;
    const yearlyMonthlyEquiv = (yearlyActive.length * 19.99) / 12;
    const mrr = monthlyRevenue + yearlyMonthlyEquiv;
    const arr = mrr * 12;

    return NextResponse.json({
      subscriptions: subscriptionsWithEmail,
      stats: {
        total: subscriptionsWithEmail.length,
        active: activeSubscriptions.length,
        monthly: monthlyActive.length,
        yearly: yearlyActive.length,
        founders: founders.length,
        mrr,
        arr,
        totalRevenue: monthlyActive.length * 1.99 + yearlyActive.length * 19.99,
      },
    });
  } catch (error) {
    console.error('Error in consumer subscriptions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
