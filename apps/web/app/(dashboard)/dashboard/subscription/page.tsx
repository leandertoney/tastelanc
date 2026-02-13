'use client';

import { useState } from 'react';
import { Check, Crown, Sparkles, Star, Zap, ExternalLink, Loader2 } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    prices: { '3mo': 0, '6mo': 0, yearly: 0 },
    period: 'Free forever',
    description: 'Get started with essential features',
    features: [
      'Hours display',
      'Location on map',
      'Cover photo',
    ],
    cta: 'Current Plan',
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    prices: { '3mo': 250, '6mo': 450, yearly: 800 },
    period: '',
    description: 'Best for active restaurants',
    features: [
      'Everything in Basic',
      'Menu display',
      'Consumer Analytics',
      'Weekly Specials',
      'Happy Hour',
      'Entertainment/Events',
      'Push Notifications (4/month)',
      'Logo/Details',
    ],
    cta: 'Upgrade',
    popular: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    prices: { '3mo': 350, '6mo': 600, yearly: 1100 },
    period: '',
    description: 'Maximum visibility & features',
    features: [
      'Everything in Premium',
      'Logo on Map',
      'Daily Special List',
      'Social Media Content',
      'Event Spotlights',
      'Live Entertainment Spotlight',
      'Advanced Analytics',
      'Weekly Updates',
    ],
    cta: 'Upgrade',
    popular: false,
  },
];

type BillingPeriod = '3mo' | '6mo' | 'yearly';

// Map plan + billing period to Stripe price ID env var keys
const PRICE_KEY_MAP: Record<string, Record<BillingPeriod, string>> = {
  premium: {
    '3mo': 'premium_3mo',
    '6mo': 'premium_6mo',
    yearly: 'premium_yearly',
  },
  elite: {
    '3mo': 'elite_3mo',
    '6mo': 'elite_6mo',
    yearly: 'elite_yearly',
  },
};

