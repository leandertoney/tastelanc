'use client';

import { useState, useEffect, useMemo } from 'react';
import { Menu, TrendingUp, Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import SalesSidebar from './SalesSidebar';
import { createClient } from '@/lib/supabase/client';
import { MARKET_CONFIG, type MarketBrand } from '@/config/market';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`;
}

export default function SalesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [repName, setRepName] = useState<string | null>(null);
  const [repMarketConfig, setRepMarketConfig] = useState<MarketBrand | null>(null);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.role === 'super_admin' || profile?.role === 'co_founder' || profile?.role === 'market_admin') {
        setIsAdmin(true);
      }

      // Get rep name and market — try sales_reps first, then user metadata
      const { data: rep } = await supabase
        .from('sales_reps')
        .select('name, market_ids')
        .eq('id', user.id)
        .maybeSingle();
      if (rep?.name) {
        setRepName(rep.name.split(' ')[0]);
      } else if (user.user_metadata?.full_name) {
        setRepName(user.user_metadata.full_name.split(' ')[0]);
      } else if (user.email) {
        setRepName(user.email.split('@')[0]);
      }

      // Resolve rep's market for branding
      if (rep?.market_ids?.length) {
        const { data: market } = await supabase
          .from('markets')
          .select('slug')
          .eq('id', rep.market_ids[0])
          .single();
        if (market?.slug && MARKET_CONFIG[market.slug]) {
          setRepMarketConfig(MARKET_CONFIG[market.slug]);
        }
      }
    };
    init();
  }, []);

  // Build CSS variable overrides for the rep's market
  const marketStyle = useMemo(() => {
    if (!repMarketConfig) return undefined;
    return {
      '--brand-accent': hexToRgb(repMarketConfig.colors.accent),
      '--brand-accent-hover': hexToRgb(repMarketConfig.colors.accentHover),
      '--brand-gold': hexToRgb(repMarketConfig.colors.gold),
      '--brand-bg': hexToRgb(repMarketConfig.colors.bg),
      '--brand-card': hexToRgb(repMarketConfig.colors.card),
      '--brand-surface': hexToRgb(repMarketConfig.colors.surface),
      '--brand-surface-light': hexToRgb(repMarketConfig.colors.surfaceLight),
    } as React.CSSProperties;
  }, [repMarketConfig]);

  return (
    <div className="flex min-h-screen bg-tastelanc-bg" style={marketStyle}>
      <SalesSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        isAdmin={isAdmin}
        brandName={repMarketConfig?.name}
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
          {repName && (
            <p className="text-gray-400 text-sm mb-4">
              {getGreeting()}, <span className="text-white font-medium">{repName}</span>
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
