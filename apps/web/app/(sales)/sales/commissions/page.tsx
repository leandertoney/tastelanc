'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  Loader2,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Star,
  HelpCircle,
} from 'lucide-react';
import { Card, Badge, Tooltip } from '@/components/ui';
import { toast } from 'sonner';
import { PLANS, formatCurrency } from '@/config/commission';

interface Commission {
  id: string;
  sales_rep_id: string;
  lead_id: string | null;
  business_name: string;
  plan_name: string;
  length_months: number;
  sale_amount: number;
  commission_amount: number;
  commission_rate: number;
  is_renewal: boolean;
  sale_date: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: string;
  created_at: string;
}

interface Summary {
  totalPending: number;
  totalPaid: number;
  totalEarned: number;
  currentTier: string;
  currentRate: number;
  signupsIn30Days: number;
  signupsUntilBonus: number;
  payPeriod: {
    start: string;
    end: string;
    payDate: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  paid: { label: 'Paid', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  void: { label: 'Void', color: 'bg-red-500/20 text-red-400', icon: XCircle },
};

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getLengthLabel(months: number): string {
  if (months === 3) return '3 month';
  if (months === 6) return '6 month';
  if (months === 12) return '1 year';
  return `${months} months`;
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<'current' | 'last' | 'all'>('current');

  const fetchCommissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales/commissions?period=${periodFilter}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCommissions(data.commissions || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Error fetching commissions:', error);
      toast.error('Failed to load commissions');
    } finally {
      setIsLoading(false);
    }
  }, [periodFilter]);

  useEffect(() => {
    setIsLoading(true);
    fetchCommissions();
  }, [fetchCommissions]);

