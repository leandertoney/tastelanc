'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BRAND } from '@/config/market';
import {
  LayoutDashboard,
  BarChart3,
  Store,
  LogOut,
  Shield,
  CreditCard,
  Mail,
  X,
  Briefcase,
  Lightbulb,
  Music,
  Megaphone,
  Users,
  Globe,
  Inbox,
  HeadphonesIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Smartphone,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  highlight?: boolean;
  section?: string;
  superOnly?: boolean; // Only visible to super_admin and co_founder
}

const NAV_ITEMS: NavItem[] = [
  // DASHBOARD
  { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
  // SALES - Outreach and pipeline
  { href: '/admin/inbox', icon: Inbox, label: 'Inbox', highlight: true, section: 'Sales' },
  { href: '/admin/sales', icon: Briefcase, label: 'Sales Pipeline', highlight: true },
  { href: '/sales', icon: HeadphonesIcon, label: 'Sales CRM', highlight: true },
  // REVENUE - Money-generating products
  { href: '/admin/paid-members', icon: CreditCard, label: 'Restaurants', highlight: true, section: 'Revenue' },
  { href: '/admin/self-promoters', icon: Music, label: 'Self-Promoters', highlight: true },
  { href: '/admin/sponsored-ads', icon: Megaphone, label: 'Sponsored Ads', highlight: true },
  // TEAM - People management
  { href: '/admin/team', icon: Users, label: 'Team', highlight: true, section: 'Team' },
  // CONTENT - Restaurant management
  { href: '/admin/restaurants', icon: Store, label: 'All Restaurants', section: 'Content' },
  // MARKETING - Campaigns and outreach
  { href: '/admin/email-campaigns', icon: Mail, label: 'Campaigns', highlight: true, section: 'Marketing' },
  // INSIGHTS - Analytics and feedback
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics', section: 'Insights' },
  { href: '/admin/app-users', icon: Smartphone, label: 'App Users', highlight: true },
  { href: '/admin/feature-requests', icon: Lightbulb, label: 'Feature Requests', highlight: true },
  // GROWTH - Expansion
  { href: '/admin/expansion', icon: Globe, label: 'Expansion', highlight: true, section: 'Growth', superOnly: true },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function AdminSidebar({ isOpen, onClose, collapsed, onToggleCollapse }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(profile?.role || null);
      }
    })();
  }, [supabase]);

  // Fetch inbox unread count (every 30s)
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/sales/inbox/unread-count');
        if (res.ok) {
          const data = await res.json();
          setInboxUnreadCount((data.crmCount || 0) + (data.infoCount || 0));
        }
      } catch {
        // Ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const isSuperAdmin = userRole === 'super_admin';
  const isCoFounder = userRole === 'co_founder';

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.superOnly && !isSuperAdmin && !isCoFounder) return false;
    return true;
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Sign out error:', error);
      // Force redirect even if sign out fails
      window.location.href = '/login';
    }
  };

  const handleNavClick = () => {
    // Close sidebar on mobile when navigating
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          ${collapsed ? 'md:w-[68px]' : 'w-64'} bg-tastelanc-surface border-r border-tastelanc-surface-light
          min-h-screen flex flex-col
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo + collapse toggle */}
        <div className={`${collapsed ? 'p-3' : 'p-6'} border-b border-tastelanc-surface-light flex items-center justify-between`}>
          <Link href="/admin" className="flex items-center gap-2" onClick={handleNavClick}>
            <div className={`${collapsed ? 'w-9 h-9' : 'w-10 h-10'} bg-tastelanc-accent rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Shield className={`${collapsed ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
            </div>
            {!collapsed && (
              <div>
                <span className="text-xl font-bold text-white">{BRAND.name}</span>
                <span className="block text-xs text-tastelanc-accent">Admin Panel</span>
              </div>
            )}
          </Link>
          {/* Collapse toggle for desktop */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:block text-gray-400 hover:text-white p-1 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white p-1"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${collapsed ? 'p-2' : 'p-4'} overflow-y-auto`}>
          <ul className="space-y-1">
            {visibleItems.map((item, index) => {
              const isActive = pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  {item.section && !collapsed && (
                    <p className={`text-[10px] uppercase tracking-wider text-gray-500 px-4 ${index > 0 ? 'mt-4' : ''} mb-2`}>
                      {item.section}
                    </p>
                  )}
                  {item.section && collapsed && index > 0 && (
                    <div className="my-2 mx-2 border-t border-tastelanc-surface-light" />
                  )}
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-2.5 rounded-lg transition-colors relative ${
                      isActive
                        ? 'bg-tastelanc-accent text-white'
                        : item.highlight
                        ? 'text-lancaster-gold hover:bg-lancaster-gold/10'
                        : 'text-gray-400 hover:bg-tastelanc-surface-light hover:text-white'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${item.highlight && !isActive ? 'text-lancaster-gold' : ''}`} />
                    {!collapsed && item.label}
                    {item.label === 'Inbox' && inboxUnreadCount > 0 && (
                      collapsed ? (
                        <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[9px] font-bold bg-blue-500 text-white rounded-full min-w-[16px] text-center leading-none">
                          {inboxUnreadCount}
                        </span>
                      ) : (
                        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium bg-blue-500 text-white rounded-full min-w-[18px] text-center">
                          {inboxUnreadCount}
                        </span>
                      )
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className={`${collapsed ? 'p-2' : 'p-4'} border-t border-tastelanc-surface-light`}>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign Out' : undefined}
            className={`flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-2.5 rounded-lg text-gray-400 hover:bg-tastelanc-surface-light hover:text-white transition-colors w-full`}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>
    </>
  );
}