export default function SubscriptionPage() {
  const { tierName, restaurant, buildApiUrl } = useRestaurant();
  const currentPlan = tierName || 'basic';
  const hasActiveSubscription = !!restaurant?.stripe_subscription_id;
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly');
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    if (!restaurant?.id) return;

    const priceKey = PRICE_KEY_MAP[planId]?.[billingPeriod];
    if (!priceKey) return;

    setUpgradeLoading(planId);
    try {
      // Both new subscribers and existing subscribers go through Stripe Checkout
      // For upgrades, the backend calculates proration credit and cancels the old sub on success
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: priceKey,
          restaurantId: restaurant.id,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout. Please try again.');
      }
    } catch {
      alert('Something went wrong. Please try again or contact support.');
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/stripe/create-portal-session'), {
        method: 'POST',
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Unable to open billing portal. Please contact support.');
      }
    } catch {
      alert('Something went wrong. Please try again or contact support.');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Crown className="w-6 h-6 text-lancaster-gold" />
          Subscription
        </h2>
        <p className="text-gray-400 mt-1">Choose the plan that fits your needs</p>
      </div>

      {/* Current Plan Banner */}
      <Card className="p-6 bg-gradient-to-r from-tastelanc-surface to-tastelanc-surface-light">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-gray-400 text-sm">Current Plan</p>
            <h3 className="text-2xl font-bold text-white capitalize">{currentPlan}</h3>
            {hasActiveSubscription && (
              <p className="text-gray-500 text-sm mt-1">Active subscription via Stripe</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={currentPlan === 'basic' ? 'default' : 'gold'}>
              {currentPlan === 'basic' ? 'Free' : 'Active'}
            </Badge>
            {hasActiveSubscription && (
              <Button
                variant="secondary"
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="flex items-center gap-2"
              >
                {portalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Manage Billing
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          onClick={() => setBillingPeriod('3mo')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            billingPeriod === '3mo'
              ? 'bg-tastelanc-accent text-white'
              : 'bg-tastelanc-surface text-gray-400 hover:text-white'
          }`}
        >
          3 Months
        </button>
        <button
          onClick={() => setBillingPeriod('6mo')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            billingPeriod === '6mo'
              ? 'bg-tastelanc-accent text-white'
              : 'bg-tastelanc-surface text-gray-400 hover:text-white'
          }`}
        >
          6 Months
        </button>
        <button
          onClick={() => setBillingPeriod('yearly')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            billingPeriod === 'yearly'
              ? 'bg-tastelanc-accent text-white'
              : 'bg-tastelanc-surface text-gray-400 hover:text-white'
          }`}
        >
          1 Year
          <Badge variant="gold" className="ml-2">Best Value</Badge>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan;
          const tierOrder = { basic: 0, premium: 1, elite: 2 };
          const isDowngrade = tierOrder[plan.id as keyof typeof tierOrder] < tierOrder[currentPlan as keyof typeof tierOrder];
          const isUpgrade = tierOrder[plan.id as keyof typeof tierOrder] > tierOrder[currentPlan as keyof typeof tierOrder];
          const displayPrice = plan.prices[billingPeriod];

          // Button label logic
          let buttonLabel = plan.cta;
          let buttonDisabled = false;

          if (plan.id === 'basic') {
            buttonLabel = currentPlan === 'basic' ? 'Current Plan' : 'Free Plan';
            buttonDisabled = true;
          } else if (isDowngrade) {
            buttonLabel = 'Downgrade via Manage Billing';
            buttonDisabled = true;
          } else if (isCurrentPlan && hasActiveSubscription) {
            buttonLabel = 'Current Plan';
            buttonDisabled = true;
          } else if (isCurrentPlan && !hasActiveSubscription) {
            buttonLabel = 'Current Plan';
            buttonDisabled = true;
          } else if (isUpgrade) {
            buttonLabel = `Upgrade to ${plan.name}`;
            buttonDisabled = false;
          }

          return (
            <Card
              key={plan.id}
              className={`p-6 relative ${
                plan.popular ? 'ring-2 ring-lancaster-gold' : ''
              } ${isCurrentPlan ? 'bg-tastelanc-surface' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="gold" className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-white">
                    ${displayPrice}
                  </span>
                  {displayPrice > 0 && (
                    <span className="text-gray-400">
                      /{billingPeriod === 'yearly' ? 'year' : billingPeriod}
                    </span>
                  )}
                </div>
                {displayPrice === 0 && (
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                )}
                <p className="text-gray-400 text-sm mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={isUpgrade ? 'primary' : plan.popular && !isCurrentPlan ? 'primary' : 'secondary'}
                disabled={buttonDisabled || upgradeLoading === plan.id}
                onClick={() => handleUpgrade(plan.id)}
              >
                {upgradeLoading === plan.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : buttonLabel}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Features Comparison */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Why Upgrade?</h3>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-tastelanc-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-tastelanc-accent" />
            </div>
            <h4 className="font-semibold text-white mb-2">More Visibility</h4>
            <p className="text-gray-400 text-sm">
              Premium members get priority placement in search results and featured sections.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-lancaster-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-6 h-6 text-lancaster-gold" />
            </div>
            <h4 className="font-semibold text-white mb-2">More Features</h4>
            <p className="text-gray-400 text-sm">
              Unlock events, advanced analytics, and more tools to manage your restaurant.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-green-500" />
            </div>
            <h4 className="font-semibold text-white mb-2">More Engagement</h4>
            <p className="text-gray-400 text-sm">
              Restaurants with premium plans see 3x more customer engagement on average.
            </p>
          </div>
        </div>
      </Card>

      {/* FAQ */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-white mb-1">Can I cancel anytime?</h4>
            <p className="text-gray-400 text-sm">
              Yes, you can cancel your subscription at any time by clicking &quot;Manage Billing&quot; above. Your access will continue until the end of your billing period.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-1">How does billing work?</h4>
            <p className="text-gray-400 text-sm">
              You&apos;ll be charged at the beginning of each billing cycle. Choose 3-month, 6-month, or annual billing.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-1">Can I switch plans?</h4>
            <p className="text-gray-400 text-sm">
              Yes, you can upgrade your plan at any time. To downgrade, use &quot;Manage Billing&quot; to adjust your subscription through Stripe.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-1">How do I update my payment method?</h4>
            <p className="text-gray-400 text-sm">
              Click &quot;Manage Billing&quot; to securely update your payment method, view invoices, or change your billing details through Stripe.
            </p>
          </div>
        </div>
      </Card>

      {/* Contact */}
      <div className="text-center">
        <p className="text-gray-400">
          Have questions? Contact us at{' '}
          <a href="mailto:info@tastelanc.com" className="text-tastelanc-accent hover:underline">
            info@tastelanc.com
          </a>
        </p>
      </div>
    </div>
  );
}
