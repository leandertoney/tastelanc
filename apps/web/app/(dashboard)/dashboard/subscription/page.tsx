'use client';

import { useState } from 'react';
import { Check, Crown, Sparkles, Star, Zap, ExternalLink, Loader2 } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useModal } from '@/components/dashboard/ModalProvider';

// UNIFIED PRICING: Single premium tier with all features
const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    prices: { monthly: 0, yearly: 0 },
    period: 'Free forever',
    description: 'Limited basic features only',
    features: [
      'Hours display',
      'Location on map',
      'Cover photo',
    ],
    cta: 'Current Plan',
    popular: false,
    hidden: true, // Hidden from UI but exists for admin assignment
  },
  {
    id: 'unified',
    name: 'TasteLanc Premium',
    prices: { monthly: 99, yearly: 899 },
    period: '',
    description: 'Complete platform access with all features',
    features: [
      'Menu display & updates',
      'Consumer Analytics',
      'Weekly Specials',
      'Happy Hour management',
      'Entertainment & Events',
      'Logo on Map',
      'Daily Special List',
      'Social Media Content',
      'Event Spotlights',
      'Live Entertainment Spotlight',
      'Advanced Analytics',
      'Weekly Updates',
      'Push Notifications',
    ],
    cta: 'Get Started',
    popular: true,
  },
];

type BillingPeriod = 'monthly' | 'yearly';

// Map plan + billing period to Stripe price ID env var keys
const PRICE_KEY_MAP: Record<string, Record<BillingPeriod, string>> = {
  unified: {
    monthly: 'unified_monthly',
    yearly: 'unified_yearly',
  },
};

