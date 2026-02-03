'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  Heart,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { createClient } from '@/lib/supabase/client';

interface DashboardStats {
  profileViews: number;
  viewsChange: string;
  favorites: number;
  favoritesChange: string;
  upcomingEvents: number;
  weeklyViews: number;
  weeklyChange: string;
  happyHourViews: number;
  happyHourChange: string;
  menuViews: number;
  menuChange: string;
}

interface ProfileCompletion {
  percentage: number;
  items: { label: string; completed: boolean }[];
}

export default function DashboardPage() {
  const { restaurant, restaurantId, isLoading: contextLoading } = useRestaurant();
  const searchParams = useSearchParams();
  const adminMode = searchParams.get('admin_mode') === 'true';
  const adminRestaurantId = searchParams.get('restaurant_id');
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Build nav href with admin params if in admin mode
  const buildNavHref = (href: string) => {
    if (adminMode && adminRestaurantId) {
      return `${href}?admin_mode=true&restaurant_id=${adminRestaurantId}`;
    }
    return href;
  };
  const [profileCompletion, setProfileCompletion] = useState<ProfileCompletion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId || !restaurant) return;

    const fetchStats = async () => {
      setIsLoading(true);
      const supabase = createClient();

      try {
        // Get profile views (all time) - use analytics_page_views which has actual data
        const { count: totalViews } = await supabase
          .from('analytics_page_views')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId);

        // Get profile views (this week)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: weeklyViews } = await supabase
          .from('analytics_page_views')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .gte('viewed_at', weekAgo.toISOString());

        // Get profile views (last week for comparison)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const { count: lastWeekViews } = await supabase
          .from('analytics_page_views')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .gte('viewed_at', twoWeeksAgo.toISOString())
          .lt('viewed_at', weekAgo.toISOString());

        // Get favorites count (this week)
        const { count: favoritesCount } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId);

        // Get favorites from this week
        const { count: thisWeekFavorites } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .gte('created_at', weekAgo.toISOString());

        // Get favorites from last week (for comparison)
        const { count: lastWeekFavorites } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .gte('created_at', twoWeeksAgo.toISOString())
          .lt('created_at', weekAgo.toISOString());

        // Get happy hour views (this week)
        const { count: happyHourViews } = await supabase
          .from('analytics_page_views')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('page_type', 'happy_hour')
          .gte('viewed_at', weekAgo.toISOString());

        // Get happy hour views (last week for comparison)
        const { count: lastWeekHappyHourViews } = await supabase
          .from('analytics_page_views')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('page_type', 'happy_hour')
          .gte('viewed_at', twoWeeksAgo.toISOString())
          .lt('viewed_at', weekAgo.toISOString());

        // Get menu views (this week)
        const { count: menuViews } = await supabase
          .from('analytics_page_views')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('page_type', 'menu')
          .gte('viewed_at', weekAgo.toISOString());

        // Get menu views (last week for comparison)
        const { count: lastWeekMenuViews } = await supabase
          .from('analytics_page_views')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('page_type', 'menu')
          .gte('viewed_at', twoWeeksAgo.toISOString())
          .lt('viewed_at', weekAgo.toISOString());

        // Calculate percentage changes
        const viewsChange = lastWeekViews && lastWeekViews > 0
          ? Math.round(((weeklyViews || 0) - lastWeekViews) / lastWeekViews * 100)
          : (weeklyViews || 0) > 0 ? 100 : 0;

        const favoritesChange = lastWeekFavorites && lastWeekFavorites > 0
          ? Math.round(((thisWeekFavorites || 0) - lastWeekFavorites) / lastWeekFavorites * 100)
          : (thisWeekFavorites || 0) > 0 ? 100 : 0;

        const happyHourChange = lastWeekHappyHourViews && lastWeekHappyHourViews > 0
          ? Math.round(((happyHourViews || 0) - lastWeekHappyHourViews) / lastWeekHappyHourViews * 100)
          : (happyHourViews || 0) > 0 ? 100 : 0;

        const menuChange = lastWeekMenuViews && lastWeekMenuViews > 0
          ? Math.round(((menuViews || 0) - lastWeekMenuViews) / lastWeekMenuViews * 100)
          : (menuViews || 0) > 0 ? 100 : 0;

        setStats({
          profileViews: totalViews || 0,
          viewsChange: viewsChange >= 0 ? `+${viewsChange}%` : `${viewsChange}%`,
          favorites: favoritesCount || 0,
          favoritesChange: favoritesChange >= 0 ? `+${favoritesChange}%` : `${favoritesChange}%`,
          upcomingEvents: 0,
          weeklyViews: weeklyViews || 0,
          weeklyChange: viewsChange >= 0 ? `+${viewsChange}%` : `${viewsChange}%`,
          happyHourViews: happyHourViews || 0,
          happyHourChange: happyHourChange >= 0 ? `+${happyHourChange}%` : `${happyHourChange}%`,
          menuViews: menuViews || 0,
          menuChange: menuChange >= 0 ? `+${menuChange}%` : `${menuChange}%`,
        });

        // Calculate profile completion
        const completionItems = [
          { label: 'Basic info added', completed: !!(restaurant.name && restaurant.address) },
          { label: 'Description written', completed: !!restaurant.description },
          { label: 'Phone number added', completed: !!restaurant.phone },
          { label: 'Website linked', completed: !!restaurant.website },
          { label: 'Categories selected', completed: restaurant.categories && restaurant.categories.length > 0 },
        ];

        // Check if hours are set
        const { count: hoursCount } = await supabase
          .from('restaurant_hours')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId);

        completionItems.push({ label: 'Hours set up', completed: (hoursCount || 0) > 0 });

        // Check if photos uploaded
        const hasPhotos = !!(restaurant.cover_image_url || restaurant.logo_url);
        completionItems.push({ label: 'Photos uploaded', completed: hasPhotos });

        const completedCount = completionItems.filter(item => item.completed).length;
        const percentage = Math.round((completedCount / completionItems.length) * 100);

        setProfileCompletion({ percentage, items: completionItems });

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }

      setIsLoading(false);
    };

    fetchStats();
  }, [restaurantId, restaurant]);

  const quickActions = [
    { label: 'Add Happy Hour', href: buildNavHref('/dashboard/happy-hours'), icon: Clock },
    { label: 'Create Event', href: buildNavHref('/dashboard/events'), icon: Calendar },
    { label: 'Add Special', href: buildNavHref('/dashboard/specials'), icon: Sparkles },
  ];

  if (contextLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-tastelanc-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statsDisplay = [
    { label: 'Profile Views', value: stats?.profileViews.toLocaleString() || '0', change: stats?.viewsChange || '0%', icon: Eye },
    { label: 'Favorites', value: stats?.favorites.toLocaleString() || '0', change: stats?.favoritesChange || '0%', icon: Heart },
    { label: 'Happy Hour Views', value: stats?.happyHourViews.toLocaleString() || '0', change: stats?.happyHourChange || '0%', icon: Clock },
    { label: 'Menu Views', value: stats?.menuViews.toLocaleString() || '0', change: stats?.menuChange || '0%', icon: Sparkles },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-tastelanc-accent to-tastelanc-accent-hover p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome back!</h2>
        <p className="text-white/80">
          Here&apos;s what&apos;s happening with {restaurant?.name || 'your restaurant'} today.
        </p>
      </Card>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsDisplay.map((stat) => {
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
              {stat.change && (
                <p className={`text-sm mt-2 ${stat.change.startsWith('+') && stat.change !== '+0%' ? 'text-green-400' : 'text-gray-500'}`}>
                  {stat.change} from last week
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 p-4 bg-tastelanc-card rounded-lg hover:bg-tastelanc-surface-light transition-colors group"
              >
                <div className="p-2 bg-tastelanc-surface rounded-lg">
                  <Icon className="w-5 h-5 text-tastelanc-accent" />
                </div>
                <span className="text-white">{action.label}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-white transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Profile Completion */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Profile Completion</h3>
            <Badge variant="accent">{profileCompletion?.percentage || 0}%</Badge>
          </div>
          <div className="w-full bg-tastelanc-surface rounded-full h-2 mb-4">
            <div
              className="bg-tastelanc-accent h-2 rounded-full transition-all"
              style={{ width: `${profileCompletion?.percentage || 0}%` }}
            />
          </div>
          <ul className="space-y-2">
            {profileCompletion?.items.map((item, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${item.completed ? 'bg-green-500' : 'bg-gray-600'}`}>
                  <span className={`text-xs ${item.completed ? 'text-white' : 'text-gray-400'}`}>
                    {item.completed ? '✓' : '○'}
                  </span>
                </span>
                <span className={item.completed ? 'text-gray-300' : 'text-gray-500'}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={buildNavHref('/dashboard/profile')}
            className="inline-flex items-center gap-1 text-tastelanc-accent hover:underline mt-4 text-sm"
          >
            Complete your profile <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>

        {/* Alerts & Tips */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Tips & Alerts</h3>
          <div className="space-y-4">
            {stats?.upcomingEvents === 0 && (
              <div className="flex gap-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-200 text-sm font-medium">Add some events!</p>
                  <p className="text-yellow-200/70 text-xs mt-1">
                    Restaurants with events get more engagement from visitors.
                  </p>
                </div>
              </div>
            )}
            <div className="flex gap-3 p-3 bg-tastelanc-surface rounded-lg">
              <Sparkles className="w-5 h-5 text-tastelanc-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-200 text-sm font-medium">Pro tip: Add happy hour specials</p>
                <p className="text-gray-400 text-xs mt-1">
                  Restaurants with happy hours get 3x more engagement.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-tastelanc-surface rounded-lg">
              <Calendar className="w-5 h-5 text-tastelanc-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-200 text-sm font-medium">Schedule recurring events</p>
                <p className="text-gray-400 text-xs mt-1">
                  Weekly trivia nights and live music attract regulars.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Subscription CTA */}
      {!restaurant?.stripe_subscription_id && (
        <Card className="p-6 border border-lancaster-gold/30">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Badge variant="gold" className="mb-2">Upgrade Available</Badge>
              <h3 className="text-lg font-semibold text-white">Unlock Premium Features</h3>
              <p className="text-gray-400 text-sm mt-1">
                Get analytics, priority placement, and more with a premium subscription.
              </p>
            </div>
            <Link
              href={buildNavHref('/dashboard/subscription')}
              className="inline-flex items-center justify-center bg-lancaster-gold hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              View Plans
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
