'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Crown,
  Gift,
  Ban,
  Cake,
  Trophy,
  Sparkles,
  Check,
  X,
  Ticket,
  Vote,
  Zap,
  PartyPopper,
  Lock,
  Clock,
  Mail,
  ArrowRight,
  Star,
  Timer,
  Smartphone,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
const PREMIUM_FEATURES = [
  {
    icon: Smartphone,
    title: 'Early App Access',
    description: 'Download and test the TasteLanc app before anyone else. Be the first to explore all features before public launch.',
  },
  {
    icon: Vote,
    title: 'Vote for Your Favorites',
    description: 'Cast your vote in the top 8 restaurant categories and help crown Lancaster\'s best dining spots.',
  },
  {
    icon: Gift,
    title: '$30+ in Instant Savings',
    description: 'Unlock $5-$10 coupons from partnered local restaurants right away. Redeem through check-ins and our reward tiers - your membership pays for itself.',
  },
  {
    icon: Ban,
    title: 'Ad-Free Experience',
    description: 'Enjoy TasteLanc without any interruptions. No ads on the app or website, ever.',
  },
  {
    icon: Cake,
    title: 'Birthday Treat',
    description: 'Celebrate your special day with a birthday item from TasteLanc every year.',
  },
  {
    icon: Ticket,
    title: 'Gift Card Giveaways',
    description: 'Exclusive entry into monthly gift card giveaways to your favorite Lancaster restaurants.',
  },
  {
    icon: Trophy,
    title: '2.5x Points Multiplier',
    description: 'Earn 2.5x points on every visit and interaction. Rack up rewards faster than ever.',
  },
  {
    icon: PartyPopper,
    title: 'VIP Event Access',
    description: 'Get invited to exclusive TasteLanc events, tastings, and member-only experiences.',
  },
];

const COMPARISON_TABLE = [
  { feature: '$30+ instant savings from local restaurants', basic: false, premium: true },
  { feature: 'Early app access (before public launch)', basic: false, premium: true },
  { feature: 'Browse restaurants & menus', basic: true, premium: true },
  { feature: 'View happy hours & specials', basic: true, premium: true },
  { feature: 'View events', basic: true, premium: true },
  { feature: 'Vote in top 8 categories', basic: false, premium: true },
  { feature: 'Ad-free experience', basic: false, premium: true },
  { feature: 'Upgraded rewards & coupons', basic: false, premium: true },
  { feature: 'Birthday item', basic: false, premium: true },
  { feature: 'Gift card giveaways', basic: false, premium: true },
  { feature: '2.5x points multiplier', basic: false, premium: true },
  { feature: 'Special events access', basic: false, premium: true },
];

function PremiumPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user already has early access (from localStorage or URL params)
  useEffect(() => {
    // Check for email in URL params (from waitlist redirect)
    const urlEmail = searchParams.get('email');
    if (urlEmail) {
      // Grant access and store in localStorage
      localStorage.setItem('tastelanc_early_access', urlEmail);
      setHasAccess(true);
      setEmail(urlEmail);
      return;
    }

    // Check localStorage
    const earlyAccessEmail = localStorage.getItem('tastelanc_early_access');
    if (earlyAccessEmail) {
      setHasAccess(true);
      setEmail(earlyAccessEmail);
    }

    // Track page view
    const trackPageView = async () => {
      let visitorId = localStorage.getItem('tastelanc_visitor_id');
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem('tastelanc_visitor_id', visitorId);
      }

      try {
        await fetch('/api/analytics/page-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pagePath: '/premium',
            visitorId,
          }),
        });
      } catch {
        // Silently fail
      }
    };

    trackPageView();
  }, [searchParams]);

  const handleEarlyAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('tastelanc_early_access', email);
        setHasAccess(true);
        // Smooth scroll to top so users read the value first
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 500);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/create-consumer-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingPeriod, earlyAccessEmail: email }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === 'Please log in first') {
        router.push('/login?redirect=/premium');
      } else {
        throw new Error(data.error || 'Failed to create checkout');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Early Access Gate
  if (!hasAccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Animated Logo */}
          <div className="mb-6">
            <Image
              src="/images/tastelanc_new_dark.png"
              alt="TasteLanc"
              width={200}
              height={70}
              className="h-14 md:h-16 w-auto mx-auto"
            />
          </div>

          {/* Exclusive Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-lancaster-gold/20 to-yellow-500/20 border border-lancaster-gold/30 rounded-full px-4 py-2 mb-6">
            <Lock className="w-4 h-4 text-lancaster-gold" />
            <span className="text-lancaster-gold font-medium text-sm">Early Access Only</span>
          </div>

          {/* Hero */}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Be First to Experience
            <br />
            <span className="text-lancaster-gold">TasteLanc+</span>
          </h1>

          <p className="text-xl text-gray-400 mb-8 max-w-xl mx-auto">
            Join the exclusive group of early adopters who get to download and test the app
            before anyone else when we launch.
          </p>

          {/* Limited Time Badge */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Clock className="w-5 h-5 text-tastelanc-accent" />
            <span className="text-gray-400">Limited time offer</span>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEarlyAccess} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-12 pr-4 py-4 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-lancaster-gold hover:bg-yellow-500 disabled:opacity-50 text-black font-bold px-6 py-4 rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    Get Early Access
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </form>

          <p className="text-gray-500 text-sm mt-4">
            No spam, ever. Get exclusive pricing only available to waitlist members.
          </p>

          {/* Preview of what they'll get */}
          <div className="mt-12 pt-12 border-t border-tastelanc-surface-light">
            <p className="text-gray-400 mb-6">What waitlist members unlock:</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { icon: Smartphone, label: 'Early App Access' },
                { icon: Star, label: 'Special Pricing' },
                { icon: Vote, label: 'Voting Rights' },
                { icon: Gift, label: 'Exclusive Rewards' },
                { icon: Ban, label: 'Ad-Free Forever' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2 p-4 bg-tastelanc-surface/50 rounded-lg">
                  <item.icon className="w-6 h-6 text-lancaster-gold" />
                  <span className="text-sm text-gray-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full Premium Page (after email signup)
  return (
    <div className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4 mb-8 flex items-center justify-center gap-3">
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-green-400 font-medium">
            You&apos;re in! Exclusive early access pricing unlocked for {email}
          </span>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-20">
          {/* Logo */}
          <div className="mb-6">
            <Image
              src="/images/tastelanc_new_dark.png"
              alt="TasteLanc"
              width={180}
              height={60}
              className="h-16 w-auto mx-auto"
            />
          </div>
          <Badge variant="gold" className="mb-4 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Early Access Exclusive
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Welcome to
            <br />
            <span className="text-lancaster-gold">TasteLanc+ Early Access</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            As an early member, you&apos;ll get to download and test the app before anyone else
            when we launch.
          </p>
          <div className="flex items-center justify-center text-sm text-gray-500">
            <span className="flex items-center gap-1 text-lancaster-gold">
              <Zap className="w-4 h-4" />
              Special Pricing Available
            </span>
          </div>
        </div>

        {/* Urgency Banner with Countdown */}
        <div className="mb-12">
          <Card className="p-6 bg-gradient-to-r from-tastelanc-accent/20 to-red-500/10 border-tastelanc-accent/30">
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-tastelanc-accent/20 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-tastelanc-accent" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Now Live on iOS!</p>
                    <p className="text-gray-400 text-sm">Download the app today</p>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-tastelanc-accent font-bold text-lg">Save up to 60%</p>
                  <p className="text-gray-500 text-sm">vs. regular pricing after launch</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Everything You Get with TasteLanc+
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              From exclusive voting rights to VIP events, Premium members get the full Lancaster dining experience.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PREMIUM_FEATURES.map((feature) => (
              <Card key={feature.title} className="p-6 hover:ring-1 hover:ring-lancaster-gold/30 transition-all">
                <div className="w-12 h-12 bg-lancaster-gold/20 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-lancaster-gold" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Social Proof Section */}
        <div className="mb-20">
          <Card className="p-8 bg-gradient-to-r from-tastelanc-surface to-tastelanc-surface-light text-center">
            <h3 className="text-2xl font-bold text-white mb-6">Why Early Members Love TasteLanc+</h3>
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <p className="text-4xl font-bold text-lancaster-gold mb-2">$30+</p>
                <p className="text-gray-400 text-sm">Instant savings from local restaurant coupons</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-lancaster-gold mb-2">$200+</p>
                <p className="text-gray-400 text-sm">Average yearly savings from rewards</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-lancaster-gold mb-2">8</p>
                <p className="text-gray-400 text-sm">Voting categories to crown Lancaster&apos;s best</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-lancaster-gold mb-2">100%</p>
                <p className="text-gray-400 text-sm">Ad-free browsing experience</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Comparison Table */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Basic vs TasteLanc+
            </h2>
            <p className="text-gray-400">
              See everything you&apos;ll unlock as an early member
            </p>
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-tastelanc-surface-light">
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Feature</th>
                    <th className="text-center py-4 px-6 text-gray-400 font-medium w-32">Basic</th>
                    <th className="text-center py-4 px-6 font-medium w-32">
                      <span className="text-lancaster-gold flex items-center justify-center gap-1">
                        <Crown className="w-4 h-4" />
                        TasteLanc+
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_TABLE.map((row, index) => (
                    <tr
                      key={row.feature}
                      className={index % 2 === 0 ? 'bg-tastelanc-surface/50' : ''}
                    >
                      <td className="py-4 px-6 text-white">{row.feature}</td>
                      <td className="text-center py-4 px-6">
                        {row.basic ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-600 mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-4 px-6">
                        <Check className="w-5 h-5 text-lancaster-gold mx-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-6">
              <h4 className="font-semibold text-white mb-2">When can I download and test the app?</h4>
              <p className="text-gray-400 text-sm">
                As a waitlist member, you&apos;ll receive an email with download instructions before our public launch. You&apos;ll be among the first to explore all features!
              </p>
            </Card>
            <Card className="p-6">
              <h4 className="font-semibold text-white mb-2">Is early access pricing permanent?</h4>
              <p className="text-gray-400 text-sm">
                Yes! Once you lock in early access rates, you keep them as long as your subscription is active. Even if prices increase later.
              </p>
            </Card>
            <Card className="p-6">
              <h4 className="font-semibold text-white mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-400 text-sm">
                Absolutely. Cancel anytime with no fees. You&apos;ll keep access until the end of your billing period.
              </p>
            </Card>
            <Card className="p-6">
              <h4 className="font-semibold text-white mb-2">How much can I really save?</h4>
              <p className="text-gray-400 text-sm">
                Most members save $200+ per year through exclusive coupons and rewards. TasteLanc+ pays for itself after just a few visits!
              </p>
            </Card>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="text-center" id="pricing">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-lancaster-gold/20 to-yellow-500/20 border border-lancaster-gold/30 rounded-full px-4 py-2 mb-4">
              <Star className="w-4 h-4 text-lancaster-gold" />
              <span className="text-lancaster-gold font-medium text-sm">Early Access Pricing</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Get TasteLanc+
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-8">
              Special early access pricing for a limited time. Lock in these rates before they increase.
            </p>
          </div>

          {/* Pricing Toggle */}
          <div className="inline-flex items-center bg-tastelanc-surface rounded-lg p-1 mb-8">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-tastelanc-accent text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors relative ${
                billingPeriod === 'yearly'
                  ? 'bg-tastelanc-accent text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-green-500 text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold">
                Best Value
              </span>
            </button>
          </div>

          {/* Pricing Card */}
          <Card className="max-w-md mx-auto p-8 ring-2 ring-lancaster-gold relative overflow-hidden">
            {/* Early Access Badge */}
            <div className="absolute top-4 right-4">
              <span className="bg-lancaster-gold text-black text-xs font-bold px-2 py-1 rounded">
                EARLY ACCESS
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="w-6 h-6 text-lancaster-gold" />
              <span className="text-lg font-semibold text-white">TasteLanc+</span>
            </div>
            <div className="mb-6">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-white">
                  ${billingPeriod === 'monthly' ? '1.99' : '19.99'}
                </span>
                <span className="text-gray-400">
                  /{billingPeriod === 'monthly' ? 'month' : 'year'}
                </span>
              </div>
              <div className="mt-2">
                {billingPeriod === 'monthly' ? (
                  <>
                    <p className="text-green-400 text-sm">
                      60% off regular price!
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Regular price after launch: <span className="line-through">$4.99/month</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-green-400 text-sm">
                      That&apos;s only $1.67/month - less than a coffee!
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Regular price after launch: <span className="line-through">$29/year</span>
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Quick feature list */}
            <ul className="text-left space-y-2 mb-6 text-sm">
              <li className="flex items-center gap-2 text-gray-300">
                <Check className="w-4 h-4 text-lancaster-gold flex-shrink-0" />
                <span><strong className="text-lancaster-gold">$30+ instant savings</strong> - coupons from local restaurants</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <Check className="w-4 h-4 text-lancaster-gold flex-shrink-0" />
                <span><strong className="text-lancaster-gold">Early app access</strong> - test before public launch</span>
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <Check className="w-4 h-4 text-lancaster-gold flex-shrink-0" />
                Vote in top 8 restaurant categories
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <Check className="w-4 h-4 text-lancaster-gold flex-shrink-0" />
                100% ad-free experience
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <Check className="w-4 h-4 text-lancaster-gold flex-shrink-0" />
                Birthday treat, gift cards & VIP events
              </li>
            </ul>

            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="w-full bg-lancaster-gold hover:bg-yellow-600 disabled:opacity-50 text-black font-bold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Subscribe Now
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-4">
              Cancel anytime. Early access rate locked forever.
            </p>
          </Card>

          {/* Guarantee */}
          <div className="mt-8 max-w-md mx-auto">
            <Card className="p-4 bg-tastelanc-surface/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium text-sm">100% Satisfaction Guarantee</p>
                  <p className="text-gray-500 text-xs">Not happy? Cancel anytime, no questions asked.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function PremiumPageLoading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-tastelanc-accent/30 border-t-tastelanc-accent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function PremiumPage() {
  return (
    <Suspense fallback={<PremiumPageLoading />}>
      <PremiumPageContent />
    </Suspense>
  );
}