export default function SubscriptionPage() {
  const { tierName, restaurant, buildApiUrl } = useRestaurant();
  const modal = useModal();

  // Map legacy tier names to new unified tier
  // premium, elite, coffee_shop -> all map to 'unified' now
  const mapLegacyTier = (tier: string | null | undefined): string => {
    if (!tier) return 'basic';
    if (tier === 'premium' || tier === 'elite' || tier === 'coffee_shop') {
      return 'unified';
    }
    return tier;
  };

  const currentPlan = mapLegacyTier(tierName);
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
        modal.alert({ type: 'error', text: data.error || 'Failed to start checkout. Please try again.' });
      }
    } catch {
      modal.alert({ type: 'error', text: 'Something went wrong. Please try again or contact support.' });
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
        modal.alert({ type: 'error', text: data.error || 'Unable to open billing portal. Please contact support.' });
      }
    } catch {
      modal.alert({ type: 'error', text: 'Something went wrong. Please try again or contact support.' });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-tastelanc-text-primary flex items-center gap-2">
          <Crown className="w-6 h-6 text-lancaster-gold" />
          Subscription
        </h2>
        <p className="text-tastelanc-text-muted mt-1">Choose the plan that fits your needs</p>
      </div>

      {/* Current Plan Banner */}
      <Card className="p-6 bg-gradient-to-r from-tastelanc-surface to-tastelanc-surface-light">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-tastelanc-text-muted text-sm">Current Plan</p>
            <h3 className="text-2xl font-bold text-tastelanc-text-primary capitalize">{currentPlan}</h3>
            {hasActiveSubscription && (
              <p className="text-tastelanc-text-faint text-sm mt-1">Active subscription via Stripe</p>
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

      {/* Billing Toggle - Monthly or Yearly only */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingPeriod('monthly')}
          className={`px-6 py-3 rounded-lg transition-colors font-medium ${
            billingPeriod === 'monthly'
              ? 'bg-tastelanc-accent text-white'
              : 'bg-tastelanc-surface text-tastelanc-text-muted hover:text-tastelanc-text-primary'
          }`}
        >
          Pay Monthly
        </button>
        <button
          onClick={() => setBillingPeriod('yearly')}
          className={`px-6 py-3 rounded-lg transition-colors font-medium flex items-center gap-2 ${
            billingPeriod === 'yearly'
              ? 'bg-tastelanc-accent text-white'
              : 'bg-tastelanc-surface text-tastelanc-text-muted hover:text-tastelanc-text-primary'
          }`}
        >
          Pay Yearly
          <Badge variant="gold" className="ml-1">Save $289</Badge>
        </button>
      </div>

      {/* Plans Grid - Show only visible plans */}
      <div className="max-w-md mx-auto">
        {PLANS.filter(plan => !plan.hidden).map((plan) => {
          const isCurrentPlan = plan.id === currentPlan;
          const tierOrder = { basic: 0, unified: 1 };
          const isDowngrade = tierOrder[plan.id as keyof typeof tierOrder] < tierOrder[currentPlan as keyof typeof tierOrder];
          const isUpgrade = tierOrder[plan.id as keyof typeof tierOrder] > tierOrder[currentPlan as keyof typeof tierOrder];
          const displayPrice = plan.prices[billingPeriod];

          // Button label logic
          let buttonLabel = plan.cta;
          let buttonDisabled = false;

          if (isCurrentPlan && hasActiveSubscription) {
            buttonLabel = 'Current Plan - Manage Billing';
            buttonDisabled = false; // Allow them to manage billing
          } else if (isCurrentPlan && !hasActiveSubscription) {
            buttonLabel = 'Activate Subscription';
            buttonDisabled = false;
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
                <h3 className="text-xl font-bold text-tastelanc-text-primary mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-tastelanc-text-primary">
                    ${displayPrice}
                  </span>
                  {displayPrice > 0 && (
                    <span className="text-tastelanc-text-muted text-lg">
                      /{billingPeriod === 'yearly' ? 'year' : 'month'}
                    </span>
                  )}
                </div>
                {billingPeriod === 'yearly' && displayPrice > 0 && (
                  <p className="text-green-500 text-sm mt-1 font-medium">
                    Save $289/year vs monthly billing
                  </p>
                )}
                {displayPrice === 0 && (
                  <span className="text-tastelanc-text-muted text-sm">{plan.period}</span>
                )}
                <p className="text-tastelanc-text-muted text-sm mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-tastelanc-text-secondary">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={isCurrentPlan ? 'secondary' : 'primary'}
                disabled={buttonDisabled || upgradeLoading === plan.id}
                onClick={() => {
                  if (isCurrentPlan && hasActiveSubscription) {
                    handleManageBilling();
                  } else {
                    handleUpgrade(plan.id);
                  }
                }}
              >
                {upgradeLoading === plan.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : portalLoading && isCurrentPlan ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </span>
                ) : buttonLabel}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Features Comparison */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-6">Why Upgrade?</h3>
        <div className="grid md:grid-cols-3 gap-4 md:gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-tastelanc-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-tastelanc-accent" />
            </div>
            <h4 className="font-semibold text-tastelanc-text-primary mb-2">More Visibility</h4>
            <p className="text-tastelanc-text-muted text-sm">
              Premium members get priority placement in search results and featured sections.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-lancaster-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-6 h-6 text-lancaster-gold" />
            </div>
            <h4 className="font-semibold text-tastelanc-text-primary mb-2">More Features</h4>
            <p className="text-tastelanc-text-muted text-sm">
              Unlock events, advanced analytics, and more tools to manage your restaurant.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-green-500" />
            </div>
            <h4 className="font-semibold text-tastelanc-text-primary mb-2">More Engagement</h4>
            <p className="text-tastelanc-text-muted text-sm">
              Restaurants with premium plans see 3x more customer engagement on average.
            </p>
          </div>
        </div>
      </Card>

      {/* FAQ */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-tastelanc-text-primary mb-1">Can I cancel anytime?</h4>
            <p className="text-tastelanc-text-muted text-sm">
              Yes, you can cancel your subscription at any time by clicking &quot;Manage Billing&quot; above. Your access will continue until the end of your billing period.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-tastelanc-text-primary mb-1">How does billing work?</h4>
            <p className="text-tastelanc-text-muted text-sm">
              You&apos;ll be charged automatically at the beginning of each billing cycle. Choose monthly ($99/month) or annual billing ($899/year - save $289!). Your subscription renews automatically.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-tastelanc-text-primary mb-1">What features do I get?</h4>
            <p className="text-tastelanc-text-muted text-sm">
              All subscribers get complete access to every feature on the platform - menu management, analytics, specials, events, happy hours, and more. No tiers, no limitations.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-tastelanc-text-primary mb-1">How do I update my payment method?</h4>
            <p className="text-tastelanc-text-muted text-sm">
              Click &quot;Manage Billing&quot; to securely update your payment method, view invoices, or change your billing details through Stripe.
            </p>
          </div>
        </div>
      </Card>

      {/* Contact */}
      <div className="text-center">
        <p className="text-tastelanc-text-muted">
          Have questions? Contact us at{' '}
          <a href="mailto:info@tastelanc.com" className="text-tastelanc-accent hover:underline">
            info@tastelanc.com
          </a>
        </p>
      </div>
    </div>
  );
}
