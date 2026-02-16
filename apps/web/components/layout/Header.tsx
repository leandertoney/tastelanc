'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import { Menu, X, Crown, User, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BRAND } from '@/config/market';

interface AuthStatus {
  isLoggedIn: boolean;
  isPremium: boolean;
  userName?: string;
  isLoading: boolean;
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isLoggedIn: false,
    isPremium: false,
    isLoading: true,
  });

  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Check subscription status
          const { data: subscription } = await supabase
            .from('consumer_subscriptions')
            .select('status')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

          setAuthStatus({
            isLoggedIn: true,
            isPremium: !!subscription,
            userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            isLoading: false,
          });
        } else {
          setAuthStatus({
            isLoggedIn: false,
            isPremium: false,
            isLoading: false,
          });
        }
      } catch {
        setAuthStatus({
          isLoggedIn: false,
          isPremium: false,
          isLoading: false,
        });
      }
    }

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Dynamic nav links based on auth status
  const navLinks = useMemo(() => {
    const base: { href: string; label: string; highlight?: boolean }[] = [
      { href: '/blog', label: 'Blog' },
    ];

    // Only show upsell if NOT premium
    if (!authStatus.isPremium) {
      base.push({
        href: '/premium',
        label: authStatus.isLoggedIn ? 'Upgrade' : 'Get the App',
        highlight: true,
      });
    }

    return base;
  }, [authStatus.isLoggedIn, authStatus.isPremium]);

  return (
    <header className="border-b border-tastelanc-surface-light sticky top-0 bg-tastelanc-header-bg/95 backdrop-blur-sm z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src={BRAND.logoPath}
            alt={BRAND.name}
            width={180}
            height={60}
            className="h-12 md:h-14 w-auto"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors flex items-center gap-1 ${
                link.highlight
                  ? 'text-lancaster-gold hover:text-yellow-400 font-medium'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {link.highlight && <Crown className="w-4 h-4" />}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth Section */}
        <div className="hidden md:flex items-center gap-4">
          {authStatus.isLoading ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : authStatus.isLoggedIn ? (
            <>
              {/* Premium Badge */}
              {authStatus.isPremium && (
                <span className="flex items-center gap-1 px-3 py-1 bg-lancaster-gold/20 text-lancaster-gold text-sm font-medium rounded-full">
                  <Crown className="w-3 h-3" />
                  Plus
                </span>
              )}
              {/* Account Link */}
              <Link
                href="/account"
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="hidden lg:inline">{authStatus.userName}</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white px-4 py-2 rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-tastelanc-surface-light">
          <nav className="flex flex-col p-4 gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors py-2 flex items-center gap-1 ${
                  link.highlight
                    ? 'text-lancaster-gold font-medium'
                    : 'text-gray-300 hover:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.highlight && <Crown className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}

            <hr className="border-tastelanc-surface-light" />

            {authStatus.isLoading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : authStatus.isLoggedIn ? (
              <>
                {authStatus.isPremium && (
                  <span className="flex items-center justify-center gap-1 px-3 py-2 bg-lancaster-gold/20 text-lancaster-gold text-sm font-medium rounded-lg">
                    <Crown className="w-3 h-3" />
                    Plus Member
                  </span>
                )}
                <Link
                  href="/account"
                  className="flex items-center justify-center gap-2 text-gray-300 hover:text-white transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-4 h-4" />
                  My Account
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-300 hover:text-white transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white px-4 py-2 rounded-lg transition-colors text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
