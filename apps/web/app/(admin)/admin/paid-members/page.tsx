import { createClient } from '@/lib/supabase/server';
import { getAllStripeClients, ALL_CONSUMER_PRICE_IDS, SELF_PROMOTER_PRICE_IDS } from '@/lib/stripe';
import { BRAND } from '@/config/market';
import { Card, Badge } from '@/components/ui';
import { Store, CheckCircle, CreditCard, Calendar, ExternalLink, Users, Clock, Gift, ArrowRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import AdminMarketFilter from '@/components/admin/AdminMarketFilter';

interface PromotionalRestaurant {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  tier_name: string;
  created_at: string;
  market_id: string | null;
}

interface StripeSubscription {
  id: string;
  name: string;
  email: string;
  amount: number;
  interval: string;
  intervalCount: number;
  mrr: number;
  status: string;
  createdAt: string;
  customerId: string;
  priceId: string;
  plan?: string;
  marketId?: string | null;
  marketName?: string | null;
}

// Helper to check if price ID is a consumer subscription
function isConsumerPrice(priceId: string): boolean {
  return ALL_CONSUMER_PRICE_IDS.includes(priceId as typeof ALL_CONSUMER_PRICE_IDS[number]);
}

// Helper to check if price ID is a self-promoter subscription
function isSelfPromoterPrice(priceId: string): boolean {
  return priceId === SELF_PROMOTER_PRICE_IDS.monthly;
}

// Get plan name from price
function getPlanFromPrice(priceId: string, amount: number): string {
  if (isConsumerPrice(priceId)) return BRAND.premiumName;
  if (isSelfPromoterPrice(priceId)) return 'Self-Promoter';
  if (amount >= 1000) return 'Elite';
  if (amount <= 49) return 'Coffee Shop';
  return 'Premium';
}

// Build market lookup maps from Supabase restaurant data
async function getMarketLookupMaps() {
  const supabase = await createClient();

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, stripe_subscription_id, stripe_customer_id, market_id, markets(id, name, slug)')
    .not('stripe_subscription_id', 'is', null);

  const subIdToMarket: Record<string, { marketId: string; marketName: string }> = {};
  const customerIdToMarket: Record<string, { marketId: string; marketName: string }> = {};

  for (const r of restaurants || []) {
    if (!r.market_id) continue;
    const market = r.markets as unknown as { id: string; name: string; slug: string } | null;
    const marketInfo = { marketId: r.market_id, marketName: market?.name || 'Unknown' };

    if (r.stripe_subscription_id) {
      subIdToMarket[r.stripe_subscription_id] = marketInfo;
    }
    if (r.stripe_customer_id) {
      customerIdToMarket[r.stripe_customer_id] = marketInfo;
    }
  }

  return { subIdToMarket, customerIdToMarket };
}

async function getStripeSubscriptions(
  subIdToMarket: Record<string, { marketId: string; marketName: string }>,
  customerIdToMarket: Record<string, { marketId: string; marketName: string }>,
  markets: { id: string; name: string; slug: string }[]
) {
  const restaurants: StripeSubscription[] = [];
  const consumers: StripeSubscription[] = [];
  const selfPromoters: StripeSubscription[] = [];

  // Build slug → market lookup for Stripe account → market mapping
  const slugToMarket: Record<string, { marketId: string; marketName: string }> = {};
  for (const m of markets) {
    slugToMarket[m.slug] = { marketId: m.id, marketName: m.name };
  }

  const stripeClients = getAllStripeClients();

  // Query all Stripe accounts in parallel
  const results = await Promise.allSettled(
    stripeClients.map(async ({ marketSlug, stripe }) => {
      const [activeSubs, trialingSubs] = await Promise.all([
        stripe.subscriptions.list({ status: 'active', limit: 100, expand: ['data.customer'] }),
        stripe.subscriptions.list({ status: 'trialing', limit: 100, expand: ['data.customer'] }),
      ]);
      return { marketSlug, subscriptions: [...activeSubs.data, ...trialingSubs.data] };
    })
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Error fetching Stripe subscriptions:', result.reason);
      continue;
    }

    const { marketSlug, subscriptions } = result.value;
    // Default market for subscriptions from this Stripe account
    const accountMarket = slugToMarket[marketSlug] || null;

    for (const sub of subscriptions) {
      const customer = sub.customer;
      if (typeof customer !== 'object' || customer.deleted) continue;

      const email = customer.email || 'unknown';
      const name = customer.name || customer.metadata?.business_name || sub.metadata?.restaurant_name || email;
      const priceId = sub.items.data[0]?.price?.id || '';
      const amount = (sub.items.data[0]?.price?.unit_amount || 0) / 100;
      const interval = sub.items.data[0]?.price?.recurring?.interval || 'month';
      const intervalCount = sub.items.data[0]?.price?.recurring?.interval_count || 1;

      let mrr = amount;
      if (interval === 'year') {
        mrr = amount / 12;
      } else if (interval === 'month' && intervalCount > 1) {
        mrr = amount / intervalCount;
      }

      // Look up market: DB match first, then fall back to the Stripe account's market
      const marketInfo = subIdToMarket[sub.id] || customerIdToMarket[customer.id] || accountMarket;

      // Determine plan from Stripe product name (most reliable) or price amount
      let plan = getPlanFromPrice(priceId, amount);
      const productName = sub.items.data[0]?.price?.product;
      if (typeof productName === 'object' && 'name' in productName) {
        const pName = (productName as { name: string }).name.toLowerCase();
        if (pName.includes('elite')) plan = 'Elite';
        else if (pName.includes('coffee')) plan = 'Coffee Shop';
        else if (pName.includes('premium') && !pName.includes('consumer')) plan = 'Premium';
      }

      const subData: StripeSubscription = {
        id: sub.id,
        name,
        email,
        amount,
        interval,
        intervalCount,
        mrr,
        status: sub.status,
        createdAt: new Date(sub.created * 1000).toISOString(),
        customerId: customer.id,
        priceId,
        plan,
        marketId: marketInfo?.marketId || null,
        marketName: marketInfo?.marketName || null,
      };

      if (isConsumerPrice(priceId)) {
        consumers.push(subData);
      } else if (isSelfPromoterPrice(priceId)) {
        selfPromoters.push(subData);
      } else {
        restaurants.push(subData);
      }
    }
  }

  return { restaurants, consumers, selfPromoters };
}

