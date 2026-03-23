'use client';

import { useState, useEffect } from 'react';
import { Users, Mail, Bell, Loader2 } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import TierGate from '@/components/TierGate';
import ContactsTab from './components/ContactsTab';
import EmailCampaignsTab from './components/EmailCampaignsTab';
import PushNotificationsTab from './components/PushNotificationsTab';
import DeliverabilityBanner from './components/DeliverabilityBanner';

const TABS = [
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'email', label: 'Email Campaigns', icon: Mail },
  { id: 'push', label: 'Push Notifications', icon: Bell },
] as const;

type TabId = (typeof TABS)[number]['id'];
type DeliverabilityStatus = null | 'pending' | 'confirmed' | 'dismissed';

export default function MarketingPage() {
  const { restaurant, tierName, isLoading } = useRestaurant();
  const [activeTab, setActiveTab] = useState<TabId>('contacts');
  const [deliverabilityStatus, setDeliverabilityStatus] = useState<DeliverabilityStatus>(null);
  const [deliverabilityLoaded, setDeliverabilityLoaded] = useState(false);

  useEffect(() => {
    if (!restaurant?.id) return;
    // Use the status from the restaurant object if available (after context fetch includes new column)
    const status = (restaurant as any).deliverability_check_status as DeliverabilityStatus;
    setDeliverabilityStatus(status ?? null);
    setDeliverabilityLoaded(true);
  }, [restaurant?.id, (restaurant as any)?.deliverability_check_status]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-tastelanc-text-faint animate-spin" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-20">
        <p className="text-tastelanc-text-muted">No restaurant selected.</p>
      </div>
    );
  }

  return (
    <TierGate
      requiredTier="premium"
      feature="Marketing"
      description="Import email contacts, send email campaigns, and push notifications to your audience."
    >
      <div className="max-w-5xl">
        {/* Deliverability Banner */}
        {deliverabilityLoaded && deliverabilityStatus !== 'confirmed' && deliverabilityStatus !== 'dismissed' && (
          <DeliverabilityBanner
            restaurantId={restaurant.id}
            initialStatus={deliverabilityStatus}
          />
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-tastelanc-border mb-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-tastelanc-accent text-tastelanc-text-primary'
                    : 'border-transparent text-tastelanc-text-muted hover:text-tastelanc-text-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'contacts' && (
          <ContactsTab restaurantId={restaurant.id} />
        )}
        {activeTab === 'email' && (
          <EmailCampaignsTab
            restaurantId={restaurant.id}
            tierName={tierName}
          />
        )}
        {activeTab === 'push' && (
          <PushNotificationsTab
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            tierName={tierName}
          />
        )}
      </div>
    </TierGate>
  );
}
