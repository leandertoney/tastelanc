'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { BRAND } from '@/config/market';
import StoreBadges from './StoreBadges';

const HAS_APP = !!(BRAND.appStoreUrls.ios || BRAND.appStoreUrls.android);

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src={BRAND.logoPath}
            alt={BRAND.name}
            width={180}
            height={60}
            className="h-10 md:h-12 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/blog"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Blog
          </Link>
          <Link
            href="/for-restaurants"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            For Restaurants
          </Link>
          {HAS_APP && (
            <StoreBadges size="sm" />
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-gray-600 dark:text-gray-400"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A0A] px-4 py-6 space-y-4">
          <Link
            href="/blog"
            className="block text-base text-gray-700 dark:text-gray-300"
            onClick={() => setMenuOpen(false)}
          >
            Blog
          </Link>
          <Link
            href="/for-restaurants"
            className="block text-base text-gray-700 dark:text-gray-300"
            onClick={() => setMenuOpen(false)}
          >
            For Restaurants
          </Link>
          {HAS_APP && (
            <div className="pt-2">
              <StoreBadges size="md" />
            </div>
          )}
        </div>
      )}
    </header>
  );
}