function formatInterval(interval: string, intervalCount: number): string {
  if (interval === 'year') return 'year';
  if (intervalCount === 1) return 'month';
  return `${intervalCount}mo`;
}

async function getPromotionalRestaurants(scopedMarketId: string | null): Promise<PromotionalRestaurant[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('restaurants')
      .select(`
        id,
        name,
        city,
        state,
        created_at,
        market_id,
        tiers!inner(name)
      `)
      .in('tier_id', [
        '00000000-0000-0000-0000-000000000002', // premium
        '00000000-0000-0000-0000-000000000003', // elite
      ])
      .is('stripe_subscription_id', null)
      .order('name');

    if (scopedMarketId) {
      query = query.eq('market_id', scopedMarketId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching promotional restaurants:', error);
      return [];
    }

    return (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      state: r.state,
      market_id: r.market_id,
      tier_name: Array.isArray(r.tiers) ? r.tiers[0]?.name : (r.tiers as { name: string })?.name || 'unknown',
      created_at: r.created_at,
    }));
  } catch (error) {
    console.error('Error in getPromotionalRestaurants:', error);
    return [];
  }
}

async function getMarkets() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('markets')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name', { ascending: true });
  return data || [];
}

export default async function AdminPaidMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const supabase = await createClient();
  const admin = await verifyAdminAccess(supabase);
  const params = await searchParams;

  // Determine effective market filter
  const selectedMarket = admin.scopedMarketId || params.market || 'all';

  const [{ subIdToMarket, customerIdToMarket }, markets, promotionalRestaurants] = await Promise.all([
    getMarketLookupMaps(),
    getMarkets(),
    getPromotionalRestaurants(admin.scopedMarketId || (selectedMarket !== 'all' ? selectedMarket : null)),
  ]);

  const { restaurants: allRestaurants, consumers, selfPromoters } = await getStripeSubscriptions(
    subIdToMarket,
    customerIdToMarket,
    markets
  );

  // Filter restaurants by market if a market is selected
  const restaurants = selectedMarket === 'all'
    ? allRestaurants
    : allRestaurants.filter(r => r.marketId === selectedMarket);

  // Filter promotional restaurants by market too
  const filteredPromotional = selectedMarket === 'all'
    ? promotionalRestaurants
    : promotionalRestaurants.filter(r => r.market_id === selectedMarket);

  // Calculate per-market restaurant counts for tab badges
  const marketCounts: Record<string, { count: number; mrr: number }> = {};
  for (const r of allRestaurants) {
    const mId = r.marketId || 'unknown';
    if (!marketCounts[mId]) marketCounts[mId] = { count: 0, mrr: 0 };
    marketCounts[mId].count++;
    marketCounts[mId].mrr += r.mrr;
  }

  const restaurantMRR = restaurants.reduce((sum, r) => sum + r.mrr, 0);
  const consumerMRR = consumers.reduce((sum, c) => sum + c.mrr, 0);
  const selfPromoterMRR = selfPromoters.reduce((sum, s) => sum + s.mrr, 0);
  const totalMRR = (selectedMarket === 'all' ? allRestaurants.reduce((s, r) => s + r.mrr, 0) : restaurantMRR) + consumerMRR + selfPromoterMRR;
  const totalCount = (selectedMarket === 'all' ? allRestaurants.length : restaurants.length) + consumers.length + selfPromoters.length;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Paid Members</h1>
          <p className="text-gray-400 mt-1">
            {totalCount} subscriptions from Stripe (active + trialing)
          </p>
        </div>
        {!admin.scopedMarketId && markets.length > 1 && (
          <AdminMarketFilter
            markets={markets}
            currentMarket={selectedMarket}
            basePath="/admin/paid-members"
          />
        )}
      </div>

      {/* Revenue Stats */}
      <div className="grid md:grid-cols-6 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-green-400" />
            <span className="text-gray-400">{selectedMarket === 'all' ? 'Total' : ''} MRR</span>
          </div>
          <p className="text-3xl font-bold text-green-400">${totalMRR.toFixed(0)}</p>
          <p className="text-xs text-gray-500 mt-1">ARR: ${(totalMRR * 12).toLocaleString()}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Store className="w-5 h-5 text-blue-500" />
            <span className="text-gray-400">Restaurants</span>
          </div>
          <p className="text-3xl font-bold text-white">{restaurants.length}</p>
          <p className="text-xs text-gray-500 mt-1">${restaurantMRR.toFixed(0)}/mo</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-purple-500" />
            <span className="text-gray-400">{BRAND.premiumName}</span>
          </div>
          <p className="text-3xl font-bold text-white">{consumers.length}</p>
          <p className="text-xs text-gray-500 mt-1">${consumerMRR.toFixed(0)}/mo</p>
        </Card>

        {selfPromoters.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-orange-500" />
              <span className="text-gray-400">Self-Promoters</span>
            </div>
            <p className="text-3xl font-bold text-white">{selfPromoters.length}</p>
            <p className="text-xs text-gray-500 mt-1">${selfPromoterMRR.toFixed(0)}/mo</p>
          </Card>
        )}

        {filteredPromotional.length > 0 && (
          <Card className="p-6 border-yellow-500/30">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="w-5 h-5 text-yellow-500" />
              <span className="text-gray-400">Demo/Free</span>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{filteredPromotional.length}</p>
            <p className="text-xs text-gray-500 mt-1">$0/mo (promotional)</p>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-gray-400">Paying</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalCount}</p>
          <p className="text-xs text-gray-500 mt-1">active subscriptions</p>
        </Card>
      </div>

      {/* Per-Market Breakdown (only show when viewing all markets) */}
      {selectedMarket === 'all' && markets.length > 1 && Object.keys(marketCounts).length > 0 && (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {markets.map(m => {
            const mc = marketCounts[m.id];
            if (!mc) return null;
            return (
              <Link
                key={m.id}
                href={`/admin/paid-members?market=${m.id}`}
                className="block"
              >
                <Card className="p-4 hover:border-blue-500/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-medium">{m.name}</span>
                    <Badge variant="default" className="ml-auto bg-blue-500/20 text-blue-400">
                      {mc.count} restaurant{mc.count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <p className="text-xs text-green-400 mt-2 ml-7">${mc.mrr.toFixed(0)}/mo MRR</p>
                </Card>
              </Link>
            );
          })}
          {/* Show unmatched subscriptions count */}
          {marketCounts['unknown'] && (
            <Card className="p-4 border-yellow-500/30">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-medium">Unlinked</span>
                <Badge variant="default" className="ml-auto bg-yellow-500/20 text-yellow-400">
                  {marketCounts['unknown'].count}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-2 ml-7">Not matched to a market</p>
            </Card>
          )}
        </div>
      )}

      {/* Restaurant Subscriptions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-blue-500" />
          Restaurant Subscriptions
        </h2>
        {restaurants.length === 0 ? (
          <Card className="p-8 text-center">
            <Store className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {selectedMarket === 'all' ? 'No restaurant subscriptions yet' : 'No subscriptions in this market yet'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {restaurants.map((sub) => (
              <Card key={sub.id} className="p-6 hover:border-green-500/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Store className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">{sub.name}</h3>
                        {sub.status === 'active' ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <span title="Trialing - paid, awaiting renewal">
                            <Clock className="w-4 h-4 text-yellow-400" />
                          </span>
                        )}
                        <Badge variant="default" className={`text-xs ${sub.plan === 'Elite' ? 'bg-purple-500/20 text-purple-400' : 'bg-lancaster-gold/20 text-lancaster-gold'}`}>
                          {sub.plan}
                        </Badge>
                        {selectedMarket === 'all' && sub.marketName && (
                          <Badge variant="default" className="text-xs bg-blue-500/10 text-blue-400">
                            {sub.marketName}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{sub.email}</p>
                      <p className="text-xs text-gray-500 mt-1 font-mono">{sub.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      ${sub.amount}
                      <span className="text-sm font-normal text-gray-400">/{formatInterval(sub.interval, sub.intervalCount)}</span>
                    </p>
                    <p className="text-xs text-green-400 mt-0.5">${sub.mrr.toFixed(0)}/mo MRR</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-1">
                      <Calendar className="w-3 h-3" />
                      Since {new Date(sub.createdAt).toLocaleDateString()}
                    </p>
                    <Link
                      href={`https://dashboard.stripe.com/subscriptions/${sub.id}`}
                      target="_blank"
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1 justify-end mt-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View in Stripe
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Promotional/Demo Accounts */}
      {filteredPromotional.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-yellow-500" />
            Demo / Promotional Accounts
            <Badge variant="default" className="bg-yellow-500/20 text-yellow-400 ml-2">
              {filteredPromotional.length} free
            </Badge>
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            These restaurants have premium/elite access without a subscription. Click &quot;Convert to Paid&quot; to create a checkout.
          </p>
          <div className="grid gap-4">
            {filteredPromotional.map((restaurant) => (
              <Card key={restaurant.id} className="p-6 border-yellow-500/30 hover:border-yellow-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <Gift className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">{restaurant.name}</h3>
                        <Badge variant="default" className={`text-xs ${restaurant.tier_name === 'elite' ? 'bg-purple-500/20 text-purple-400' : 'bg-lancaster-gold/20 text-lancaster-gold'}`}>
                          {restaurant.tier_name}
                        </Badge>
                        <Badge variant="default" className="text-xs bg-yellow-500/20 text-yellow-400">
                          Free
                        </Badge>
                      </div>
                      {(restaurant.city || restaurant.state) && (
                        <p className="text-sm text-gray-400">
                          {[restaurant.city, restaurant.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Added {new Date(restaurant.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/sales?restaurantId=${restaurant.id}&businessName=${encodeURIComponent(restaurant.name)}`}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Convert to Paid
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Consumer Subscriptions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          {BRAND.premiumName} Subscribers
        </h2>
        {consumers.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No consumer subscriptions yet</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-tastelanc-surface-light">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Plan</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Since</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tastelanc-surface-light">
                {consumers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-tastelanc-surface-light/50">
                    <td className="px-4 py-3">
                      <p className="text-white">{sub.email}</p>
                      <p className="text-xs text-gray-500 font-mono">{sub.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default" className="bg-purple-500/20 text-purple-400">
                        ${sub.amount}/{formatInterval(sub.interval, sub.intervalCount)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {sub.status === 'active' ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-400">Active</Badge>
                      ) : (
                        <Badge variant="default" className="bg-yellow-500/20 text-yellow-400">Trialing</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`https://dashboard.stripe.com/subscriptions/${sub.id}`}
                        target="_blank"
                        className="text-xs text-blue-400 hover:underline"
                      >
                        View in Stripe
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Self-Promoter Subscriptions */}
      {selfPromoters.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Self-Promoter Subscribers
          </h2>
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-tastelanc-surface-light">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Name/Email</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Plan</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Since</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tastelanc-surface-light">
                {selfPromoters.map((sub) => (
                  <tr key={sub.id} className="hover:bg-tastelanc-surface-light/50">
                    <td className="px-4 py-3">
                      <p className="text-white">{sub.name}</p>
                      <p className="text-xs text-gray-500">{sub.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default" className="bg-orange-500/20 text-orange-400">
                        ${sub.amount}/mo
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {sub.status === 'active' ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-400">Active</Badge>
                      ) : (
                        <Badge variant="default" className="bg-yellow-500/20 text-yellow-400">Trialing</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`https://dashboard.stripe.com/subscriptions/${sub.id}`}
                        target="_blank"
                        className="text-xs text-blue-400 hover:underline"
                      >
                        View in Stripe
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
