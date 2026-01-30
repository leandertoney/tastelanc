'use client';

import { useState } from 'react';
import { useSelfPromoter } from '@/contexts/SelfPromoterContext';
import { Card } from '@/components/ui';
import {
  AlertCircle,
  Loader2,
  CheckCircle,
  CreditCard,
  ExternalLink,
} from 'lucide-react';

export default function PromoterSubscriptionPage() {
  const { selfPromoter, isLoading: contextLoading, error: contextError, isSubscribed } = useSelfPromoter();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/promoter/subscription`,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error('Error opening billing portal:', err);
      alert('Failed to open billing portal');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  if (contextLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (contextError) {
    return (
      <Card className="p-6 border-red-500/30">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p>{contextError}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Subscription</h1>
        <p className="text-gray-400 mt-1">Manage your self-promoter subscription</p>
      </div>

      {/* Current Plan */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Self-Promoter Plan</h2>
            <p className="text-gray-400 text-sm">Monthly subscription</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">$50<span className="text-gray-400 text-base font-normal">/mo</span></p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 p-4 bg-tastelanc-surface-light rounded-lg mb-6">
          {isSubscribed ? (
            <>
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">Active Subscription</p>
                <p className="text-gray-400 text-sm">Your subscription is active and in good standing</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-medium">No Active Subscription</p>
                <p className="text-gray-400 text-sm">Contact support to activate your subscription</p>
              </div>
            </>
          )}
        </div>

        {/* Features */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Plan includes:</h3>
          <ul className="space-y-2">
            {[
              'Unlimited event listings',
              'Event flyer uploads',
              'Artist profile page',
              'Events displayed in TasteLanc app',
              'Promotion to local audience',
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Manage Button */}
        {isSubscribed && (
          <button
            onClick={handleManageSubscription}
            disabled={isLoadingPortal}
            className="w-full flex items-center justify-center gap-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-white py-3 rounded-lg transition-colors"
          >
            {isLoadingPortal ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Manage Billing
                <ExternalLink className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </Card>

      {/* Help */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Need Help?</h2>
        <p className="text-gray-400 text-sm mb-4">
          If you have questions about your subscription or need assistance, please contact our support team.
        </p>
        <a
          href="mailto:support@tastelanc.com"
          className="text-purple-400 hover:text-purple-300 text-sm"
        >
          support@tastelanc.com
        </a>
      </Card>
    </div>
  );
}
