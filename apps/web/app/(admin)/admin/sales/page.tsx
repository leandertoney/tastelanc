'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Store,
  Mail,
  CreditCard,
  Check,
  Loader2,
  ExternalLink,
  Copy,
  CheckCircle,
  Building2,
  Clock,
  Zap,
  Crown,
  Search,
  ChevronDown,
  X,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';

interface Restaurant {
  id: string;
  name: string;
  city: string;
  state: string;
}

const PLANS = [
  {
    id: 'premium',
    name: 'Premium',
    icon: Zap,
    color: 'text-lancaster-gold',
    bgColor: 'bg-lancaster-gold/10',
    borderColor: 'border-lancaster-gold/30',
    popular: true,
    features: [
      'Menu display',
      'Consumer Analytics',
      'Weekly Specials',
      'Happy Hour',
      'Entertainment/Events',
      'Push Notifications (4/month)',
      'Logo/Details',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    icon: Crown,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30',
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
  },
];

const DURATIONS = [
  { id: '3mo', label: '3 Months', months: 3 },
  { id: '6mo', label: '6 Months', months: 6 },
  { id: 'yearly', label: '1 Year', months: 12, badge: 'Best Value' },
];

const PRICES: Record<string, Record<string, number>> = {
  premium: { '3mo': 200, '6mo': 350, yearly: 650 },
  elite: { '3mo': 300, '6mo': 575, yearly: 1100 },
};

export default function AdminSalesPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true);

  // Form state
  const [email, setEmail] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [newRestaurantName, setNewRestaurantName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');

  // Selection state
  const [selectedPlan, setSelectedPlan] = useState<string>('premium');
  const [selectedDuration, setSelectedDuration] = useState<string>('yearly');

  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Restaurant search dropdown state
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter restaurants based on search
  const filteredRestaurants = restaurants.filter((r) =>
    `${r.name} ${r.city} ${r.state}`.toLowerCase().includes(restaurantSearch.toLowerCase())
  );

  // Get selected restaurant display name
  const selectedRestaurantData = restaurants.find((r) => r.id === selectedRestaurant);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch restaurants on mount
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch('/api/admin/restaurants', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setRestaurants(data.restaurants || []);
        }
      } catch (err) {
        console.error('Error fetching restaurants:', err);
      } finally {
        setIsLoadingRestaurants(false);
      }
    };
    fetchRestaurants();
  }, []);

  const handleCreateCheckout = async () => {
    setError('');

    if (!email) {
      setError('Customer email is required');
      return;
    }

    if (!selectedRestaurant && !newRestaurantName) {
      setError('Please select an existing restaurant or enter a new restaurant name');
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch('/api/admin/create-sales-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          contactName,
          phone,
          restaurantId: selectedRestaurant || null,
          businessName: selectedRestaurant
            ? restaurants.find(r => r.id === selectedRestaurant)?.name
            : newRestaurantName,
          plan: selectedPlan,
          duration: selectedDuration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      setCheckoutUrl(data.checkoutUrl);
      setPaymentLinkUrl(data.paymentLinkUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setEmail('');
    setSelectedRestaurant('');
    setNewRestaurantName('');
    setContactName('');
    setPhone('');
    setCheckoutUrl('');
    setPaymentLinkUrl('');
    setError('');
    setRestaurantSearch('');
    setIsDropdownOpen(false);
  };

  const selectedPrice = PRICES[selectedPlan]?.[selectedDuration] || 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Sales Dashboard</h1>
        <p className="text-gray-400 mt-1 text-sm md:text-base">
          Create subscriptions for restaurant partners
        </p>
      </div>

      {/* Success State */}
      {checkoutUrl && (
        <Card className="p-6 mb-8 border-green-500/30 bg-green-500/5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">Checkout Ready!</h3>
              <p className="text-gray-400 text-sm mb-4">
                Share this link with the customer or open it to complete payment.
              </p>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Checkout Now
                  </a>
                  <button
                    onClick={() => copyToClipboard(paymentLinkUrl || checkoutUrl)}
                    className="inline-flex items-center justify-center gap-2 bg-tastelanc-surface hover:bg-tastelanc-surface-light text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={resetForm}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Start New Sale
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {!checkoutUrl && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Customer Info */}
          <Card className="p-6 lg:col-span-1">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-tastelanc-accent" />
              Customer Info
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Customer Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@restaurant.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(717) 555-0123"
                  className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>

              <hr className="border-tastelanc-surface-light" />

              <div ref={dropdownRef} className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Select Existing Restaurant
                </label>
                {/* Selected restaurant display / trigger */}
                {selectedRestaurant && !isDropdownOpen ? (
                  <div
                    onClick={() => setIsDropdownOpen(true)}
                    className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-accent rounded-lg text-white cursor-pointer flex items-center justify-between"
                  >
                    <span>
                      {selectedRestaurantData?.name} ({selectedRestaurantData?.city}, {selectedRestaurantData?.state})
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRestaurant('');
                        setRestaurantSearch('');
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={restaurantSearch}
                      onChange={(e) => {
                        setRestaurantSearch(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder={isLoadingRestaurants ? 'Loading...' : 'Search restaurants...'}
                      disabled={isLoadingRestaurants}
                      className="w-full pl-10 pr-10 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                    />
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                )}

                {/* Dropdown list */}
                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredRestaurants.length === 0 ? (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        {restaurantSearch ? 'No restaurants found' : 'No restaurants available'}
                      </div>
                    ) : (
                      filteredRestaurants.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedRestaurant(r.id);
                            setNewRestaurantName('');
                            setRestaurantSearch('');
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left hover:bg-tastelanc-surface-light transition-colors flex items-center justify-between ${
                            selectedRestaurant === r.id ? 'bg-tastelanc-accent/20 text-white' : 'text-gray-300'
                          }`}
                        >
                          <span>
                            {r.name} <span className="text-gray-500">({r.city}, {r.state})</span>
                          </span>
                          {selectedRestaurant === r.id && (
                            <Check className="w-4 h-4 text-tastelanc-accent" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="text-center text-gray-500 text-sm">or</div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  New Restaurant Name
                </label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={newRestaurantName}
                    onChange={(e) => {
                      setNewRestaurantName(e.target.value);
                      if (e.target.value) setSelectedRestaurant('');
                    }}
                    placeholder="Restaurant Name"
                    className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Plan Selection */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-tastelanc-accent" />
              Select Plan
            </h2>

            {/* Plans */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                const isSelected = selectedPlan === plan.id;

                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? `${plan.borderColor} ${plan.bgColor}`
                        : 'border-tastelanc-surface-light hover:border-gray-600'
                    }`}
                  >
                    {plan.popular && (
                      <Badge variant="gold" className="absolute -top-2 right-2 text-xs">
                        Popular
                      </Badge>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 ${plan.bgColor} rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${plan.color}`} />
                      </div>
                      <span className="font-semibold text-white">{plan.name}</span>
                    </div>
                    <ul className="space-y-1">
                      {plan.features.slice(0, 3).map((feature) => (
                        <li key={feature} className="text-xs text-gray-400 flex items-center gap-1">
                          <Check className={`w-3 h-3 ${plan.color}`} />
                          {feature}
                        </li>
                      ))}
                      {plan.features.length > 3 && (
                        <li className="text-xs text-gray-500">
                          +{plan.features.length - 3} more
                        </li>
                      )}
                    </ul>
                  </button>
                );
              })}
            </div>

            {/* Duration */}
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Billing Period
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {DURATIONS.map((duration) => {
                const isSelected = selectedDuration === duration.id;
                const price = PRICES[selectedPlan]?.[duration.id] || 0;
                const monthlyPrice = (price / duration.months).toFixed(0);

                return (
                  <button
                    key={duration.id}
                    onClick={() => setSelectedDuration(duration.id)}
                    className={`relative p-4 rounded-lg border-2 text-center transition-all ${
                      isSelected
                        ? 'border-tastelanc-accent bg-tastelanc-accent/10'
                        : 'border-tastelanc-surface-light hover:border-gray-600'
                    }`}
                  >
                    {duration.badge && (
                      <Badge variant="accent" className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap">
                        {duration.badge}
                      </Badge>
                    )}
                    <p className="font-semibold text-white">{duration.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">${price}</p>
                    <p className="text-xs text-gray-500">${monthlyPrice}/mo</p>
                  </button>
                );
              })}
            </div>

            {/* Summary & Checkout */}
            <div className="bg-tastelanc-surface-light rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-400 text-sm">Selected Plan</p>
                  <p className="text-white font-semibold">
                    {PLANS.find(p => p.id === selectedPlan)?.name} - {DURATIONS.find(d => d.id === selectedDuration)?.label}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Total</p>
                  <p className="text-2xl font-bold text-white">${selectedPrice}</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleCreateCheckout}
                disabled={isProcessing}
                className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Checkout...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Create Checkout (${selectedPrice})
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
