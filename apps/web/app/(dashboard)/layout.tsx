'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  UtensilsCrossed,
  Sparkles,
  Calendar,
  CreditCard,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Check,
  User,
  Users,
  ArrowLeft,
  Shield,
  Lightbulb,
  Music,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/supabase/auth';
import { RestaurantProvider, useRestaurant } from '@/contexts/RestaurantContext';
import { OnboardingProvider, OnboardingWizard } from '@/components/dashboard/onboarding';
import { Tooltip } from '@/components/ui';
const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, hint: 'Your restaurant performance summary and quick stats' },
  { href: '/dashboard/profile', label: 'Profile', icon: Store, hint: 'Update your name, description, photos, hours, and contact info' },
  { href: '/dashboard/happy-hours', label: 'Happy Hours', icon: Sparkles, hint: 'Manage your happy hour deals — these show prominently in the app' },
  { href: '/dashboard/entertainment', label: 'Entertainment', icon: Music, hint: 'Add live music, trivia nights, and other entertainment listings' },
  { href: '/dashboard/events', label: 'Events', icon: Calendar, hint: 'Create and promote special events at your restaurant' },
  { href: '/dashboard/specials', label: 'Specials', icon: Sparkles, hint: 'Post daily specials, limited-time offers, and promotions' },
  { href: '/dashboard/menu', label: 'Menu', icon: UtensilsCrossed, hint: 'Build and maintain your digital menu with sections and items' },
  { href: '/dashboard/insights', label: 'Market Insights', icon: Lightbulb, hint: 'See how your restaurant compares in your local market' },
  { href: '/dashboard/team', label: 'Team', icon: Users, hint: 'Invite and manage team members who can edit your content' },
  { href: '/dashboard/subscription', label: 'Subscription', icon: CreditCard, hint: 'View your plan details, billing, and upgrade options' },
];

