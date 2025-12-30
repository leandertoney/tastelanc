'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  TrendingUp,
  Mail,
  Calendar,
  Clock,
  ArrowUp,
  RefreshCw,
} from 'lucide-react';

interface SignupData {
  id: string;
  email: string;
  source: string;
  created_at: string;
  converted_at: string | null;
}

interface AnalyticsData {
  signups: SignupData[];
  totalSignups: number;
  totalPageViews: number;
  uniqueVisitors: number;
  conversionRate: string | number;
  signupsByDay: Record<string, number>;
  viewsByDay: Record<string, number>;
  todaySignups: number;
  todayViews: number;
}

export default function EarlyAccessAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/early-access-analytics');
      const analyticsData = await res.json();
      setData(analyticsData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-tastelanc-accent/30 border-t-tastelanc-accent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Signups',
      value: data?.totalSignups || 0,
      icon: Users,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      label: 'Page Views',
      value: data?.totalPageViews || 0,
      icon: Eye,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      label: 'Unique Visitors',
      value: data?.uniqueVisitors || 0,
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      label: 'Conversion',
      value: `${data?.conversionRate || 0}%`,
      icon: TrendingUp,
      color: 'text-lancaster-gold',
      bgColor: 'bg-lancaster-gold/10',
    },
  ];

  const todayStats = [
    {
      label: 'Today\'s Signups',
      value: data?.todaySignups || 0,
      icon: ArrowUp,
      color: 'text-green-400',
    },
    {
      label: 'Today\'s Views',
      value: data?.todayViews || 0,
      icon: Eye,
      color: 'text-blue-400',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Early Access Analytics</h1>
          <p className="text-gray-400 text-xs md:text-sm mt-1">
            Track signups and page views for the early access campaign
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-tastelanc-surface hover:bg-tastelanc-surface-light rounded-lg text-gray-300 transition-colors text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500 mb-4 md:mb-6">
        <Clock className="w-4 h-4" />
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-tastelanc-surface rounded-lg p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className={`w-8 h-8 md:w-10 md:h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 md:w-5 md:h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-xl md:text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-xs md:text-sm text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
        {todayStats.map((stat) => (
          <div key={stat.label} className="bg-tastelanc-surface rounded-lg p-3 md:p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <stat.icon className={`w-4 h-4 md:w-5 md:h-5 ${stat.color}`} />
              <span className="text-gray-400 text-xs md:text-base">{stat.label}</span>
            </div>
            <span className="text-lg md:text-2xl font-bold text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Daily Breakdown */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Signups by Day */}
        <div className="bg-tastelanc-surface rounded-lg p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
            Signups (7 Days)
          </h3>
          <div className="space-y-2">
            {data?.signupsByDay && Object.keys(data.signupsByDay).length > 0 ? (
              Object.entries(data.signupsByDay).map(([day, count]) => (
                <div key={day} className="flex items-center justify-between py-2 border-b border-tastelanc-surface-light last:border-0">
                  <span className="text-gray-400 text-sm">{day}</span>
                  <span className="text-white font-semibold">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No signups yet</p>
            )}
          </div>
        </div>

        {/* Views by Day */}
        <div className="bg-tastelanc-surface rounded-lg p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
            Views (7 Days)
          </h3>
          <div className="space-y-2">
            {data?.viewsByDay && Object.keys(data.viewsByDay).length > 0 ? (
              Object.entries(data.viewsByDay).map(([day, count]) => (
                <div key={day} className="flex items-center justify-between py-2 border-b border-tastelanc-surface-light last:border-0">
                  <span className="text-gray-400 text-sm">{day}</span>
                  <span className="text-white font-semibold">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No page views yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Signups */}
      <div className="bg-tastelanc-surface rounded-lg p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4 md:w-5 md:h-5 text-lancaster-gold" />
          Recent Signups
        </h3>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-tastelanc-surface-light">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Source</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Signed Up</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.signups && data.signups.length > 0 ? (
                data.signups.map((signup) => (
                  <tr key={signup.id} className="border-b border-tastelanc-surface-light last:border-0">
                    <td className="py-3 px-4 text-white">{signup.email}</td>
                    <td className="py-3 px-4 text-gray-400">{signup.source || 'premium_page'}</td>
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(signup.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: 'America/New_York',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      {signup.converted_at ? (
                        <span className="inline-flex items-center gap-1 text-green-400 text-sm">
                          <ArrowUp className="w-3 h-3" />
                          Converted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-500 text-sm">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    No signups yet. Share your early access page!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {data?.signups && data.signups.length > 0 ? (
            data.signups.map((signup) => (
              <div key={signup.id} className="bg-tastelanc-surface-light/50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-white text-sm font-medium truncate flex-1">{signup.email}</p>
                  {signup.converted_at ? (
                    <span className="inline-flex items-center gap-1 text-green-400 text-xs whitespace-nowrap">
                      <ArrowUp className="w-3 h-3" />
                      Converted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-500 text-xs whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{signup.source || 'premium_page'}</span>
                  <span>
                    {new Date(signup.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'America/New_York',
                    })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-gray-500 text-sm">
              No signups yet. Share your early access page!
            </p>
          )}
        </div>
      </div>

      {/* Campaign End Date */}
      <div className="mt-6 md:mt-8 bg-tastelanc-accent/10 border border-tastelanc-accent/30 rounded-lg p-3 md:p-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-tastelanc-accent flex-shrink-0" />
          <div>
            <p className="text-white font-medium text-sm md:text-base">Early Access Ends</p>
            <p className="text-gray-400 text-xs md:text-sm">Dec 12th, 2025 at 11:59 PM EST</p>
          </div>
        </div>
      </div>
    </div>
  );
}
