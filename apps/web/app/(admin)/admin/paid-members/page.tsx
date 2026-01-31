import { createClient } from '@/lib/supabase/server';
import { getStripe, ALL_CONSUMER_PRICE_IDS, SELF_PROMOTER_PRICE_IDS } from '@/lib/stripe';
import { Card, Badge } from '@/components/ui';
import { Store, CheckCircle, CreditCard, Calendar, ExternalLink, Users, Clock } from 'lucide-react';
import Link from 'next/link';

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
  if (isConsumerPrice(priceId)) return 'TasteLanc+';
  if (isSelfPromoterPrice(priceId)) return 'Self-Promoter';
  // Restaurant tiers based on price
  if (amount >= 1000) return 'Elite';
  return 'Premium';
}

async function getStripeSubscriptions() {
  try {
    const stripe = getStripe();

    // Fetch both active AND trialing subscriptions
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

    const restaurants: StripeSubscription[] = [];
    const consumers: StripeSubscription[] = [];
    const selfPromoters: StripeSubscription[] = [];

    for (const sub of allSubscriptions) {
      const customer = sub.customer;
      if (typeof customer !== 'object' || customer.deleted) continue;

      const email = customer.email || 'unknown';
      const name = customer.name || customer.metadata?.business_name || sub.metadata?.restaurant_name || email;
      const priceId = sub.items.data[0]?.price?.id || '';
      const amount = (sub.items.data[0]?.price?.unit_amount || 0) / 100;
      const interval = sub.items.data[0]?.price?.recurring?.interval || 'month';
      const intervalCount = sub.items.data[0]?.price?.recurring?.interval_count || 1;

      // Calculate MRR based on interval
      let mrr = amount;
      if (interval === 'year') {
        mrr = amount / 12;
      } else if (interval === 'month' && intervalCount > 1) {
        mrr = amount / intervalCount;
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
        plan: getPlanFromPrice(priceId, amount),
      };

      // Classify by price ID (more reliable than customer metadata)
      if (isConsumerPrice(priceId)) {
        consumers.push(subData);
      } else if (isSelfPromoterPrice(priceId)) {
        selfPromoters.push(subData);
      } else {
        restaurants.push(subData);
      }
    }

    return { restaurants, consumers, selfPromoters };
  } catch (error) {
    console.error('Error fetching Stripe subscriptions:', error);
    return { restaurants: [], consumers: [], selfPromoters: [] };
  }
}

// Format interval display
function formatInterval(interval: string, intervalCount: number): string {
  if (interval === 'year') return 'year';
  if (intervalCount === 1) return 'month';
  return `${intervalCount}mo`;
}

export default async function AdminPaidMembersPage() {
  const { restaurants, consumers, selfPromoters } = await getStripeSubscriptions();

  const restaurantMRR = restaurants.reduce((sum, r) => sum + r.mrr, 0);
  const consumerMRR = consumers.reduce((sum, c) => sum + c.mrr, 0);
  const selfPromoterMRR = selfPromoters.reduce((sum, s) => sum + s.mrr, 0);
  const totalMRR = restaurantMRR + consumerMRR + selfPromoterMRR;
  const totalCount = restaurants.length + consumers.length + selfPromoters.length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Paid Members</h1>
        <p className="text-gray-400 mt-1">
          {totalCount} subscriptions from Stripe (active + trialing)
        </p>
      </div>

      {/* Revenue Stats */}
      <div className="grid md:grid-cols-5 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-green-400" />
            <span className="text-gray-400">Total MRR</span>
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
            <span className="text-gray-400">TasteLanc+</span>
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

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-gray-400">Total</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalCount}</p>
        </Card>
      </div>

      {/* Restaurant Subscriptions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-blue-500" />
          Restaurant Subscriptions
        </h2>
        {restaurants.length === 0 ? (
          <Card className="p-8 text-center">
            <Store className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No restaurant subscriptions yet</p>
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

      {/* Consumer Subscriptions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          TasteLanc+ Subscribers
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
