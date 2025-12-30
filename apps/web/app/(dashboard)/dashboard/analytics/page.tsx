'use client';

import { BarChart3, Eye, Heart, TrendingUp, Users, Calendar, ArrowUp, ArrowDown, Lock, Crown } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import Link from 'next/link';
import TierGate, { useTierAccess } from '@/components/TierGate';

// Mock analytics data
const stats = [
  {
    label: 'Profile Views',
    value: '2,847',
    change: '+12.5%',
    trend: 'up',
    icon: Eye,
  },
  {
    label: 'Favorites',
    value: '156',
    change: '+8.2%',
    trend: 'up',
    icon: Heart,
  },
  {
    label: 'Event RSVPs',
    value: '43',
    change: '-2.1%',
    trend: 'down',
    icon: Calendar,
  },
  {
    label: 'Unique Visitors',
    value: '1,293',
    change: '+15.8%',
    trend: 'up',
    icon: Users,
  },
];

const weeklyViews = [
  { day: 'Mon', views: 342 },
  { day: 'Tue', views: 289 },
  { day: 'Wed', views: 456 },
  { day: 'Thu', views: 398 },
  { day: 'Fri', views: 567 },
  { day: 'Sat', views: 623 },
  { day: 'Sun', views: 412 },
];

const topPages = [
  { page: 'Profile', views: 1234, percentage: 45 },
  { page: 'Menu', views: 892, percentage: 33 },
  { page: 'Events', views: 456, percentage: 17 },
  { page: 'Happy Hours', views: 265, percentage: 10 },
];

const maxViews = Math.max(...weeklyViews.map((d) => d.views));

export default function AnalyticsPage() {
  const hasElite = useTierAccess('elite');

  return (
    <TierGate
      requiredTier="premium"
      feature="Analytics"
      description="Upgrade to Premium to access analytics and track your restaurant's performance on TasteLanc."
    >
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Analytics
          </h2>
          <p className="text-gray-400 mt-1">Track your restaurant&apos;s performance</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Last 30 days</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className="p-2 bg-tastelanc-surface rounded-lg">
                  <Icon className="w-5 h-5 text-tastelanc-accent" />
                </div>
              </div>
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
              }`}>
                {stat.trend === 'up' ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
                {stat.change} vs last month
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Weekly Views Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Weekly Profile Views</h3>
          <div className="flex items-end justify-between h-48 gap-2">
            {weeklyViews.map((data) => (
              <div key={data.day} className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-tastelanc-accent rounded-t transition-all hover:bg-tastelanc-accent-hover"
                  style={{ height: `${(data.views / maxViews) * 100}%` }}
                  title={`${data.views} views`}
                />
                <span className="text-xs text-gray-400 mt-2">{data.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Pages */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Top Viewed Sections</h3>
          <div className="space-y-4">
            {topPages.map((page) => (
              <div key={page.page}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">{page.page}</span>
                  <span className="text-gray-400">{page.views.toLocaleString()} views</span>
                </div>
                <div className="w-full bg-tastelanc-surface rounded-full h-2">
                  <div
                    className="bg-tastelanc-accent h-2 rounded-full"
                    style={{ width: `${page.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Elite Features - Show upsell for Premium users who don't have Elite */}
      {!hasElite && (
        <Card className="p-6 border border-yellow-500/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-yellow-500" />
              <Badge variant="gold">Elite Feature</Badge>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Unlock Advanced Analytics</h3>
            <p className="text-gray-400 mb-4">
              Get detailed insights with Elite analytics including:
            </p>
            <ul className="grid sm:grid-cols-2 gap-2 mb-6 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-500" />
                Customer demographics
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-500" />
                Peak visit times
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-500" />
                Comparison with competitors
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-500" />
                Conversion tracking
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-500" />
                Custom date ranges
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-500" />
                Export reports
              </li>
            </ul>
            <Link
              href="/dashboard/subscription"
              className="inline-flex items-center justify-center bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-black font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Elite
            </Link>
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[
            { action: 'Profile viewed', time: '2 minutes ago', count: 3 },
            { action: 'Added to favorites', time: '15 minutes ago', count: 1 },
            { action: 'Menu section viewed', time: '32 minutes ago', count: 2 },
            { action: 'Happy hour details viewed', time: '1 hour ago', count: 5 },
            { action: 'Event page viewed', time: '2 hours ago', count: 2 },
          ].map((activity, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-tastelanc-surface-light last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-tastelanc-accent" />
                <span className="text-gray-300">{activity.action}</span>
                {activity.count > 1 && (
                  <Badge variant="default">x{activity.count}</Badge>
                )}
              </div>
              <span className="text-gray-500 text-sm">{activity.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
    </TierGate>
  );
}
