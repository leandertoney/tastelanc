'use client';

import { useState, useEffect } from 'react';
import { BRAND } from '@/config/market';
import { Card, Badge } from '@/components/ui';
import { Crown, DollarSign, TrendingUp, Users, Sparkles, RefreshCw, Loader2 } from 'lucide-react';

interface ConsumerSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_price_id: string | null;
  status: string;
  billing_period: 'monthly' | 'yearly' | 'lifetime';
  is_founder: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  email: string;
  full_name: string | null;
}

interface Stats {
  total: number;
  active: number;
  monthly: number;
  yearly: number;
  founders: number;
  mrr: number;
  arr: number;
  totalRevenue: number;
}

export default function AdminConsumersPage() {
  const [subscriptions, setSubscriptions] = useState<ConsumerSubscription[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    monthly: 0,
    yearly: 0,
    founders: 0,
    mrr: 0,
    arr: 0,
    totalRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/consumer-subscriptions');
      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
      setStats(data.stats || {});
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      <div className="mb-6 md:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{BRAND.premiumName} Subscribers</h1>
          <p className="text-gray-400 mt-1 text-sm md:text-base">Consumer premium subscription tracking</p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 bg-tastelanc-surface-light rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-lancaster-gold/20 rounded-lg flex items-center justify-center">
              <Crown className="w-4 h-4 md:w-5 md:h-5 text-lancaster-gold" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{stats.active}</p>
          <p className="text-gray-400 text-xs md:text-sm">Active Subscribers</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">${stats.mrr.toFixed(2)}</p>
          <p className="text-gray-400 text-xs md:text-sm">Monthly Revenue</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">${stats.arr.toFixed(0)}</p>
          <p className="text-gray-400 text-xs md:text-sm">Projected ARR</p>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">{stats.founders}</p>
          <p className="text-gray-400 text-xs md:text-sm">Founders</p>
        </Card>
      </div>

      {/* Plan Breakdown */}
      <Card className="p-4 md:p-6 mb-6 md:mb-8">
        <h2 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6">Subscriptions by Plan</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <div className="p-3 md:p-4 rounded-lg bg-tastelanc-surface-light/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Monthly</span>
              <Badge variant="default" className="text-xs">{stats.monthly}</Badge>
            </div>
            <div className="h-2 bg-tastelanc-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${stats.active > 0 ? Math.max(5, (stats.monthly / stats.active) * 100) : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">$1.99/mo each</p>
          </div>

          <div className="p-3 md:p-4 rounded-lg bg-tastelanc-surface-light/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Yearly</span>
              <Badge variant="gold" className="text-xs">{stats.yearly}</Badge>
            </div>
            <div className="h-2 bg-tastelanc-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-lancaster-gold rounded-full"
                style={{ width: `${stats.active > 0 ? Math.max(5, (stats.yearly / stats.active) * 100) : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">$19.99/yr each</p>
          </div>

          <div className="p-3 md:p-4 rounded-lg bg-tastelanc-surface-light/50 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Revenue</span>
              <Badge variant="gold" className="text-xs">${stats.totalRevenue?.toFixed(2) || '0.00'}</Badge>
            </div>
            <div className="h-2 bg-tastelanc-surface rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">Active subscriptions value</p>
          </div>
        </div>
      </Card>

      {/* Subscription List */}
      <Card className="overflow-hidden">
        <div className="p-4 md:p-6 border-b border-tastelanc-surface-light flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-white">All Consumer Subscriptions</h2>
          <span className="text-xs text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
        {isLoading ? (
          <div className="p-8 md:p-12 text-center">
            <Loader2 className="w-8 h-8 text-tastelanc-accent mx-auto mb-4 animate-spin" />
            <p className="text-gray-400">Loading subscriptions...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <Users className="w-10 h-10 md:w-12 md:h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-base md:text-lg font-medium text-white mb-2">No consumer subscriptions yet</h3>
            <p className="text-gray-400 text-sm md:text-base">
              {BRAND.premiumName} subscriptions will appear here after purchase.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-tastelanc-surface-light">
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Email</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Plan</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Founder</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Renews</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Subscribed</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b border-tastelanc-surface-light/50 hover:bg-tastelanc-surface-light/30"
                    >
                      <td className="py-4 px-6">
                        <div>
                          <span className="text-white font-medium block">
                            {sub.full_name || 'Unknown'}
                          </span>
                          <span className="text-gray-500 text-sm">
                            {sub.email || 'No email'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge
                          variant={sub.billing_period === 'yearly' ? 'gold' : 'default'}
                          className="capitalize"
                        >
                          {sub.billing_period === 'yearly' ? '$19.99/yr' : '$1.99/mo'}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            sub.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : sub.status === 'past_due'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : sub.status === 'canceled'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {sub.is_founder ? (
                          <span className="inline-flex items-center gap-1 text-purple-400">
                            <Sparkles className="w-3 h-3" />
                            Yes
                          </span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-400">
                        {sub.current_period_end && sub.billing_period !== 'lifetime'
                          ? new Date(sub.current_period_end).toLocaleDateString()
                          : sub.billing_period === 'lifetime'
                          ? 'Never'
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
                    <div className="min-w-0">
                      <span className="text-white font-medium text-sm block truncate">
                        {sub.full_name || sub.email || 'Unknown'}
                      </span>
                      {sub.full_name && (
                        <span className="text-gray-500 text-xs truncate block">
                          {sub.email}
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                        sub.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : sub.status === 'past_due'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : sub.status === 'canceled'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={sub.billing_period === 'yearly' ? 'gold' : 'default'}
                        className="text-xs"
                      >
                        {sub.billing_period === 'yearly' ? '$19.99/yr' : '$1.99/mo'}
                      </Badge>
                      {sub.is_founder && (
                        <span className="inline-flex items-center gap-1 text-purple-400">
                          <Sparkles className="w-3 h-3" />
                        </span>
                      )}
                    </div>
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
