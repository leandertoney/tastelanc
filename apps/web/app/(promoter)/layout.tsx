'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  User,
  CreditCard,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ArrowLeft,
  Shield,
  Music,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/supabase/auth';
import { SelfPromoterProvider, useSelfPromoter } from '@/contexts/SelfPromoterContext';

const navItems = [
  { href: '/promoter', label: 'Overview', icon: LayoutDashboard },
  { href: '/promoter/events', label: 'Events', icon: Calendar },
  { href: '/promoter/profile', label: 'Profile', icon: User },
  { href: '/promoter/subscription', label: 'Subscription', icon: CreditCard },
];

function PromoterLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string } } | null>(null);

  const { selfPromoter, isAdmin, isLoading, error } = useSelfPromoter();

  // Check for admin mode from URL params
  const adminMode = searchParams.get('admin_mode') === 'true';
  const adminPromoterId = searchParams.get('promoter_id');

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
    router.push('/admin/self-promoters');
  };

  // Build nav href with admin params if in admin mode
  const buildNavHref = (href: string) => {
    if (adminMode && adminPromoterId) {
      return `${href}?admin_mode=true&promoter_id=${adminPromoterId}`;
    }
    return href;
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const artistName = selfPromoter?.name || 'Your Profile';

  return (
    <div className="min-h-screen bg-tastelanc-bg">
      {/* Admin Mode Banner */}
      {adminMode && isAdmin && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-purple-600 text-white px-4 py-2">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">
                Admin Mode: Editing {artistName}
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
        onMouseEnter={() => setSidebarCollapsed(false)}
        onMouseLeave={() => setSidebarCollapsed(true)}
        className={`fixed ${adminMode ? 'top-10' : 'top-0'} left-0 z-50 h-full ${sidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-64'} w-64 bg-tastelanc-surface border-r border-tastelanc-surface-light transform transition-all duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ height: adminMode ? 'calc(100% - 2.5rem)' : '100%' }}
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
                {adminMode ? 'Admin Editing Mode' : 'Self-Promoter Dashboard'}
              </p>
            )}
          </div>

          {/* Profile Selector */}
          <div className={`${sidebarCollapsed ? 'lg:p-2' : 'p-4'} p-4 border-b border-tastelanc-surface-light`}>
            <button
              onClick={() => !sidebarCollapsed && setProfileMenuOpen(!profileMenuOpen)}
              className={`w-full flex items-center ${sidebarCollapsed ? 'lg:justify-center lg:p-2' : ''} justify-between p-3 bg-tastelanc-bg rounded-lg hover:bg-tastelanc-surface-light transition-colors`}
              disabled={isLoading}
              title={sidebarCollapsed ? artistName : undefined}
            >
              <div className="flex items-center gap-3">
                {selfPromoter?.profile_image_url ? (
                  <img
                    src={selfPromoter.profile_image_url}
                    alt={artistName}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Music className="w-4 h-4 text-white" />
                    )}
                  </div>
                )}
                <span className={`text-tastelanc-text-primary text-sm font-medium truncate max-w-[120px] ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                  {isLoading ? 'Loading...' : artistName}
                </span>
              </div>
              {!adminMode && !sidebarCollapsed && (
                <ChevronDown
                  className={`w-4 h-4 text-tastelanc-text-muted transition-transform ${
                    profileMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>
            {error && !sidebarCollapsed && (
              <p className="text-xs text-red-400 mt-2 px-3">{error}</p>
            )}
          </div>

          {/* Navigation */}
          <nav className={`flex-1 ${sidebarCollapsed ? 'lg:p-2' : ''} p-4 overflow-y-auto scrollbar-hide`}>
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={buildNavHref(item.href)}
                      onClick={() => setSidebarOpen(false)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`flex items-center ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''} gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-purple-500 text-white'
                          : 'text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Info */}
          <div className={`${sidebarCollapsed ? 'lg:p-2' : ''} p-4 border-t border-tastelanc-surface-light`}>
            <div className={`flex items-center gap-3 mb-4 ${sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:mb-2' : ''} px-3`}>
              <div className="w-8 h-8 bg-tastelanc-surface-light rounded-full flex items-center justify-center flex-shrink-0" title={sidebarCollapsed ? displayName : undefined}>
                <User className="w-4 h-4 text-tastelanc-text-muted" />
              </div>
              <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                <p className="text-sm text-tastelanc-text-primary truncate">{displayName}</p>
                <p className="text-xs text-tastelanc-text-faint truncate">{user?.email}</p>
              </div>
            </div>
            {selfPromoter?.slug && (
              <Link
                href={`/artists/${selfPromoter.slug}`}
                title={sidebarCollapsed ? 'View Public Page' : undefined}
                className={`flex items-center ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''} gap-3 px-3 py-2 text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors`}
              >
                <ExternalLink className="w-5 h-5 flex-shrink-0" />
                <span className={sidebarCollapsed ? 'lg:hidden' : ''}>View Public Page</span>
              </Link>
            )}
            {adminMode ? (
              <button
                onClick={handleBackToAdmin}
                title={sidebarCollapsed ? 'Back to Admin' : undefined}
                className={`w-full flex items-center ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''} gap-3 px-3 py-2 text-purple-400 hover:text-purple-300 transition-colors`}
              >
                <ArrowLeft className="w-5 h-5 flex-shrink-0" />
                <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Back to Admin</span>
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
      <div className={`lg:pl-[68px] ${adminMode ? 'pt-10' : ''}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-tastelanc-bg border-b border-tastelanc-surface-light" style={{ top: adminMode ? '2.5rem' : 0 }}>
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-tastelanc-text-muted hover:text-tastelanc-text-primary"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 lg:ml-0 ml-4">
              <h1 className="text-lg font-semibold text-tastelanc-text-primary">
                {navItems.find((item) => item.href === pathname)?.label || 'Dashboard'}
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-tastelanc-text-muted hover:text-tastelanc-text-primary"
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

export default function PromoterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-tastelanc-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SelfPromoterProvider>
        <PromoterLayoutContent>{children}</PromoterLayoutContent>
      </SelfPromoterProvider>
    </Suspense>
  );
}