  const tierProgress = summary
    ? Math.min(100, (summary.signupsIn30Days / 7) * 100)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-400" />
            Commissions
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-400">Track your earnings and payouts</p>
            <Tooltip content="You earn 15% on your first 6 signups per 30-day period, then 20% on all signups after that. Renewals pay 50% of your current rate. Pay period runs Sunday–Saturday, paid the following Friday." position="bottom">
              <HelpCircle className="w-4 h-4 text-gray-600 hover:text-gray-400 cursor-help" />
            </Tooltip>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(['current', 'last', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                periodFilter === p
                  ? 'bg-tastelanc-accent text-white'
                  : 'bg-tastelanc-surface-light text-gray-400 hover:text-white'
              }`}
            >
              {p === 'current' ? 'This Week' : p === 'last' ? 'Last Week' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Pending</span>
                </div>
                <div className="text-2xl font-bold text-yellow-400">{formatCurrency(summary.totalPending)}</div>
                {summary.payPeriod && (
                  <p className="text-xs text-gray-500 mt-1">
                    Pays {formatDate(summary.payPeriod.payDate)}
                  </p>
                )}
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Paid</span>
                </div>
                <div className="text-2xl font-bold text-green-400">{formatCurrency(summary.totalPaid)}</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-white" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Total Earned</span>
                </div>
                <div className="text-2xl font-bold text-white">{formatCurrency(summary.totalEarned)}</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-lancaster-gold" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Current Tier</span>
                </div>
                <div className="text-2xl font-bold text-lancaster-gold">{summary.currentTier}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {summary.signupsIn30Days} signup{summary.signupsIn30Days !== 1 ? 's' : ''} in 30 days
                </p>
              </Card>
            </div>
          )}

          {/* Tier Progress */}
          {summary && summary.signupsUntilBonus > 0 && (
            <Card className="p-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-lancaster-gold" />
                  <span className="text-sm font-medium text-white">Progress to 20% Tier</span>
                  <Tooltip content="Get 7+ signups in a rolling 30-day window to unlock 20% commission on all sales. Tiers reset every 30 days." position="right">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-600 hover:text-gray-400 cursor-help" />
                  </Tooltip>
                </div>
                <span className="text-sm text-gray-400">
                  {summary.signupsUntilBonus} more signup{summary.signupsUntilBonus !== 1 ? 's' : ''} needed
                </span>
              </div>
              <div className="w-full bg-tastelanc-surface-light rounded-full h-2.5">
                <div
                  className="bg-lancaster-gold h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-500">15% (1-6)</span>
                <span className="text-[10px] text-gray-500">20% (7+)</span>
              </div>
            </Card>
          )}

          {/* Commission Rate Reference */}
          <Card className="p-4 mb-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              Rate Card
              <Tooltip content="Your payout for each plan and length. The Renewal column shows what you earn when a restaurant re-signs (50% of your current tier rate)." position="right">
                <HelpCircle className="w-3.5 h-3.5 text-gray-600 hover:text-gray-400 cursor-help" />
              </Tooltip>
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {PLANS.map((plan) => (
                <div key={plan.name}>
                  <h4 className="text-sm font-medium text-white mb-2">{plan.name} Plan</h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left py-1 pr-2">Length</th>
                        <th className="text-right py-1 px-2">Cost</th>
                        <th className="text-right py-1 px-2">@15%</th>
                        <th className="text-right py-1 px-2">@20%</th>
                        <th className="text-right py-1 pl-2">Renewal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.pricing.map((p) => (
                        <tr key={p.lengthMonths} className="border-t border-tastelanc-surface-light">
                          <td className="py-1.5 pr-2 text-gray-300">{p.lengthLabel}</td>
                          <td className="py-1.5 px-2 text-right text-gray-400">{formatCurrency(p.cost)}</td>
                          <td className="py-1.5 px-2 text-right text-white">{formatCurrency(p.payout15)}</td>
                          <td className="py-1.5 px-2 text-right text-lancaster-gold">{formatCurrency(p.payout20)}</td>
                          <td className="py-1.5 pl-2 text-right text-gray-500">
                            {formatCurrency(summary?.currentRate === 0.20 ? p.renewal20 : p.renewal15)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </Card>

          {/* Commissions Table */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-tastelanc-surface-light">
              <h3 className="text-sm font-semibold text-white">
                {periodFilter === 'current' ? 'This Week' : periodFilter === 'last' ? 'Last Week' : 'All'} Sales
                {summary?.payPeriod && periodFilter !== 'all' && (
                  <span className="text-gray-500 font-normal ml-2">
                    {formatDate(summary.payPeriod.start)} – {formatDate(summary.payPeriod.end)}
                  </span>
                )}
              </h3>
            </div>
            {commissions.length === 0 ? (
              <div className="p-8 text-center">
                <DollarSign className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No commissions for this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-tastelanc-surface-light text-xs text-gray-500 uppercase tracking-wider">
                      <th className="text-left px-4 py-2">Business</th>
                      <th className="text-left px-4 py-2">Plan</th>
                      <th className="text-right px-4 py-2">Sale</th>
                      <th className="text-right px-4 py-2">Commission</th>
                      <th className="text-center px-4 py-2">Rate</th>
                      <th className="text-center px-4 py-2">Type</th>
                      <th className="text-center px-4 py-2">Status</th>
                      <th className="text-right px-4 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tastelanc-surface-light">
                    {commissions.map((c) => {
                      const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                      return (
                        <tr key={c.id} className="hover:bg-tastelanc-surface-light/30 transition-colors">
                          <td className="px-4 py-3 text-sm text-white font-medium">{c.business_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {c.plan_name} – {getLengthLabel(c.length_months)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400 text-right">
                            {formatCurrency(Number(c.sale_amount))}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-400 text-right font-medium">
                            {formatCurrency(Number(c.commission_amount))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs text-lancaster-gold">
                              {Math.round(Number(c.commission_rate) * 100)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {c.is_renewal ? (
                              <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Renewal
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500/20 text-green-400 text-xs">New</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`${sc.color} text-xs`}>{sc.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">
                            {formatDate(c.sale_date)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
