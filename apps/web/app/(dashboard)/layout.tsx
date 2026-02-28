'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/supabase/auth';
import { RestaurantProvider, useRestaurant } from '@/contexts/RestaurantContext';
import { OnboardingProvider, OnboardingWizard } from '@/components/dashboard/onboarding';
const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/profile', label: 'Profile', icon: Store },
  { href: '/dashboard/happy-hours', label: 'Happy Hours', icon: Sparkles },
  { href: '/dashboard/entertainment', label: 'Entertainment', icon: Music },
  { href: '/dashboard/events', label: 'Events', icon: Calendar },
  { href: '/dashboard/specials', label: 'Specials', icon: Sparkles },
  { href: '/dashboard/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/dashboard/insights', label: 'Market Insights', icon: Lightbulb },
  { href: '/dashboard/team', label: 'Team', icon: Users },
  { href: '/dashboard/subscription', label: 'Subscription', icon: CreditCard },
];

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [restaurantMenuOpen, setRestaurantMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string } } | null>(null);

  const { restaurant, restaurants, isAdmin, isLoading, error, switchRestaurant } = useRestaurant();
  const restaurantDropdownRef = useRef<HTMLDivElement>(null);

  // Check for admin mode from URL params
  const adminMode = searchParams.get('admin_mode') === 'true';
  const adminRestaurantId = searchParams.get('restaurant_id');

  const showRestaurantSwitcher = !adminMode && restaurants.length > 1;

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

  // Build nav href with admin params if in admin mode
  const buildNavHref = (href: string) => {
    if (adminMode && adminRestaurantId) {
      return `${href}?admin_mode=true&restaurant_id=${adminRestaurantId}`;
    }
    return href;
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const restaurantName = restaurant?.name || 'Your Restaurant';

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

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed ${adminMode ? 'top-10' : 'top-0'} left-0 z-50 h-full w-64 bg-tastelanc-surface border-r border-tastelanc-surface-light transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ height: adminMode ? 'calc(100% - 2.5rem)' : '100%' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-tastelanc-surface-light">
            <Link href="/" className="text-xl font-bold text-tastelanc-accent">
              TasteLanc
            </Link>
            <p className="text-xs text-gray-500 mt-1">
              {adminMode ? 'Admin Editing Mode' : 'Owner Dashboard'}
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
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={buildNavHref(item.href)}
                      data-onboarding={item.href.split('/').pop() || 'overview'}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-tastelanc-accent text-white'
                          : 'text-gray-400 hover:text-white hover:bg-tastelanc-surface-light'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
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
      <div className={`lg:pl-64 ${adminMode ? 'pt-10' : ''}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-tastelanc-bg border-b border-tastelanc-surface-light" style={{ top: adminMode ? '2.5rem' : 0 }}>
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 lg:ml-0 ml-4">
              <h1 className="text-lg font-semibold text-white">
                {navItems.find((item) => item.href === pathname)?.label || 'Dashboard'}
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
