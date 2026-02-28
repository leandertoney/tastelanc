'use client';

import { useState, useEffect } from 'react';
import { Menu, TrendingUp, Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import SalesSidebar from './SalesSidebar';
import { createClient } from '@/lib/supabase/client';

export default function SalesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profile?.role === 'super_admin' || profile?.role === 'market_admin') {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, []);

  return (
    <div className="flex min-h-screen bg-tastelanc-bg">
      <SalesSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        isAdmin={isAdmin}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Banner */}
        {isAdmin && (
          <div className="bg-amber-600 text-white px-4 py-2 flex items-center justify-between z-30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="w-4 h-4" />
              Viewing Sales CRM as Admin
            </div>
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-sm bg-amber-700 hover:bg-amber-800 px-3 py-1 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Admin
            </Link>
          </div>
        )}

        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 bg-tastelanc-surface border-b border-tastelanc-surface-light z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-white p-2 -ml-2"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-tastelanc-accent rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Sales CRM</span>
            </div>
            <div className="w-10" />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-5 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
