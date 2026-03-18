'use client';

import { BarChart3, Users, Utensils, Star, Zap, Bell, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { BRAND } from '@/config/market';
import VoiceAgent from '@/components/voice/VoiceAgent';

const FEATURES = [
  {
    icon: Users,
    title: 'Reach Engaged Local Diners',
    description: 'Your restaurant appears in a curated app used by people actively looking for where to eat, drink, and go out tonight.',
  },
  {
    icon: Utensils,
    title: 'Happy Hours & Events',
    description: 'Dedicated sections diners browse daily. Your deals and events get seen — not buried in a feed.',
  },
  {
    icon: Zap,
    title: 'AI-Powered Recommendations',
    description: 'Our AI recommends your restaurant to diners based on their preferences, mood, and dining history.',
  },
  {
    icon: Star,
    title: 'Community Voting',
    description: 'Monthly "Best Of" categories where the community votes. Social proof that drives new customers.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard & Analytics',
    description: 'Manage your listing, upload photos, update specials, and see how diners are engaging with your profile.',
  },
  {
    icon: Bell,
    title: 'Push Notifications',
    description: 'Reach thousands of local diners directly. Promote your happy hour, event, or daily special with a tap.',
  },
];

const STATS = [
  { value: '1000+', label: 'Restaurants Listed' },
  { value: '3', label: 'Markets & Growing' },
  { value: '24/7', label: 'AI Recommendations' },
];

export default function ForRestaurantsPage() {
  return (
    <div className="min-h-screen bg-tastelanc-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-tastelanc-accent/10 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-tastelanc-text-primary leading-tight">
              Get More Customers
              <span className="block text-tastelanc-accent">Without More Work</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-tastelanc-text-secondary max-w-2xl">
              {BRAND.name} puts your restaurant in front of local diners who are actively looking
              for where to eat, drink, and go out. Set it up once — our AI does the rest.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold rounded-xl transition-colors text-lg"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-tastelanc-surface-light hover:bg-tastelanc-surface text-tastelanc-text-primary font-medium rounded-xl transition-colors text-lg"
              >
                See How It Works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-tastelanc-surface-light bg-tastelanc-surface/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-3 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-tastelanc-accent">{stat.value}</p>
                <p className="text-sm text-tastelanc-text-secondary mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-tastelanc-text-primary">
            Everything You Need to Grow
          </h2>
          <p className="mt-4 text-lg text-tastelanc-text-secondary max-w-2xl mx-auto">
            One listing. Multiple ways to reach new customers. No social media required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-tastelanc-surface border border-tastelanc-surface-light hover:border-tastelanc-accent/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-tastelanc-accent/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-tastelanc-accent" />
                </div>
                <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-tastelanc-text-secondary text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-tastelanc-surface/30 border-y border-tastelanc-surface-light">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-tastelanc-text-primary text-center mb-16">
            Up and Running in 5 Minutes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Sign Up', desc: 'Choose your plan and create your restaurant profile. Upload a few photos and set your hours.' },
              { step: '2', title: 'Add Your Deals', desc: 'List your happy hours, events, and specials. Takes 2 minutes — update anytime from your dashboard.' },
              { step: '3', title: 'Start Getting Customers', desc: 'Our AI recommends your restaurant to local diners. You show up in search, voting, and push notifications.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-tastelanc-accent text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-tastelanc-text-primary mb-2">{item.title}</h3>
                <p className="text-tastelanc-text-secondary text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="bg-gradient-to-br from-tastelanc-accent/20 to-tastelanc-accent/5 rounded-2xl p-8 sm:p-12 text-center border border-tastelanc-accent/20">
          <h2 className="text-3xl sm:text-4xl font-bold text-tastelanc-text-primary mb-4">
            Ready to Reach More Diners?
          </h2>
          <p className="text-lg text-tastelanc-text-secondary mb-8 max-w-xl mx-auto">
            Have questions? Click the &ldquo;Talk to Us&rdquo; button and our AI assistant
            can answer them instantly — or get in touch with our team directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold rounded-xl transition-colors"
            >
              Contact Us
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Voice Agent - floating button */}
      <VoiceAgent market={process.env.NEXT_PUBLIC_MARKET_SLUG || 'lancaster-pa'} />
    </div>
  );
}
