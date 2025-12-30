'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';
import { User } from '@supabase/supabase-js';
import {
  Crown,
  Smartphone,
  LogOut,
  ArrowLeft,
  Check,
  Calendar,
  CreditCard,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';

interface ConsumerSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_price_id: string | null;
  status: string;
  billing_period: 'monthly' | 'yearly' | 'lifetime';
  current_period_start: string | null;
  current_period_end: string | null;
}

function getPlanDetails(subscription: ConsumerSubscription | null) {
  if (!subscription || subscription.status !== 'active') {
    return {
      name: 'No Active Subscription',
      price: null,
      period: null,
      isActive: false,
    };
  }

  if (subscription.billing_period === 'lifetime') {
    return {
      name: 'TasteLanc+ Lifetime',
      price: '$199',
      period: 'one-time',
      isActive: true,
    };
  }

  if (subscription.billing_period === 'yearly') {
    return {
      name: 'TasteLanc+ Annual',
      price: '$19.99',
      period: '/year',
      isActive: true,
    };
  }

  return {
    name: 'TasteLanc+ Monthly',
    price: '$1.99',
    period: '/month',
    isActive: true,
  };
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<ConsumerSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [managingSubscription, setManagingSubscription] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadUserData() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUser(user);

        // Get consumer subscription
        const { data: sub } = await supabase
          .from('consumer_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        setSubscription(sub);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleManageSubscription = async () => {
    if (!subscription?.stripe_customer_id) return;

    setManagingSubscription(true);
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: subscription.stripe_customer_id,
          returnUrl: window.location.href,
        }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
    } finally {
      setManagingSubscription(false);
    }
  };

  const planDetails = getPlanDetails(subscription);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tastelanc-dark">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/tastelanc_new_dark.png"
              alt="TasteLanc"
              width={120}
              height={40}
              className="h-8 w-auto"
            />
          </Link>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="text-gray-400 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
          </h1>
          <p className="text-gray-400">
            Manage your TasteLanc+ subscription and account settings.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Subscription Card */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-lancaster-gold/20 rounded-full flex items-center justify-center">
                  <Crown className="w-5 h-5 text-lancaster-gold" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Your Subscription</h2>
                  <p className="text-sm text-gray-400">{planDetails.name}</p>
                </div>
              </div>
              <Badge variant={planDetails.isActive ? 'gold' : 'default'}>
                {planDetails.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {planDetails.isActive ? (
              <>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-400">Plan:</span>
                    <span className="text-white font-medium">
                      {planDetails.price}{planDetails.period}
                    </span>
                  </div>
                  {subscription?.current_period_end && subscription.billing_period !== 'lifetime' && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-400">Renews:</span>
                      <span className="text-white">
                        {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  {subscription?.billing_period === 'lifetime' && (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-green-400">Lifetime access - no renewal needed</span>
                    </div>
                  )}
                </div>

                {/* Benefits */}
                <div className="border-t border-gray-700 pt-4 mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Your Benefits</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      $30+ instant savings from local restaurants
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Vote in top 8 restaurant categories
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Ad-free browsing experience
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      2.5x rewards points multiplier
                    </li>
                  </ul>
                </div>

                {subscription?.stripe_customer_id && subscription.billing_period !== 'lifetime' && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleManageSubscription}
                    disabled={managingSubscription}
                  >
                    {managingSubscription ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Manage Subscription'
                    )}
                  </Button>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 mb-4">
                  You don&apos;t have an active TasteLanc+ subscription.
                </p>
                <Link href="/premium">
                  <Button variant="primary" className="w-full">
                    Get TasteLanc+
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Mobile App Card */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-tastelanc-accent/20 rounded-full flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-tastelanc-accent" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Mobile App Access</h2>
                <p className="text-sm text-gray-400">Coming soon</p>
              </div>
            </div>

            <div className="bg-tastelanc-surface rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-300 leading-relaxed">
                This email and password will be your login for the <strong className="text-white">TasteLanc mobile app</strong> when it launches.
              </p>
              <p className="text-sm text-gray-400 mt-3">
                Your TasteLanc+ benefits, rewards, and saved favorites will sync automatically across all your devices.
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">Your account email</p>
              <p className="text-white font-medium">{user?.email}</p>
            </div>
          </Card>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to TasteLanc
          </Link>
        </div>
      </main>
    </div>
  );
}
