import { createClient } from '@/lib/supabase/server';
import { getAllStripeClients, ALL_CONSUMER_PRICE_IDS, SELF_PROMOTER_PRICE_IDS } from '@/lib/stripe';
import { BRAND } from '@/config/market';
import { Card, Badge } from '@/components/ui';
import { Store, CheckCircle, CreditCard, Calendar, ExternalLink, Users, Clock, Gift, ArrowRight, MapPin, Phone, Globe, Mail } from 'lucide-react';
import Link from 'next/link';
import { verifyAdminAccess } from '@/lib/auth/admin-access';
import AdminMarketFilter from '@/components/admin/AdminMarketFilter';
import PaidMembersSearch from '@/components/admin/PaidMembersSearch';

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
  phone: string | null;
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
  restaurantName?: string | null;
  restaurantAddress?: string | null;
  restaurantWebsite?: string | null;
}

interface RestaurantContactInfo {
  restaurantName: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  website: string | null;
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
    .select('id, name, stripe_subscription_id, stripe_customer_id, market_id, phone, address, city, state, zip_code, website, markets(id, name, slug)')
    .not('stripe_subscription_id', 'is', null);

  const subIdToMarket: Record<string, { marketId: string; marketName: string }> = {};
  const customerIdToMarket: Record<string, { marketId: string; marketName: string }> = {};
  const subIdToContact: Record<string, RestaurantContactInfo> = {};
  const customerIdToContact: Record<string, RestaurantContactInfo> = {};

