import { createClient } from '@/lib/supabase/server';
import { getStripe, ALL_CONSUMER_PRICE_IDS, SELF_PROMOTER_PRICE_IDS } from '@/lib/stripe';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import { BRAND } from '@/config/market';
import { Card, Badge } from '@/components/ui';
import {
  Store,
  Users,
  Eye,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Crown,
  Mail,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';

// Helper to check if price ID is a consumer subscription
function isConsumerPrice(priceId: string): boolean {
  return ALL_CONSUMER_PRICE_IDS.includes(priceId as typeof ALL_CONSUMER_PRICE_IDS[number]);
}

// Helper to check if price ID is a self-promoter subscription
function isSelfPromoterPrice(priceId: string): boolean {
  return priceId === SELF_PROMOTER_PRICE_IDS.monthly;
}

// Get real revenue data from Stripe
async function getStripeRevenue() {
  try {
    const stripe = getStripe();

    // Fetch both active AND trialing subscriptions (trialing = paid but waiting to renew)
    const [activeSubscriptions, trialingSubscriptions] = await Promise.all([
      stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        expand: ['data.customer'],
      }),
      stripe.subscriptions.list({
        status: 'trialing',
        limit: 100,
        expand: ['data.customer'],
      }),
    ]);

    const allSubscriptions = [...activeSubscriptions.data, ...trialingSubscriptions.data];

    let totalMRR = 0;
    let restaurantCount = 0;
    let consumerCount = 0;
    let selfPromoterCount = 0;

    for (const sub of allSubscriptions) {
      const customer = sub.customer;
      if (typeof customer !== 'object' || customer.deleted) continue;

      const priceId = sub.items.data[0]?.price?.id || '';
      const amount = (sub.items.data[0]?.price?.unit_amount || 0) / 100;
      const interval = sub.items.data[0]?.price?.recurring?.interval || 'month';
      const intervalCount = sub.items.data[0]?.price?.recurring?.interval_count || 1;

      // Calculate MRR based on interval (handle 3mo, 6mo, yearly)
      let mrr = amount;
      if (interval === 'year') {
        mrr = amount / 12;
      } else if (interval === 'month' && intervalCount > 1) {
        mrr = amount / intervalCount;
      }
      totalMRR += mrr;

      // Classify by price ID (more reliable than customer metadata)
      if (isConsumerPrice(priceId)) {
        consumerCount++;
      } else if (isSelfPromoterPrice(priceId)) {
        selfPromoterCount++;
      } else {
        restaurantCount++;
      }
    }

    return {
      mrr: Math.round(totalMRR * 100) / 100,
      arr: Math.round(totalMRR * 12 * 100) / 100,
      totalSubscriptions: allSubscriptions.length,
      restaurantCount,
      consumerCount,
      selfPromoterCount,
    };
  } catch (error) {
    console.error('Error fetching Stripe data:', error);
    return { mrr: 0, arr: 0, totalSubscriptions: 0, restaurantCount: 0, consumerCount: 0, selfPromoterCount: 0 };
  }
}

