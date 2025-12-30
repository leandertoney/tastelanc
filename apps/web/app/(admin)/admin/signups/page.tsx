import { createClient } from '@/lib/supabase/server';
import { Card, Badge } from '@/components/ui';
import { Users, CreditCard, Calendar, TrendingUp } from 'lucide-react';

async function getSignups() {
  const supabase = await createClient();

  // Get all subscriptions with tier and restaurant info
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      tiers(name, display_name),
      restaurants(name, slug)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return { subscriptions: [], stats: { total: 0, active: 0, byTier: {} } };
  }

  // Calculate stats
  const stats = {
    total: subscriptions?.length || 0,
    active: subscriptions?.filter((s) => s.status === 'active').length || 0,
    byTier: {} as Record<string, number>,
  };

  subscriptions?.forEach((sub) => {
    const tierName = sub.tiers?.name || 'unknown';
    stats.byTier[tierName] = (stats.byTier[tierName] || 0) + 1;
  });

  return { subscriptions: subscriptions || [], stats };
}

export default async function AdminSignupsPage() {
  const { subscriptions, stats } = await getSignups();

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Signup Tracking</h1>
        <p className="text-gray-400 mt-1 text-sm md:text-base">Track restaurant signups by plan</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{stats.total}</p>
          <p className="text-gray-400 text-xs md:text-sm">Total Signups</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{stats.active}</p>
          <p className="text-gray-400 text-xs md:text-sm">Active Subs</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-lancaster-gold/20 rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-lancaster-gold" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">
            {(stats.byTier['premium'] || 0) + (stats.byTier['elite'] || 0)}
          </p>
          <p className="text-gray-400 text-xs md:text-sm">Premium + Elite</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{stats.byTier['starter'] || 0}</p>
          <p className="text-gray-400 text-xs md:text-sm">Starter Plans</p>
        </Card>
      </div>

      {/* Signups by Tier */}
      <Card className="p-4 md:p-6 mb-6 md:mb-8">
        <h2 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6">Signups by Plan</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {['basic', 'starter', 'premium', 'elite'].map((tier) => {
            const count = stats.byTier[tier] || 0;
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
            const colors: Record<string, string> = {
              basic: 'bg-gray-500',
              starter: 'bg-blue-500',
              premium: 'bg-lancaster-gold',
              elite: 'bg-purple-500',
            };

            return (
              <div key={tier} className="p-3 md:p-4 rounded-lg bg-tastelanc-surface-light/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 capitalize text-sm">{tier}</span>
                  <Badge variant={tier === 'premium' ? 'gold' : 'default'} className="text-xs">{count}</Badge>
                </div>
                <div className="h-2 bg-tastelanc-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors[tier]} rounded-full`}
                    style={{ width: `${Math.max(5, percentage)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}%</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Subscription List */}
      <Card className="overflow-hidden">
        <div className="p-4 md:p-6 border-b border-tastelanc-surface-light">
          <h2 className="text-lg md:text-xl font-semibold text-white">All Subscriptions</h2>
        </div>
        {subscriptions.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <Users className="w-10 h-10 md:w-12 md:h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-base md:text-lg font-medium text-white mb-2">No subscriptions yet</h3>
            <p className="text-gray-400 text-sm md:text-base">
              Restaurant subscriptions will appear here after signup.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-tastelanc-surface-light">
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Restaurant</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Plan</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Period End</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b border-tastelanc-surface-light/50 hover:bg-tastelanc-surface-light/30"
                    >
                      <td className="py-4 px-6">
                        <span className="text-white font-medium">
                          {sub.restaurants?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <Badge
                          variant={sub.tiers?.name === 'premium' ? 'gold' : 'default'}
                          className="capitalize"
                        >
                          {sub.tiers?.display_name || sub.tiers?.name || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            sub.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : sub.status === 'trialing'
                              ? 'bg-blue-500/20 text-blue-400'
                              : sub.status === 'past_due'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-400">
                        {sub.current_period_end
                          ? new Date(sub.current_period_end).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="py-4 px-6 text-gray-400">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4 space-y-3">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="bg-tastelanc-surface-light/50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-white font-medium text-sm">
                      {sub.restaurants?.name || 'Unknown'}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        sub.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : sub.status === 'trialing'
                          ? 'bg-blue-500/20 text-blue-400'
                          : sub.status === 'past_due'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <Badge
                      variant={sub.tiers?.name === 'premium' ? 'gold' : 'default'}
                      className="capitalize text-xs"
                    >
                      {sub.tiers?.display_name || sub.tiers?.name || 'Unknown'}
                    </Badge>
                    <span className="text-gray-400">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
