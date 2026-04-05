'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  UtensilsCrossed,
  Beer,
  Tag,
  Film,
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
  ListChecks,
  Megaphone,
  Ticket,
  Sliders,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/supabase/auth';
import { RestaurantProvider, useRestaurant } from '@/contexts/RestaurantContext';
import { OnboardingProvider, OnboardingWizard } from '@/components/dashboard/onboarding';
import { ModalProvider } from '@/components/dashboard/ModalProvider';
import { Tooltip } from '@/components/ui';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  hint: string;
}

interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    key: 'home',
    label: 'Home',
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, hint: 'Your restaurant performance summary and quick stats' },
    ],
  },
  {
    key: 'content',
    label: 'Content',
    items: [
      { href: '/dashboard/profile', label: 'Profile', icon: Store, hint: 'Update your name, description, photos, hours, and contact info' },
      { href: '/dashboard/menu', label: 'Menu', icon: UtensilsCrossed, hint: 'Build and maintain your digital menu with sections and items' },
      { href: '/dashboard/happy-hours', label: 'Happy Hours', icon: Beer, hint: 'Manage your happy hour deals — these show prominently in the app' },
      { href: '/dashboard/specials', label: 'Specials', icon: Tag, hint: 'Post daily specials, limited-time offers, and promotions' },
      { href: '/dashboard/events', label: 'Events', icon: Calendar, hint: 'Create and promote special events at your restaurant' },
      { href: '/dashboard/entertainment', label: 'Entertainment', icon: Music, hint: 'Add live music, trivia nights, and other entertainment listings' },
      { href: '/dashboard/coupons', label: 'Deals', icon: Ticket, hint: 'Create digital deals that customers redeem in the app — see anonymized analytics on claims and redemptions' },
    ],
  },
  {
    key: 'growth',
    label: 'Growth',
    items: [
      { href: '/dashboard/insights', label: 'Market Insights', icon: Lightbulb, hint: 'See how your restaurant compares in your local market' },
      { href: '/dashboard/marketing', label: 'Marketing', icon: Megaphone, hint: 'Send email campaigns and push notifications to your audience' },
      { href: '/dashboard/recommendations', label: 'Recommendations', icon: Film, hint: 'See community video recommendations and engagement analytics' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    items: [
      { href: '/dashboard/features', label: 'Features', icon: ListChecks, hint: 'Toggle amenities like private dining, live piano, and more — helps diners find you' },
      { href: '/dashboard/customize', label: 'Customize', icon: Sliders, hint: 'Control which tabs appear in your app profile and in what order' },
      { href: '/dashboard/team', label: 'Team', icon: Users, hint: 'Invite and manage team members who can edit your content' },
      { href: '/dashboard/subscription', label: 'Subscription', icon: CreditCard, hint: 'View your plan details, billing, and upgrade options' },
    ],
  },
  {
    key: 'support',
    label: 'Support',
    items: [
      { href: '/dashboard/support', label: 'Help & Support', icon: HelpCircle, hint: 'Chat with Rose or send us a message — we typically respond within 1 business day' },
    ],
  },
];

// Nav items hidden from sales reps (non-content management)
const SALES_HIDDEN_HREFS = new Set([
  '/dashboard',
  '/dashboard/insights',
  '/dashboard/recommendations',
  '/dashboard/team',
  '/dashboard/subscription',
]);

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
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

  // Filter nav items for sales reps, dropping empty sections
  const filteredNavSections = useMemo(() => {
    return navSections
      .map((section) => ({
        ...section,
        items: salesMode
          ? section.items.filter((item) => !SALES_HIDDEN_HREFS.has(item.href))
          : section.items,
      }))
      .filter((section) => section.items.length > 0);
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
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium truncate">
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
      {salesMode && (isSalesRep || isAdmin) && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-blue-600 text-white px-4 py-2">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium truncate">
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
        onMouseEnter={() => setSidebarCollapsed(false)}
        onMouseLeave={() => setSidebarCollapsed(true)}
        className={`fixed ${hasBanner ? 'top-10' : 'top-0'} left-0 z-50 h-full ${sidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-64'} w-64 bg-tastelanc-surface border-r border-tastelanc-surface-light transform transition-all duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ height: hasBanner ? 'calc(100% - 2.5rem)' : '100%' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`${sidebarCollapsed ? 'lg:p-3 lg:flex lg:justify-center' : ''} p-4 border-b border-tastelanc-surface-light`}>
            <Link href="/" className="text-xl font-bold text-tastelanc-accent" title={sidebarCollapsed ? 'TasteLanc' : undefined}>
              {sidebarCollapsed ? <span className="hidden lg:block text-lg">T</span> : null}
              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>TasteLanc</span>
            </Link>
            {!sidebarCollapsed && (
              <p className="text-xs text-tastelanc-text-faint mt-1">
                {subtitleText}
              </p>
            )}
          </div>

          {/* Restaurant Selector */}
          <div className={`${sidebarCollapsed ? 'lg:p-2' : 'p-4'} p-4 border-b border-tastelanc-surface-light`} ref={restaurantDropdownRef}>
            <button
              onClick={() => {
                if (showRestaurantSwitcher && !sidebarCollapsed) {
                  setRestaurantMenuOpen(!restaurantMenuOpen);
                }
              }}
              className={`w-full flex items-center ${sidebarCollapsed ? 'lg:justify-center lg:p-2' : ''} justify-between p-3 bg-tastelanc-bg rounded-lg transition-colors ${
                showRestaurantSwitcher ? 'hover:bg-tastelanc-surface-light cursor-pointer' : 'cursor-default'
              }`}
              disabled={isLoading}
              title={sidebarCollapsed ? restaurantName : undefined}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-tastelanc-accent rounded-full flex items-center justify-center flex-shrink-0">
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-white font-bold text-sm">
                      {restaurantName.charAt(0)}
                    </span>
                  )}
                </div>
                <span className={`text-tastelanc-text-primary text-sm font-medium truncate max-w-[120px] ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                  {isLoading ? 'Loading...' : restaurantName}
                </span>
              </div>
              {showRestaurantSwitcher && !sidebarCollapsed && (
                <ChevronDown
                  className={`w-4 h-4 text-tastelanc-text-muted transition-transform ${
                    restaurantMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>

            {/* Restaurant Dropdown */}
            {restaurantMenuOpen && showRestaurantSwitcher && !sidebarCollapsed && (
              <div className="mt-2 bg-tastelanc-surface-light rounded-lg border border-tastelanc-border overflow-hidden">
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
                          ? 'bg-tastelanc-accent/10 text-tastelanc-text-primary'
                          : 'text-tastelanc-text-secondary hover:bg-tastelanc-bg hover:text-tastelanc-text-primary'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-tastelanc-accent' : 'bg-tastelanc-surface-light'
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
          <nav className={`flex-1 ${sidebarCollapsed ? 'lg:p-2' : ''} p-4 overflow-y-auto scrollbar-hide`}>
            {filteredNavSections.map((section, sectionIdx) => (
              <div key={section.key} className={sectionIdx > 0 ? 'mt-3' : ''}>
                {/* Section header: divider when collapsed, text label when expanded */}
                {sectionIdx > 0 && sidebarCollapsed && (
                  <div className="hidden lg:block border-t border-tastelanc-surface-light my-2 mx-2" />
                )}
                {!sidebarCollapsed && (
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-tastelanc-text-faint px-3 mb-1.5 mt-1">
                    {section.label}
                  </h3>
                )}
                {/* Mobile: always show label even if sidebar uses collapsed state */}
                {sidebarCollapsed && (
                  <h3 className="lg:hidden text-[10px] font-semibold uppercase tracking-wider text-tastelanc-text-faint px-3 mb-1.5 mt-1">
                    {section.label}
                  </h3>
                )}
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <div className="group/nav relative flex items-center">
                          <Link
                            href={buildNavHref(item.href)}
                            data-onboarding={item.href.split('/').pop() || 'overview'}
                            onClick={() => setSidebarOpen(false)}
                            title={sidebarCollapsed ? item.label : undefined}
                            className={`flex items-center ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''} gap-3 px-3 py-2 rounded-lg transition-colors flex-1 ${
                              isActive
                                ? 'bg-tastelanc-accent text-white'
                                : 'text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light'
                            }`}
                          >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                          </Link>
                          {item.hint && !sidebarCollapsed && (
                            <Tooltip content={item.hint} position="right">
                              <span className="absolute right-2 opacity-0 group-hover/nav:opacity-100 transition-opacity cursor-help">
                                <HelpCircle className="w-3.5 h-3.5 text-tastelanc-text-faint hover:text-tastelanc-text-muted" />
                              </span>
                            </Tooltip>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* User Info */}
          <div className={`${sidebarCollapsed ? 'lg:p-2' : ''} p-4 border-t border-tastelanc-surface-light`}>
            <div className={`flex items-center gap-3 mb-4 ${sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:mb-2' : ''} px-3`}>
              <div className="w-8 h-8 bg-tastelanc-surface-light rounded-full flex items-center justify-center flex-shrink-0" title={sidebarCollapsed ? displayName : undefined}>
                <User className="w-4 h-4 text-white" />
              </div>
              <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                <p className="text-sm text-tastelanc-text-primary truncate">{displayName}</p>
                <p className="text-xs text-tastelanc-text-faint truncate">{user?.email}</p>
              </div>
            </div>
            {restaurant?.slug && (
              <Link
                href={`/restaurants/${restaurant.slug}`}
                title={sidebarCollapsed ? 'View Public Page' : undefined}
                className={`flex items-center ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''} gap-3 px-3 py-2 text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors`}
              >
                <Store className="w-5 h-5 flex-shrink-0" />
                <span className={sidebarCollapsed ? 'lg:hidden' : ''}>View Public Page</span>
              </Link>
            )}
            {adminMode ? (
              <button
                onClick={handleBackToAdmin}
                title={sidebarCollapsed ? 'Back to Admin' : undefined}
                className={`w-full flex items-center ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''} gap-3 px-3 py-2 text-amber-400 hover:text-amber-300 transition-colors`}
              >
                <ArrowLeft className="w-5 h-5 flex-shrink-0" />
                <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Back to Admin</span>
              </button>
            ) : salesMode ? (
              <button
                onClick={handleBackToSales}
                title={sidebarCollapsed ? 'Back to Sales' : undefined}
                className={`w-full flex items-center ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''} gap-3 px-3 py-2 text-blue-400 hover:text-blue-300 transition-colors`}
              >
                <ArrowLeft className="w-5 h-5 flex-shrink-0" />
                <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Back to Sales</span>
              </button>
            ) : (
              <button
                onClick={handleSignOut}
                title={sidebarCollapsed ? 'Sign Out' : undefined}
                className={`w-full flex items-center ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''} gap-3 px-3 py-2 text-tastelanc-text-muted hover:text-red-400 transition-colors`}
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`lg:pl-[68px] ${hasBanner ? 'pt-10' : ''}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-tastelanc-bg border-b border-tastelanc-surface-light" style={{ top: hasBanner ? '2.5rem' : 0 }}>
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-tastelanc-text-muted hover:text-tastelanc-text-primary"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 lg:ml-0 ml-4">
              <h1 className="text-lg font-semibold text-tastelanc-text-primary">
                {filteredNavSections.flatMap(s => s.items).find((item) => item.href === pathname)?.label || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 text-tastelanc-text-muted hover:text-tastelanc-text-primary"
              >
                {sidebarOpen && <X className="w-6 h-6" />}
              </button>
            </div>
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
        <ModalProvider>
          <OnboardingProvider>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
            <OnboardingWizard />
          </OnboardingProvider>
        </ModalProvider>
      </RestaurantProvider>
    </Suspense>
  );
}
