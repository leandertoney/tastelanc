'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  LogOut,
  TrendingUp,
  Briefcase,
  CreditCard,
  Mail,
  X,
  Plus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const NAV_ITEMS: Array<{
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  highlight?: boolean;
  section?: string;
}> = [
  { href: '/sales', icon: LayoutDashboard, label: 'Overview', section: 'Pipeline' },
  { href: '/sales/leads', icon: Briefcase, label: 'Business Leads', highlight: true },
  { href: '/sales/leads/new', icon: Plus, label: 'Add Lead' },
  { href: '/sales/contacts', icon: Mail, label: 'Inquiries', section: 'Outreach' },
  { href: '/sales/checkout', icon: CreditCard, label: 'New Sale', highlight: true, section: 'Sales' },
  { href: '/sales/restaurants', icon: Store, label: 'Restaurant Directory', section: 'Reference' },
];

interface SalesSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function SalesSidebar({ isOpen, onClose }: SalesSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

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
          w-64 bg-tastelanc-surface border-r border-tastelanc-surface-light
          min-h-screen flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-tastelanc-surface-light flex items-center justify-between">
          <Link href="/sales" className="flex items-center gap-2" onClick={handleNavClick}>
            <div className="w-10 h-10 bg-tastelanc-accent rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">TasteLanc</span>
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
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item, index) => {
              const isActive = pathname === item.href ||
                (item.href !== '/sales' && pathname.startsWith(item.href) && item.href !== '/sales/leads/new');

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