  for (const r of restaurants || []) {
    const contact: RestaurantContactInfo = {
      restaurantName: r.name,
      phone: r.phone || null,
      address: r.address || null,
      city: r.city || null,
      state: r.state || null,
      zipCode: r.zip_code || null,
      website: r.website || null,
    };

    if (r.stripe_subscription_id) {
      subIdToContact[r.stripe_subscription_id] = contact;
    }
    if (r.stripe_customer_id) {
      customerIdToContact[r.stripe_customer_id] = contact;
    }

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

  return { subIdToMarket, customerIdToMarket, subIdToContact, customerIdToContact };
}

async function getStripeSubscriptions(
  subIdToMarket: Record<string, { marketId: string; marketName: string }>,
  customerIdToMarket: Record<string, { marketId: string; marketName: string }>,
  subIdToContact: Record<string, RestaurantContactInfo>,
  customerIdToContact: Record<string, RestaurantContactInfo>,
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

      // Look up restaurant contact info from DB
      const restaurantContact = subIdToContact[sub.id] || customerIdToContact[customer.id] || null;

      // Phone: Stripe customer phone first, DB restaurant phone as fallback
      const phone = customer.phone || restaurantContact?.phone || null;

      // Format restaurant address from DB if available
      let restaurantAddress: string | null = null;
      if (restaurantContact) {
        const parts = [restaurantContact.address, restaurantContact.city, restaurantContact.state].filter(Boolean);
        if (parts.length > 0) {
          restaurantAddress = parts.join(', ');
          if (restaurantContact.zipCode) restaurantAddress += ` ${restaurantContact.zipCode}`;
        }
      }

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
        phone,
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
        restaurantName: restaurantContact?.restaurantName || null,
        restaurantAddress,
        restaurantWebsite: restaurantContact?.website || null,
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

async function getPromotionalRestaurants(scopedMarketIds: string[] | null): Promise<PromotionalRestaurant[]> {
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

    if (scopedMarketIds) {
      query = query.in('market_id', scopedMarketIds);
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
  searchParams: Promise<{ market?: string; q?: string; type?: string; status?: string }>;
}) {
  const supabase = await createClient();
  const admin = await verifyAdminAccess(supabase);
  const params = await searchParams;

  // Determine effective market filter
  const selectedMarket = params.market || 'all';
  // Effective market IDs for filtering: URL param takes precedence, then admin scope
  const effectiveMarketIds = selectedMarket !== 'all'
    ? [selectedMarket]
    : admin.scopedMarketIds || null;

  const [{ subIdToMarket, customerIdToMarket, subIdToContact, customerIdToContact }, markets, promotionalRestaurants] = await Promise.all([
    getMarketLookupMaps(),
    getMarkets(),
    getPromotionalRestaurants(effectiveMarketIds),
  ]);

  const { restaurants: allRestaurants, consumers, selfPromoters } = await getStripeSubscriptions(
    subIdToMarket,
    customerIdToMarket,
    subIdToContact,
    customerIdToContact,
    markets
  );

  const canViewStripe = admin.role === 'super_admin' || admin.role === 'co_founder';
  const searchQuery = params.q?.toLowerCase().trim() || '';
  const typeFilter = params.type || 'all';
  const statusFilter = params.status || 'all';

  // Filter restaurants by effective market scope
  let restaurants = effectiveMarketIds
    ? allRestaurants.filter(r => r.marketId && effectiveMarketIds.includes(r.marketId))
    : allRestaurants;

  // Filter promotional restaurants by market too
  let filteredPromotional = effectiveMarketIds
    ? promotionalRestaurants.filter(r => r.market_id && effectiveMarketIds.includes(r.market_id))
    : promotionalRestaurants;

  // Apply search filter across all lists
  let filteredConsumers = consumers;
  let filteredSelfPromoters = selfPromoters;

  if (searchQuery) {
    const matchSub = (s: StripeSubscription) =>
      s.name.toLowerCase().includes(searchQuery) ||
      (s.restaurantName && s.restaurantName.toLowerCase().includes(searchQuery)) ||
      s.email.toLowerCase().includes(searchQuery) ||
      (s.phone && s.phone.includes(searchQuery)) ||
      (s.restaurantAddress && s.restaurantAddress.toLowerCase().includes(searchQuery)) ||
      (s.plan && s.plan.toLowerCase().includes(searchQuery));

    restaurants = restaurants.filter(matchSub);
    filteredConsumers = consumers.filter(matchSub);
    filteredSelfPromoters = selfPromoters.filter(matchSub);
    filteredPromotional = filteredPromotional.filter(p =>
      p.name.toLowerCase().includes(searchQuery) ||
      (p.city && p.city.toLowerCase().includes(searchQuery)) ||
      (p.state && p.state.toLowerCase().includes(searchQuery))
    );
  }

  // Apply status filter
  if (statusFilter !== 'all') {
    restaurants = restaurants.filter(r => r.status === statusFilter);
    filteredConsumers = filteredConsumers.filter(c => c.status === statusFilter);
    filteredSelfPromoters = filteredSelfPromoters.filter(s => s.status === statusFilter);
  }

  // Apply type filter — hide sections that don't match
  const showRestaurants = typeFilter === 'all' || typeFilter === 'restaurants';
  const showConsumers = typeFilter === 'all' || typeFilter === 'consumers';
  const showSelfPromoters = typeFilter === 'all' || typeFilter === 'self-promoters';
  const showPromotional = typeFilter === 'all' || typeFilter === 'promotional';

  const hasActiveFilters = searchQuery || typeFilter !== 'all' || statusFilter !== 'all';
  const filteredTotal = (showRestaurants ? restaurants.length : 0) + (showConsumers ? filteredConsumers.length : 0) + (showSelfPromoters ? filteredSelfPromoters.length : 0) + (showPromotional ? filteredPromotional.length : 0);

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
  const totalMRR = restaurantMRR + consumerMRR + selfPromoterMRR;
  const totalCount = restaurants.length + consumers.length + selfPromoters.length;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-tastelanc-text-primary">Paid Members</h1>
          <p className="text-tastelanc-text-muted mt-1">
            {hasActiveFilters
              ? `${filteredTotal} result${filteredTotal !== 1 ? 's' : ''} found`
              : `${totalCount} subscriptions from Stripe (active + trialing)`
            }
          </p>
        </div>
        {!admin.scopedMarketIds && markets.length > 1 && (
          <AdminMarketFilter
            markets={markets}
            currentMarket={params.market || 'all'}
            basePath="/admin/paid-members"
          />
        )}
      </div>

      {/* Search & Filters */}
      <div className="mb-8">
        <PaidMembersSearch />
      </div>

      {/* Revenue Stats */}
      <div className={`grid gap-6 mb-8 ${canViewStripe ? 'md:grid-cols-6' : 'md:grid-cols-4'}`}>
        {canViewStripe && (
          <Card className="p-6 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-green-400" />
              <span className="text-tastelanc-text-muted">{!effectiveMarketIds ? 'Total' : ''} MRR</span>
            </div>
            <p className="text-3xl font-bold text-green-400">${totalMRR.toFixed(0)}</p>
            <p className="text-xs text-tastelanc-text-faint mt-1">ARR: ${(totalMRR * 12).toLocaleString()}</p>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Store className="w-5 h-5 text-blue-500" />
            <span className="text-tastelanc-text-muted">Restaurants</span>
          </div>
          <p className="text-3xl font-bold text-tastelanc-text-primary">{restaurants.length}</p>
          {canViewStripe && <p className="text-xs text-tastelanc-text-faint mt-1">${restaurantMRR.toFixed(0)}/mo</p>}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-purple-500" />
            <span className="text-tastelanc-text-muted">{BRAND.premiumName}</span>
          </div>
          <p className="text-3xl font-bold text-tastelanc-text-primary">{consumers.length}</p>
          {canViewStripe && <p className="text-xs text-tastelanc-text-faint mt-1">${consumerMRR.toFixed(0)}/mo</p>}
        </Card>

        {selfPromoters.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-orange-500" />
              <span className="text-tastelanc-text-muted">Self-Promoters</span>
            </div>
            <p className="text-3xl font-bold text-tastelanc-text-primary">{selfPromoters.length}</p>
            {canViewStripe && <p className="text-xs text-tastelanc-text-faint mt-1">${selfPromoterMRR.toFixed(0)}/mo</p>}
          </Card>
        )}

        {filteredPromotional.length > 0 && (
          <Card className="p-6 border-yellow-500/30">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="w-5 h-5 text-yellow-500" />
              <span className="text-tastelanc-text-muted">Demo/Free</span>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{filteredPromotional.length}</p>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-tastelanc-text-muted">Paying</span>
          </div>
          <p className="text-3xl font-bold text-tastelanc-text-primary">{totalCount}</p>
          <p className="text-xs text-tastelanc-text-faint mt-1">active subscriptions</p>
        </Card>
      </div>

      {/* Per-Market Breakdown (only show when viewing all markets) */}
      {!effectiveMarketIds && markets.length > 1 && Object.keys(marketCounts).length > 0 && (
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
                    <span className="text-tastelanc-text-primary font-medium">{m.name}</span>
                    <Badge variant="default" className="ml-auto bg-blue-500/20 text-blue-400">
                      {mc.count} restaurant{mc.count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {canViewStripe && <p className="text-xs text-green-400 mt-2 ml-7">${mc.mrr.toFixed(0)}/mo MRR</p>}
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
              <p className="text-xs text-tastelanc-text-faint mt-2 ml-7">Not matched to a market</p>
            </Card>
          )}
        </div>
      )}

      {/* Restaurant Subscriptions */}
      {showRestaurants && (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-tastelanc-text-primary mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-blue-500" />
          Restaurant Subscriptions
        </h2>
        {restaurants.length === 0 ? (
          <Card className="p-8 text-center">
            <Store className="w-12 h-12 text-tastelanc-text-faint mx-auto mb-4" />
            <p className="text-tastelanc-text-muted">
              {searchQuery ? 'No matching restaurant subscriptions' : selectedMarket === 'all' ? 'No restaurant subscriptions yet' : 'No subscriptions in this market yet'}
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
                        <h3 className="text-lg font-semibold text-tastelanc-text-primary">{sub.restaurantName || sub.name}</h3>
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
                        {!effectiveMarketIds && sub.marketName && (
                          <Badge variant="default" className="text-xs bg-blue-500/10 text-blue-400">
                            {sub.marketName}
                          </Badge>
                        )}
                      </div>
                      {sub.restaurantName && sub.restaurantName !== sub.name && (
                        <p className="text-sm text-tastelanc-text-muted -mt-0.5 mb-1">Contact: {sub.name}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <Link href={`/sales/inbox?compose=true&to=${encodeURIComponent(sub.email)}&name=${encodeURIComponent(sub.name || '')}`} className="text-sm text-blue-400 hover:underline flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {sub.email}
                        </Link>
                        {sub.phone && (
                          <a href={`tel:${sub.phone}`} className="text-sm text-green-400 hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {sub.phone}
                          </a>
                        )}
                        {sub.restaurantWebsite && (
                          <a href={sub.restaurantWebsite.startsWith('http') ? sub.restaurantWebsite : `https://${sub.restaurantWebsite}`} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-400 hover:underline flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Website
                          </a>
                        )}
                      </div>
                      {sub.restaurantAddress && (
                        <p className="text-xs text-tastelanc-text-faint mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {sub.restaurantAddress}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {canViewStripe && (
                      <>
                        <p className="text-2xl font-bold text-tastelanc-text-primary">
                          ${sub.amount}
                          <span className="text-sm font-normal text-tastelanc-text-muted">/{formatInterval(sub.interval, sub.intervalCount)}</span>
                        </p>
                        <p className="text-xs text-green-400 mt-0.5">${sub.mrr.toFixed(0)}/mo MRR</p>
                      </>
                    )}
                    <p className="text-xs text-tastelanc-text-faint flex items-center gap-1 justify-end mt-1">
                      <Calendar className="w-3 h-3" />
                      Since {new Date(sub.createdAt).toLocaleDateString()}
                    </p>
                    {canViewStripe && (
                      <Link
                        href={`https://dashboard.stripe.com/subscriptions/${sub.id}`}
                        target="_blank"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1 justify-end mt-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View in Stripe
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Promotional/Demo Accounts */}
      {showPromotional && filteredPromotional.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-tastelanc-text-primary mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-yellow-500" />
            Demo / Promotional Accounts
            <Badge variant="default" className="bg-yellow-500/20 text-yellow-400 ml-2">
              {filteredPromotional.length} free
            </Badge>
          </h2>
          <p className="text-tastelanc-text-muted text-sm mb-4">
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
                        <h3 className="text-lg font-semibold text-tastelanc-text-primary">{restaurant.name}</h3>
                        <Badge variant="default" className={`text-xs ${restaurant.tier_name === 'elite' ? 'bg-purple-500/20 text-purple-400' : 'bg-lancaster-gold/20 text-lancaster-gold'}`}>
                          {restaurant.tier_name}
                        </Badge>
                        <Badge variant="default" className="text-xs bg-yellow-500/20 text-yellow-400">
                          Free
                        </Badge>
                      </div>
                      {(restaurant.city || restaurant.state) && (
                        <p className="text-sm text-tastelanc-text-muted">
                          {[restaurant.city, restaurant.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-tastelanc-text-faint mt-1">
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
      {showConsumers && (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-tastelanc-text-primary mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          {BRAND.premiumName} Subscribers
        </h2>
        {filteredConsumers.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 text-tastelanc-text-faint mx-auto mb-4" />
            <p className="text-tastelanc-text-muted">{searchQuery ? 'No matching consumer subscriptions' : 'No consumer subscriptions yet'}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-tastelanc-surface-light">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-tastelanc-text-muted">Contact</th>
                  {canViewStripe && <th className="text-left px-4 py-3 text-sm font-medium text-tastelanc-text-muted">Plan</th>}
                  <th className="text-left px-4 py-3 text-sm font-medium text-tastelanc-text-muted">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-tastelanc-text-muted">Since</th>
                  {canViewStripe && (
                    <th className="text-right px-4 py-3 text-sm font-medium text-tastelanc-text-muted">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-tastelanc-surface-light">
                {filteredConsumers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-tastelanc-surface-light/50">
                    <td className="px-4 py-3">
                      <Link href={`/sales/inbox?compose=true&to=${encodeURIComponent(sub.email)}&name=${encodeURIComponent(sub.name || '')}`} className="text-tastelanc-text-primary hover:text-blue-400 hover:underline flex items-center gap-1">
                        <Mail className="w-3 h-3 text-blue-400" /> {sub.email}
                      </Link>
                      {sub.phone && (
                        <a href={`tel:${sub.phone}`} className="text-xs text-green-400 hover:underline flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {sub.phone}
                        </a>
                      )}
                    </td>
                    {canViewStripe && (
                      <td className="px-4 py-3">
                        <Badge variant="default" className="bg-purple-500/20 text-purple-400">
                          ${sub.amount}/{formatInterval(sub.interval, sub.intervalCount)}
                        </Badge>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {sub.status === 'active' ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-400">Active</Badge>
                      ) : (
                        <Badge variant="default" className="bg-yellow-500/20 text-yellow-400">Trialing</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-tastelanc-text-muted text-sm">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    {canViewStripe && (
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`https://dashboard.stripe.com/subscriptions/${sub.id}`}
                          target="_blank"
                          className="text-xs text-blue-400 hover:underline"
                        >
                          View in Stripe
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
      )}

      {/* Self-Promoter Subscriptions */}
      {showSelfPromoters && filteredSelfPromoters.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-tastelanc-text-primary mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Self-Promoter Subscribers
          </h2>
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-tastelanc-surface-light">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-tastelanc-text-muted">Name / Contact</th>
                  {canViewStripe && <th className="text-left px-4 py-3 text-sm font-medium text-tastelanc-text-muted">Plan</th>}
                  <th className="text-left px-4 py-3 text-sm font-medium text-tastelanc-text-muted">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-tastelanc-text-muted">Since</th>
                  {canViewStripe && (
                    <th className="text-right px-4 py-3 text-sm font-medium text-tastelanc-text-muted">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-tastelanc-surface-light">
                {filteredSelfPromoters.map((sub) => (
                  <tr key={sub.id} className="hover:bg-tastelanc-surface-light/50">
                    <td className="px-4 py-3">
                      <p className="text-tastelanc-text-primary">{sub.name}</p>
                      <Link href={`/sales/inbox?compose=true&to=${encodeURIComponent(sub.email)}&name=${encodeURIComponent(sub.name || '')}`} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {sub.email}
                      </Link>
                      {sub.phone && (
                        <a href={`tel:${sub.phone}`} className="text-xs text-green-400 hover:underline flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {sub.phone}
                        </a>
                      )}
                    </td>
                    {canViewStripe && (
                      <td className="px-4 py-3">
                        <Badge variant="default" className="bg-orange-500/20 text-orange-400">
                          ${sub.amount}/mo
                        </Badge>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {sub.status === 'active' ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-400">Active</Badge>
                      ) : (
                        <Badge variant="default" className="bg-yellow-500/20 text-yellow-400">Trialing</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-tastelanc-text-muted text-sm">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    {canViewStripe && (
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`https://dashboard.stripe.com/subscriptions/${sub.id}`}
                          target="_blank"
                          className="text-xs text-blue-400 hover:underline"
                        >
                          View in Stripe
                        </Link>
                      </td>
                    )}
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
