'use client';

import { useState } from 'react';
import { Menu, TrendingUp, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import SalesSidebar from './SalesSidebar';

export default function SalesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="flex min-h-screen bg-tastelanc-bg">
      <SalesSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <div className="flex-1 flex flex-col min-w-0">
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
