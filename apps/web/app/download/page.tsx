'use client';

import { BRAND } from '@/config/market';
import StoreBadges from '@/components/landing/StoreBadges';
import Link from 'next/link';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-[#0A0A0A] dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img
              src={BRAND.logoPath}
              alt={BRAND.name}
              className="h-8 w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center">
          {/* Icon/Logo */}
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 rounded-3xl bg-[#E63946] flex items-center justify-center shadow-xl">
              <img
                src={BRAND.logoPath}
                alt={BRAND.name}
                className="w-20 h-20 object-contain"
              />
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Download {BRAND.name}
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            {BRAND.tagline}
          </p>

          {/* Download Badges */}
          <div className="mb-12">
            <StoreBadges size="lg" className="justify-center" />
          </div>

          {/* Features List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-left max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              What You'll Love
            </h2>

            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-2xl">🍽️</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Discover Local Favorites</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Find hidden gems and popular spots all in one place
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="text-2xl">💎</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Exclusive App-Only Deals</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get access to special offers you won't find anywhere else
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Upcoming Events</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Never miss trivia nights, live music, and special happenings
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="text-2xl">⏰</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Happy Hour Alerts</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Find the best deals on drinks and appetizers near you
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Personalized Recommendations</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get suggestions based on what you love
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Footer CTA */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Free to download. Available on iOS and Android.
            </p>
            <StoreBadges size="md" className="justify-center" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>&copy; 2026 {BRAND.name}. All rights reserved.</p>
            <div className="mt-2 flex items-center justify-center gap-4">
              <Link href="/" className="hover:text-gray-900 dark:hover:text-white transition">
                Home
              </Link>
              {BRAND.instagramUrl && (
                <a
                  href={BRAND.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-900 dark:hover:text-white transition"
                >
                  Instagram
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
