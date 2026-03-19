'use client';

import { Crown, Sparkles, Zap, MapPin, Bell, Star, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { BRAND } from '@/config/market';

const PERKS = [
  {
    icon: Sparkles,
    title: 'Smarter AI Recommendations',
    description: 'Rosie learns your taste profile and gives you hyper-personalized picks — not just "popular nearby."',
  },
  {
    icon: Bell,
    title: 'Early Deal Alerts',
    description: 'Get push notifications for happy hours and specials before they fill up. First dibs, every time.',
  },
  {
    icon: Crown,
    title: 'Members-Only Offers',
    description: 'Exclusive deals from local restaurants available only to Premium members. Real savings, not gimmicks.',
  },
  {
    icon: MapPin,
    title: 'Advanced Itinerary Builder',
    description: 'Plan your perfect night out with AI-powered routing, budget tracking, and shareable itineraries.',
  },
  {
    icon: Zap,
    title: 'Ad-Free Experience',
    description: 'Browse the app without sponsored content interrupting your discovery flow.',
  },
  {
    icon: Star,
    title: 'Premium Badge',
    description: 'Stand out in community votes and check-ins with a Premium member badge on your profile.',
  },
];

const FREE_FEATURES = [
  'Browse all restaurants',
  'Happy hours & events',
  'Basic AI recommendations',
  'Community voting',
  'Bucket list',
];

const PREMIUM_FEATURES = [
  'Everything in Free',
  'Hyper-personalized Rosie AI',
  'Early happy hour alerts',
  'Members-only restaurant deals',
  'Advanced itinerary builder with routing',
  'Ad-free browsing',
  'Premium profile badge',
  'Priority customer support',
];

export default function PremiumPage() {
  return (
    <div className="min-h-screen bg-tastelanc-bg">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-tastelanc-accent/10 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-tastelanc-accent/10 border border-tastelanc-accent/20 mb-6">
            <Crown className="w-4 h-4 text-tastelanc-accent" />
            <span className="text-sm font-medium text-tastelanc-accent">{BRAND.name} Premium</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-tastelanc-text-primary leading-tight max-w-3xl mx-auto">
            Eat Better.
            <span className="block text-tastelanc-accent">Know Before You Go.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-tastelanc-text-secondary max-w-2xl mx-auto">
            Upgrade to Premium and let Rosie work overtime for you — smarter recommendations,
            exclusive deals, and early access to the best local offers.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold rounded-xl transition-colors text-lg"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#compare"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-tastelanc-surface-light hover:bg-tastelanc-surface text-tastelanc-text-primary font-medium rounded-xl transition-colors text-lg"
            >
              Compare Plans
            </a>
          </div>
          <p className="mt-4 text-sm text-tastelanc-text-secondary">
            7-day free trial · Cancel anytime · No credit card required to try
          </p>
        </div>
      </section>

      {/* Perks Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-tastelanc-text-primary">
            What You Get with Premium
          </h2>
          <p className="mt-4 text-lg text-tastelanc-text-secondary max-w-2xl mx-auto">
            Built for people who eat out — not people who just think about it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PERKS.map((perk) => {
            const Icon = perk.icon;
            return (
              <div
                key={perk.title}
                className="p-6 rounded-xl bg-tastelanc-surface border border-tastelanc-surface-light hover:border-tastelanc-accent/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-tastelanc-accent/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-tastelanc-accent" />
                </div>
                <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-2">
                  {perk.title}
                </h3>
                <p className="text-tastelanc-text-secondary text-sm leading-relaxed">
                  {perk.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison Table */}
      <section id="compare" className="bg-tastelanc-surface/30 border-y border-tastelanc-surface-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-tastelanc-text-primary text-center mb-16">
            Free vs Premium
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Free */}
            <div className="rounded-xl bg-tastelanc-surface border border-tastelanc-surface-light p-8">
              <h3 className="text-xl font-semibold text-tastelanc-text-primary mb-1">Free</h3>
              <p className="text-3xl font-bold text-tastelanc-text-primary mb-6">$0</p>
              <ul className="space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-tastelanc-text-secondary">
                    <Check className="w-4 h-4 text-tastelanc-text-secondary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 block text-center py-3 px-6 rounded-xl border border-tastelanc-surface-light hover:bg-tastelanc-surface text-tastelanc-text-primary font-medium transition-colors"
              >
                Get Started Free
              </Link>
            </div>

            {/* Premium */}
            <div className="rounded-xl bg-gradient-to-br from-tastelanc-accent/20 to-tastelanc-accent/5 border border-tastelanc-accent/30 p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 bg-tastelanc-accent text-white text-xs font-semibold rounded-full">
                  MOST POPULAR
                </span>
              </div>
              <h3 className="text-xl font-semibold text-tastelanc-text-primary mb-1">Premium</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <p className="text-3xl font-bold text-tastelanc-text-primary">$4.99</p>
                <span className="text-tastelanc-text-secondary text-sm">/month</span>
              </div>
              <ul className="space-y-3">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-tastelanc-text-primary">
                    <Check className="w-4 h-4 text-tastelanc-accent flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 block text-center py-3 px-6 rounded-xl bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-tastelanc-text-secondary">
            Premium available via in-app purchase on iOS and Android.
          </p>
        </div>
      </section>

      {/* Social proof / Download CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="bg-gradient-to-br from-tastelanc-accent/20 to-tastelanc-accent/5 rounded-2xl p-8 sm:p-12 text-center border border-tastelanc-accent/20">
          <Crown className="w-12 h-12 text-tastelanc-accent mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl font-bold text-tastelanc-text-primary mb-4">
            Ready to Upgrade Your Night Out?
          </h2>
          <p className="text-lg text-tastelanc-text-secondary mb-8 max-w-xl mx-auto">
            Download the {BRAND.name} app and unlock Premium inside. Your first 7 days are on us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold rounded-xl transition-colors"
            >
              Get the App
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-tastelanc-surface-light hover:bg-tastelanc-surface text-tastelanc-text-primary font-medium rounded-xl transition-colors"
            >
              Have Questions?
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
