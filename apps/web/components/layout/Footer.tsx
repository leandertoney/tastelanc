'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Instagram } from 'lucide-react';
import { BRAND } from '@/config/market';
import OtherCitiesFooter from './OtherCitiesFooter';

export default function Footer() {
  return (
    <footer className="border-t border-tastelanc-surface-light py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-5 gap-8">
          <div>
            <Link href="/">
              <Image
                src={BRAND.logoPath}
                alt={BRAND.name}
                width={160}
                height={50}
                className="h-12 w-auto mb-3"
              />
            </Link>
            <p className="text-tastelanc-text-muted text-sm mb-4">
              The ultimate app for discovering dining and nightlife in {BRAND.county}, {BRAND.state}.
            </p>
            {/* Instagram Link */}
            <a
              href={BRAND.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-tastelanc-text-muted hover:text-lancaster-gold transition-colors"
            >
              <Instagram className="w-5 h-5" />
              <span className="text-sm">{BRAND.socialHandle}</span>
            </a>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-tastelanc-text-muted">
              <li>
                <Link href="/blog" className="hover:text-tastelanc-text-primary transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/premium" className="hover:text-tastelanc-text-primary transition-colors text-lancaster-gold">
                  {BRAND.premiumName}
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-tastelanc-text-primary transition-colors">
                  Careers
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">For Businesses</h4>
            <ul className="space-y-2 text-sm text-tastelanc-text-muted">
              <li>
                <Link href="/contact" className="hover:text-tastelanc-text-primary transition-colors">
                  Partner With Us
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-tastelanc-text-muted">
              <li>
                <Link href="/privacy" className="hover:text-tastelanc-text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-tastelanc-text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-tastelanc-text-primary transition-colors">
                  Support
                </Link>
              </li>
            </ul>
          </div>
          <OtherCitiesFooter />
        </div>
        <div className="border-t border-tastelanc-surface-light mt-8 pt-8 text-center text-sm text-tastelanc-text-faint">
          <p>&copy; {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          <p className="mt-2">
            Designed and Developed by{' '}
            <a
              href="https://universoleappstudios.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-tastelanc-accent hover:underline"
            >
              UNIVERSOLE APP STUDIOS
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
