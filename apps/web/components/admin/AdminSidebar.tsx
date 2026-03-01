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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  highlight?: boolean;
  section?: string;
  superOnly?: boolean; // Only visible to super_admin
}

const NAV_ITEMS: NavItem[] = [
  // REVENUE - All subscription/payment related
  { href: '/admin', icon: LayoutDashboard, label: 'Overview', section: 'Revenue' },
  { href: '/admin/paid-members', icon: CreditCard, label: 'Restaurants', highlight: true },
  { href: '/admin/self-promoters', icon: Music, label: 'Self-Promoters', highlight: true },
  { href: '/admin/sales', icon: Briefcase, label: 'Sales Pipeline', highlight: true },
  { href: '/admin/sponsored-ads', icon: Megaphone, label: 'Sponsored Ads', highlight: true },
  { href: '/admin/team', icon: Users, label: 'Team', highlight: true },
  { href: '/sales', icon: HeadphonesIcon, label: 'Sales CRM', highlight: true },
  // CONTENT - Restaurant management
  { href: '/admin/restaurants', icon: Store, label: 'All Restaurants', section: 'Content' },
  // MARKETING - Campaigns and outreach
  { href: '/admin/email-campaigns', icon: Mail, label: 'Campaigns', highlight: true, section: 'Marketing' },
  // INSIGHTS - Analytics and feedback
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics', section: 'Insights' },
  { href: '/admin/feature-requests', icon: Lightbulb, label: 'Feature Requests', highlight: true },
  // GROWTH - Expansion and communications
  { href: '/admin/expansion', icon: Globe, label: 'Expansion', highlight: true, section: 'Growth', superOnly: true },
  { href: '/admin/inbox', icon: Inbox, label: 'Inbox', highlight: true },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
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

  // Fetch inbox unread count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/sales/inbox/unread-count');
        if (res.ok) {
          const data = await res.json();
          setInboxUnreadCount(data.count || 0);
        }
      } catch {
        // Ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const isSuperAdmin = userRole === 'super_admin';

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.superOnly && !isSuperAdmin) return false;
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
          w-64 bg-tastelanc-surface border-r border-tastelanc-surface-light
          min-h-screen flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-tastelanc-surface-light flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2" onClick={handleNavClick}>
            <div className="w-10 h-10 bg-tastelanc-accent rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">{BRAND.name}</span>
              <span className="block text-xs text-tastelanc-accent">Admin Panel</span>
            </div>
          </Link>
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
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {visibleItems.map((item, index) => {
              const isActive = pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  {item.section && (
                    <p className={`text-[10px] uppercase tracking-wider text-gray-500 px-4 ${index > 0 ? 'mt-4' : ''} mb-2`}>
                      {item.section}
                    </p>
                  )}
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-tastelanc-accent text-white'
                        : item.highlight
                        ? 'text-lancaster-gold hover:bg-lancaster-gold/10'
                        : 'text-gray-400 hover:bg-tastelanc-surface-light hover:text-white'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${item.highlight && !isActive ? 'text-lancaster-gold' : ''}`} />
                    {item.label}
                    {item.label === 'Inbox' && inboxUnreadCount > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium bg-blue-500 text-white rounded-full min-w-[18px] text-center">
                        {inboxUnreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-tastelanc-surface-light">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-tastelanc-surface-light hover:text-white transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