async function getAdminStats(scopedMarketId: string | null) {
  const supabase = await createClient();

  // Get total restaurants — super_admin sees all, market_admin sees only their market
  let restaurantCountQuery = supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true });
  if (scopedMarketId) restaurantCountQuery = restaurantCountQuery.eq('market_id', scopedMarketId);
  const { count: totalRestaurants } = await restaurantCountQuery;

  // Get active paid restaurants (those with Stripe subscriptions)
  let activeSubQuery = supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true })
    .not('stripe_subscription_id', 'is', null);
  if (scopedMarketId) activeSubQuery = activeSubQuery.eq('market_id', scopedMarketId);
  const { count: activeSubscriptions } = await activeSubQuery;

  // Get total page views (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: totalPageViews } = await supabase
    .from('analytics_page_views')
    .select('*', { count: 'exact', head: true })
    .gte('viewed_at', thirtyDaysAgo.toISOString());

  // Get contact submissions
  const { count: totalContacts } = await supabase
    .from('contact_submissions')
    .select('*', { count: 'exact', head: true });

  const { count: unreadContacts } = await supabase
    .from('contact_submissions')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null);

  // Get recent contacts
  const { data: recentContacts } = await supabase
    .from('contact_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  // Get paid restaurants by tier
  let paidTierQuery = supabase
    .from('restaurants')
    .select('tier_id, tiers(name)')
    .not('stripe_subscription_id', 'is', null);
  if (scopedMarketId) paidTierQuery = paidTierQuery.eq('market_id', scopedMarketId);
  const { data: paidRestaurantsByTier } = await paidTierQuery;

  const signupsByPlan = {
    starter: 0,
    premium: 0,
    elite: 0,
  };

  paidRestaurantsByTier?.forEach((restaurant) => {
    const tier = Array.isArray(restaurant.tiers) ? restaurant.tiers[0] : restaurant.tiers;
    const tierName = tier?.name?.toLowerCase();
    if (tierName && tierName in signupsByPlan) {
      signupsByPlan[tierName as keyof typeof signupsByPlan]++;
    }
  });

  // Get waitlist/early access signups
  const { count: totalWaitlistSignups } = await supabase
    .from('early_access_signups')
    .select('*', { count: 'exact', head: true });

  // Get today's waitlist signups (using EST timezone)
  // Create midnight EST for today
  const now = new Date();
  const estOffset = -5 * 60; // EST is UTC-5
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const estTime = new Date(utcTime + (estOffset * 60000));
  // Get start of day in EST, then convert to UTC for query
  const todayStartEST = new Date(estTime.getFullYear(), estTime.getMonth(), estTime.getDate(), 0, 0, 0);
  const todayStartUTC = new Date(todayStartEST.getTime() + (5 * 60 * 60000)); // Add 5 hours to get UTC

  const { count: todayWaitlistSignups } = await supabase
    .from('early_access_signups')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStartUTC.toISOString());

  // Get recent waitlist signups
  const { data: recentWaitlistSignups } = await supabase
    .from('early_access_signups')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    totalRestaurants: totalRestaurants || 0,
    activeSubscriptions: activeSubscriptions || 0,
    totalPageViews: totalPageViews || 0,
    totalContacts: totalContacts || 0,
    unreadContacts: unreadContacts || 0,
    recentContacts: recentContacts || [],
    signupsByPlan,
    totalWaitlistSignups: totalWaitlistSignups || 0,
    todayWaitlistSignups: todayWaitlistSignups || 0,
    recentWaitlistSignups: recentWaitlistSignups || [],
  };
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const admin = await verifyAdminAccess(supabase);

  const [stats, stripeRevenue] = await Promise.all([
    getAdminStats(admin.scopedMarketId),
    getStripeRevenue(),
  ]);

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 mt-1 text-sm md:text-base">Overview of {BRAND.name} platform</p>
      </div>

      {/* Revenue Banner */}
      <Card className="p-4 md:p-6 mb-6 md:mb-8 bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/30">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Monthly Recurring Revenue</p>
              <p className="text-3xl font-bold text-green-400">${stripeRevenue.mrr.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stripeRevenue.restaurantCount}</p>
              <p className="text-gray-400 text-xs">Restaurants</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stripeRevenue.consumerCount}</p>
              <p className="text-gray-400 text-xs">{BRAND.premiumName}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">${stripeRevenue.arr.toLocaleString()}</p>
              <p className="text-gray-400 text-xs">ARR</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6 mb-6 md:mb-8">
        <Link href="/admin/early-access">
          <Card className="p-4 md:p-6 hover:ring-2 hover:ring-lancaster-gold/50 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-lancaster-gold/20 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 md:w-6 md:h-6 text-lancaster-gold" />
              </div>
              {stats.todayWaitlistSignups > 0 && (
                <Badge variant="accent" className="text-xs">+{stats.todayWaitlistSignups} today</Badge>
              )}
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalWaitlistSignups}</p>
            <p className="text-gray-400 text-xs md:text-sm">Waitlist Signups</p>
          </Card>
        </Link>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500 hidden md:block" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalRestaurants}</p>
          <p className="text-gray-400 text-xs md:text-sm">Total Restaurants</p>
        </Card>

        <Link href="/admin/paid-members">
          <Card className="p-4 md:p-6 hover:ring-2 hover:ring-green-500/50 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{stripeRevenue.totalSubscriptions}</p>
            <p className="text-gray-400 text-xs md:text-sm">Paid Members</p>
          </Card>
        </Link>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 md:w-6 md:h-6 text-purple-500" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalPageViews.toLocaleString()}</p>
          <p className="text-gray-400 text-xs md:text-sm">Views (30d)</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-tastelanc-accent/20 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-tastelanc-accent" />
            </div>
            {stats.unreadContacts > 0 && (
              <Badge variant="accent" className="text-xs">{stats.unreadContacts} new</Badge>
            )}
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalContacts}</p>
          <p className="text-gray-400 text-xs md:text-sm">Contacts</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
        {/* Recent Waitlist Signups */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-lancaster-gold" />
              Waitlist
            </h2>
            {stats.todayWaitlistSignups > 0 && (
              <Badge variant="accent" className="text-xs">+{stats.todayWaitlistSignups} today</Badge>
            )}
          </div>
          {stats.recentWaitlistSignups.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No waitlist signups yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentWaitlistSignups.map((signup: { id: string; email: string; source?: string; created_at: string; converted_at?: string | null }) => (
                <div
                  key={signup.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-tastelanc-surface-light/50"
                >
                  <div className="w-8 h-8 bg-lancaster-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-lancaster-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{signup.email}</p>
                    <p className="text-gray-500 text-xs">
                      {new Date(signup.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: 'America/New_York',
                      })}
                    </p>
                  </div>
                  {signup.converted_at && (
                    <Badge variant="default" className="text-xs bg-green-500/20 text-green-400">Converted</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
          <Link
            href="/admin/early-access"
            className="mt-6 inline-block text-lancaster-gold hover:underline text-sm"
          >
            View all analytics &rarr;
          </Link>
        </Card>

        {/* Paid Members by Plan */}
        <Card className="p-4 md:p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Paid Members by Plan</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">Starter</span>
                <span className="text-white font-medium">{stats.signupsByPlan.starter}</span>
              </div>
              <div className="h-2 bg-tastelanc-surface-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${Math.max(5, (stats.signupsByPlan.starter / Math.max(stats.activeSubscriptions, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">Premium</span>
                <span className="text-white font-medium">{stats.signupsByPlan.premium}</span>
              </div>
              <div className="h-2 bg-tastelanc-surface-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-lancaster-gold rounded-full"
                  style={{
                    width: `${Math.max(5, (stats.signupsByPlan.premium / Math.max(stats.activeSubscriptions, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">Elite</span>
                <span className="text-white font-medium">{stats.signupsByPlan.elite}</span>
              </div>
              <div className="h-2 bg-tastelanc-surface-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: `${Math.max(5, (stats.signupsByPlan.elite / Math.max(stats.activeSubscriptions, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <Link
            href="/admin/paid-members"
            className="mt-6 inline-block text-tastelanc-accent hover:underline text-sm"
          >
            View all paid members &rarr;
          </Link>
        </Card>

        {/* Recent Contacts */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Contacts</h2>
            {stats.unreadContacts > 0 && (
              <div className="flex items-center gap-1 text-tastelanc-accent text-sm">
                <AlertCircle className="w-4 h-4" />
                {stats.unreadContacts} unread
              </div>
            )}
          </div>
          {stats.recentContacts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No contacts yet</p>
          ) : (
            <div className="space-y-4">
              {stats.recentContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-tastelanc-surface-light/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">
                        {contact.name}
                      </span>
                      {!contact.read_at && (
                        <span className="w-2 h-2 bg-tastelanc-accent rounded-full" />
                      )}
                    </div>
                    <p className="text-gray-400 text-sm truncate">
                      {contact.business_name || contact.email}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(contact.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: 'America/New_York',
                      })}
                    </p>
                  </div>
                  {contact.interested_plan && (
                    <Badge variant="default" className="text-xs capitalize">
                      {contact.interested_plan}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
          <Link
            href="/admin/contacts"
            className="mt-6 inline-block text-tastelanc-accent hover:underline text-sm"
          >
            View all contacts &rarr;
          </Link>
        </Card>
      </div>
    </div>
  );
}