// Nav items hidden from sales reps (non-content management)
const SALES_HIDDEN_HREFS = new Set([
  '/dashboard',
  '/dashboard/insights',
  '/dashboard/team',
  '/dashboard/subscription',
]);

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [restaurantMenuOpen, setRestaurantMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string } } | null>(null);

  const { restaurant, restaurants, isAdmin, isSalesRep, isLoading, error, switchRestaurant } = useRestaurant();
  const restaurantDropdownRef = useRef<HTMLDivElement>(null);

  // Check for admin mode and sales mode from URL params
  const adminMode = searchParams.get('admin_mode') === 'true';
  const salesMode = searchParams.get('sales_mode') === 'true';
  const adminRestaurantId = searchParams.get('restaurant_id');

  const hasBanner = adminMode || salesMode;
  const showRestaurantSwitcher = !adminMode && !salesMode && restaurants.length > 1;

  // Filter nav items for sales reps
  const filteredNavItems = useMemo(() => {
    if (salesMode) {
      return navItems.filter((item) => !SALES_HIDDEN_HREFS.has(item.href));
    }
    return navItems;
  }, [salesMode]);

  // Close restaurant dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (restaurantDropdownRef.current && !restaurantDropdownRef.current.contains(event.target as Node)) {
        setRestaurantMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/';
    }
  };

  const handleBackToAdmin = () => {
    router.push('/admin/restaurants');
  };

  const handleBackToSales = () => {
    router.push('/sales/restaurants');
  };

  // Build nav href with admin/sales params
  const buildNavHref = (href: string) => {
    if (adminMode && adminRestaurantId) {
      return `${href}?admin_mode=true&restaurant_id=${adminRestaurantId}`;
    }
    if (salesMode && adminRestaurantId) {
      return `${href}?sales_mode=true&restaurant_id=${adminRestaurantId}`;
    }
    return href;
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const restaurantName = restaurant?.name || 'Your Restaurant';

  // Determine subtitle text
  const subtitleText = adminMode ? 'Admin Editing Mode' : salesMode ? 'Sales Content Mode' : 'Owner Dashboard';

  return (
    <div className="min-h-screen bg-tastelanc-bg">
      {/* Admin Mode Banner */}
      {adminMode && isAdmin && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-600 text-white px-4 py-2">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">
                Admin Mode: Editing {restaurantName}
              </span>
            </div>
            <button
              onClick={handleBackToAdmin}
              className="flex items-center gap-1 text-sm hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin
            </button>
          </div>
        </div>
      )}

      {/* Sales Mode Banner */}
      {salesMode && isSalesRep && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-blue-600 text-white px-4 py-2">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">
                Sales Mode: Managing {restaurantName}
              </span>
            </div>
            <button
              onClick={handleBackToSales}
              className="flex items-center gap-1 text-sm hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sales
            </button>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed ${hasBanner ? 'top-10' : 'top-0'} left-0 z-50 h-full w-64 bg-tastelanc-surface border-r border-tastelanc-surface-light transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ height: hasBanner ? 'calc(100% - 2.5rem)' : '100%' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-tastelanc-surface-light">
            <Link href="/" className="text-xl font-bold text-tastelanc-accent">
              TasteLanc
            </Link>
            <p className="text-xs text-gray-500 mt-1">
              {subtitleText}
            </p>
          </div>

          {/* Restaurant Selector */}
          <div className="p-4 border-b border-tastelanc-surface-light" ref={restaurantDropdownRef}>
            <button
              onClick={() => {
                if (showRestaurantSwitcher) {
                  setRestaurantMenuOpen(!restaurantMenuOpen);
                }
              }}
              className={`w-full flex items-center justify-between p-3 bg-tastelanc-bg rounded-lg transition-colors ${
                showRestaurantSwitcher ? 'hover:bg-tastelanc-surface-light cursor-pointer' : 'cursor-default'
              }`}
              disabled={isLoading}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-tastelanc-accent rounded-full flex items-center justify-center">
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-white font-bold text-sm">
                      {restaurantName.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="text-white text-sm font-medium truncate max-w-[120px]">
                  {isLoading ? 'Loading...' : restaurantName}
                </span>
              </div>
              {showRestaurantSwitcher && (
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    restaurantMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>

            {/* Restaurant Dropdown */}
            {restaurantMenuOpen && showRestaurantSwitcher && (
              <div className="mt-2 bg-tastelanc-surface-light rounded-lg border border-gray-700 overflow-hidden">
                {restaurants.map((r) => {
                  const isSelected = r.id === restaurant?.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        switchRestaurant(r.id);
                        setRestaurantMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-tastelanc-accent/10 text-white'
                          : 'text-gray-300 hover:bg-tastelanc-bg hover:text-white'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-tastelanc-accent' : 'bg-gray-600'
                      }`}>
                        <span className="text-white font-bold text-xs">
                          {r.name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm truncate flex-1">{r.name}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-tastelanc-accent flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {error && !restaurant && (
              <p className="text-xs text-red-400 mt-2 px-3">{error}</p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <div className="group/nav relative flex items-center">
                      <Link
                        href={buildNavHref(item.href)}
                        data-onboarding={item.href.split('/').pop() || 'overview'}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors flex-1 ${
                          isActive
                            ? 'bg-tastelanc-accent text-white'
                            : 'text-gray-400 hover:text-white hover:bg-tastelanc-surface-light'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                      {item.hint && (
                        <Tooltip content={item.hint} position="right">
                          <span className="absolute right-2 opacity-0 group-hover/nav:opacity-100 transition-opacity cursor-help">
                            <HelpCircle className="w-3.5 h-3.5 text-gray-600 hover:text-gray-400" />
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-tastelanc-surface-light">
            <div className="flex items-center gap-3 mb-4 px-3">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            {restaurant?.slug && (
              <Link
                href={`/restaurants/${restaurant.slug}`}
                className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white transition-colors"
              >
                <Store className="w-5 h-5" />
                <span>View Public Page</span>
              </Link>
            )}
            {adminMode ? (
              <button
                onClick={handleBackToAdmin}
                className="w-full flex items-center gap-3 px-3 py-2 text-amber-400 hover:text-amber-300 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Admin</span>
              </button>
            ) : salesMode ? (
              <button
                onClick={handleBackToSales}
                className="w-full flex items-center gap-3 px-3 py-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Sales</span>
              </button>
            ) : (
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`lg:pl-64 ${hasBanner ? 'pt-10' : ''}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-tastelanc-bg border-b border-tastelanc-surface-light" style={{ top: hasBanner ? '2.5rem' : 0 }}>
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 lg:ml-0 ml-4">
              <h1 className="text-lg font-semibold text-white">
                {filteredNavItems.find((item) => item.href === pathname)?.label || 'Dashboard'}
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-400 hover:text-white"
            >
              {sidebarOpen && <X className="w-6 h-6" />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-tastelanc-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-tastelanc-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RestaurantProvider>
        <OnboardingProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
          <OnboardingWizard />
        </OnboardingProvider>
      </RestaurantProvider>
    </Suspense>
  );
}
