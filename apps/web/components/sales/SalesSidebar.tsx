'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BRAND } from '@/config/market';
import {
  LayoutDashboard,
  Store,
  LogOut,
  TrendingUp,
  Briefcase,
  CreditCard,
  Mail,
  Inbox,
  X,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarDays,
  DollarSign,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { Tooltip } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  highlight?: boolean;
  section?: string;
  adminOnly?: boolean;
  hint?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/sales', icon: LayoutDashboard, label: 'Overview', section: 'Pipeline', hint: 'Your sales pipeline at a glance — track leads and performance' },
  { href: '/sales/inbox', icon: Inbox, label: 'Inbox', highlight: true, hint: 'View and reply to all your email conversations' },
  { href: '/sales/leads', icon: Briefcase, label: 'Business Leads', highlight: true, hint: 'View and manage all your assigned leads' },
  { href: '/sales/leads/new', icon: Plus, label: 'Add Lead', hint: 'Create a new business lead to start the sales process' },
  { href: '/sales/checkout', icon: CreditCard, label: 'New Sale', highlight: true, section: 'Actions', hint: 'Generate a checkout link for a restaurant ready to sign up' },
  { href: '/sales/calendar', icon: CalendarDays, label: 'Calendar', hint: 'Schedule and track meetings with prospects' },
  { href: '/sales/contacts', icon: Mail, label: 'Inquiries', hint: 'Incoming contact form submissions from interested businesses' },
  { href: '/sales/restaurants', icon: Store, label: 'Directory', section: 'Reference', hint: 'Browse all restaurants in your market for prospecting' },
  { href: '/sales/commissions', icon: DollarSign, label: 'Commissions', highlight: true, section: 'Earnings', hint: 'Track your earnings, payouts, and commission tier progress' },
  { href: '/sales/settings', icon: Settings, label: 'Settings', hint: 'Manage your profile and preferences' },
];

interface SalesSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isAdmin?: boolean;
}

export default function SalesSidebar({ isOpen, onClose, collapsed, onToggleCollapse, isAdmin }: SalesSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);

  // Fetch unread counts
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const [leadsRes, inboxRes] = await Promise.all([
          fetch('/api/sales/leads/unread-count'),
          fetch('/api/sales/inbox/unread-count'),
        ]);
        if (leadsRes.ok) {
          const data = await leadsRes.json();
          setUnreadCount(data.count || 0);
        }
        if (inboxRes.ok) {
          const data = await inboxRes.json();
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

  // Filter out admin-only items for non-admin users
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/login';
    }
  };

  const handleNavClick = () => {
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
          ${collapsed ? 'md:w-16' : 'md:w-64'} w-64
          bg-tastelanc-surface border-r border-tastelanc-surface-light
          min-h-screen flex flex-col
          transform transition-all duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className={`border-b border-tastelanc-surface-light flex items-center ${collapsed ? 'md:justify-center md:p-3 p-6' : 'p-6'} justify-between`}>
          <Link href="/sales" className="flex items-center gap-2" onClick={handleNavClick}>
            <div className={`${collapsed ? 'md:w-8 md:h-8' : ''} w-10 h-10 bg-tastelanc-accent rounded-lg flex items-center justify-center flex-shrink-0`}>
              <TrendingUp className={`${collapsed ? 'md:w-4 md:h-4' : ''} w-6 h-6 text-white`} />
            </div>
            <div className={`${collapsed ? 'md:hidden' : ''}`}>
              <span className="text-xl font-bold text-white">{BRAND.name}</span>
              <span className="block text-xs text-tastelanc-accent">Sales CRM</span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white p-1"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${collapsed ? 'md:p-2' : 'md:p-4'} p-4 overflow-y-auto`}>
          <ul className="space-y-1">
            {visibleNavItems.map((item, index) => {
              const isActive = pathname === item.href ||
                (item.href !== '/sales' && pathname.startsWith(item.href) && item.href !== '/sales/leads/new');

              return (
                <li key={item.href}>
                  {item.section && !collapsed && (
                    <p className={`text-[10px] uppercase tracking-wider text-gray-500 px-4 ${index > 0 ? 'mt-4' : ''} mb-2`}>
                      {item.section}
                    </p>
                  )}
                  {item.section && collapsed && index > 0 && (
                    <div className="hidden md:block border-t border-tastelanc-surface-light my-2" />
                  )}
                  <div className="group/nav relative flex items-center">
                    <Link
                      href={item.href}
                      onClick={handleNavClick}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 flex-1 ${collapsed ? 'md:justify-center md:px-0 md:py-2.5' : ''} px-4 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-tastelanc-accent text-white'
                          : item.highlight
                          ? 'text-lancaster-gold hover:bg-lancaster-gold/10'
                          : 'text-gray-400 hover:bg-tastelanc-surface-light hover:text-white'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 flex-shrink-0 ${item.highlight && !isActive ? 'text-lancaster-gold' : ''}`} />
                      <span className={`${collapsed ? 'md:hidden' : ''} flex-1`}>{item.label}</span>
                      {item.href === '/sales/inbox' && inboxUnreadCount > 0 && !collapsed && (
                        <span className="md:inline hidden ml-auto bg-blue-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                          {inboxUnreadCount > 99 ? '99+' : inboxUnreadCount}
                        </span>
                      )}
                      {item.href === '/sales/leads' && unreadCount > 0 && !collapsed && (
                        <span className="md:inline hidden ml-auto bg-blue-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Link>
                    {item.hint && !collapsed && (
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

        {/* Collapse toggle + Logout */}
        <div className={`border-t border-tastelanc-surface-light ${collapsed ? 'md:p-2' : 'md:p-4'} p-4`}>
          {/* Collapse toggle — desktop only */}
          <button
            onClick={onToggleCollapse}
            className={`hidden md:flex items-center gap-3 ${collapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-lg text-gray-400 hover:bg-tastelanc-surface-light hover:text-white transition-colors w-full mb-1`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5 flex-shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="w-5 h-5 flex-shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign Out' : undefined}
            className={`flex items-center gap-3 ${collapsed ? 'md:justify-center md:px-0' : ''} px-4 py-3 rounded-lg text-gray-400 hover:bg-tastelanc-surface-light hover:text-white transition-colors w-full`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`${collapsed ? 'md:hidden' : ''}`}>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
