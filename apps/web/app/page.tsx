'use client';

import { BRAND } from '@/config/market';
import Footer from '@/components/layout/Footer';
import RosieChatBubble from '@/components/chat/RosieChatBubble';
import LandingHeader from '@/components/landing/LandingHeader';
import PhoneMockup from '@/components/landing/PhoneMockup';
import MockupHomeScreen from '@/components/landing/MockupHomeScreen';
import MockupRecommendScreen from '@/components/landing/MockupRecommendScreen';
import StoreBadges from '@/components/landing/StoreBadges';
import FeatureStrip from '@/components/landing/FeatureStrip';
import AppShowcase from '@/components/landing/AppShowcase';
import SocialProof from '@/components/landing/SocialProof';
import FinalCTA from '@/components/landing/FinalCTA';

/* Inline keyframes — no Tailwind config dependency */
const animationCSS = `
@keyframes fadeUp { 0% { opacity:0; transform:translateY(24px) } 100% { opacity:1; transform:translateY(0) } }
@keyframes floatY { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-8px) } }
.anim-fade-up { animation: fadeUp 0.7s ease-out forwards }
.anim-fade-up-slow { animation: fadeUp 0.9s ease-out forwards }
.anim-float { animation: floatY 4s ease-in-out infinite }
`;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      <style dangerouslySetInnerHTML={{ __html: animationCSS }} />
      <LandingHeader />

      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: Copy — staggered fade-up entrance */}
          <div className="flex-1 text-center lg:text-left">
            {/* Social proof pill — star rating */}
            <div className="opacity-0 anim-fade-up" style={{ animationDelay: '0.1s' }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#FBBF24" stroke="#FBBF24" strokeWidth="1">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  5.0 &middot; Loved by {BRAND.countyShort} locals
                </span>
              </div>
            </div>

            <h1 className="opacity-0 anim-fade-up text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-4" style={{ animationDelay: '0.25s' }}>
              Discover{' '}
              <span style={{ color: BRAND.colors.accent }}>{BRAND.countyShort}&apos;s</span>{' '}
              Best Dining & Nightlife
            </h1>

            <p className="opacity-0 anim-fade-up text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0" style={{ animationDelay: '0.4s' }}>
              Happy hours, live events, deals, and AI recommendations — all in one app.
            </p>

            {/* App Store badges */}
            <div className="opacity-0 anim-fade-up" style={{ animationDelay: '0.55s' }}>
              <StoreBadges size="lg" className="justify-center lg:justify-start" />
            </div>

            <p className="opacity-0 anim-fade-up text-xs text-gray-400 dark:text-gray-500 mt-4" style={{ animationDelay: '0.65s' }}>
              Free to download. No account required to browse.
            </p>
          </div>

          {/* Right: Two phones — home screen + recommend camera */}
          <div className="flex-shrink-0 flex items-start">
            {/* Primary phone — home screen */}
            <div className="opacity-0 anim-fade-up-slow relative z-10" style={{ animationDelay: '0.3s' }}>
              <div className="anim-float" style={{ animationDelay: '1.2s' }}>
                <PhoneMockup size="lg" tilt="right">
                  <MockupHomeScreen />
                </PhoneMockup>
              </div>
            </div>
            {/* Secondary phone — recommend/camera, offset behind */}
            <div className="opacity-0 anim-fade-up-slow -ml-12 sm:-ml-16 mt-8 sm:mt-12 relative z-0" style={{ animationDelay: '0.55s' }}>
              <div className="anim-float" style={{ animationDelay: '1.6s' }}>
                <PhoneMockup size="md" tilt="left">
                  <MockupRecommendScreen />
                </PhoneMockup>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Strip */}
      <FeatureStrip />

      {/* App Showcase — 3 screens */}
      <AppShowcase />

      {/* Social Proof */}
      <SocialProof />

      {/* Final CTA */}
      <FinalCTA />

      {/* Footer */}
      <Footer />

      {/* Floating AI Chat */}
      <RosieChatBubble />
    </main>
  );
}
