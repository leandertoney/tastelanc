'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Store,
  Mail,
  CreditCard,
  Check,
  Loader2,
  ExternalLink,
  Copy,
  CheckCircle,
  Search,
  ChevronDown,
  X,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Card } from '@/components/ui';

interface Restaurant {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface CartItem {
  id: string;
  restaurantId: string | null;
  restaurantName: string;
  isNewRestaurant: boolean;
  plan: 'premium' | 'elite';
  duration: '3mo' | '6mo' | 'yearly';
  price: number;
}

const DURATIONS = [
  { id: '3mo', label: '3 Months' },
  { id: '6mo', label: '6 Months' },
  { id: 'yearly', label: '1 Year' },
];

const PRICES: Record<string, Record<string, number>> = {
  premium: { '3mo': 200, '6mo': 350, yearly: 650 },
  elite: { '3mo': 300, '6mo': 575, yearly: 1100 },
};

function getDiscountPercent(count: number): number {
  if (count <= 1) return 0;
  if (count === 2) return 10;
  if (count === 3) return 15;
  return 20;
}

export default function AdminSalesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" /></div>}>
      <AdminSalesPageContent />
    </Suspense>
  );
}

function AdminSalesPageContent() {
  const searchParams = useSearchParams();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true);

  // Wizard step
  const [step, setStep] = useState(1);

  // Customer info
  const [email, setEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // "Add restaurant" form state
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string>('');
  const [currentNewName, setCurrentNewName] = useState('');
  const [currentPlan, setCurrentPlan] = useState<string>('premium');
  const [currentDuration, setCurrentDuration] = useState<string>('yearly');

  // Add-form visibility (collapse after adding, show "Add Another" button)
  const [showAddForm, setShowAddForm] = useState(true);

  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [addError, setAddError] = useState('');
  const [stepError, setStepError] = useState('');

  // Restaurant search dropdown
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pre-fill from query parameters
  useEffect(() => {
    const paramEmail = searchParams.get('email');
    const paramName = searchParams.get('name');
    const paramPhone = searchParams.get('phone');
    const paramRestaurantId = searchParams.get('restaurantId');
    const paramBusinessName = searchParams.get('businessName');

    if (paramEmail) setEmail(paramEmail);
    if (paramName) setContactName(paramName);
    if (paramPhone) setPhone(paramPhone);
    if (paramRestaurantId) setCurrentRestaurantId(paramRestaurantId);
    if (paramBusinessName && !paramRestaurantId) setCurrentNewName(paramBusinessName);
  }, [searchParams]);

  // Filter restaurants (exclude already-in-cart)
  const cartRestaurantIds = new Set(cart.filter(item => item.restaurantId).map(item => item.restaurantId));
  const filteredRestaurants = restaurants.filter((r) =>
    `${r.name} ${r.city} ${r.state}`.toLowerCase().includes(restaurantSearch.toLowerCase()) &&
    !cartRestaurantIds.has(r.id)
  );

  const currentRestaurantData = restaurants.find((r) => r.id === currentRestaurantId);

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const discountPercent = getDiscountPercent(cart.length);
  const discountAmount = Math.round(subtotal * discountPercent / 100);
  const total = subtotal - discountAmount;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch restaurants
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch('/api/admin/restaurants', { credentials: 'include' });
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

  const handleNextStep = () => {
    setStepError('');
    if (step === 1) {
      if (!email) {
        setStepError('Customer email is required');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (cart.length === 0) {
        setStepError('Add at least one restaurant');
        return;
      }
      setStep(3);
    }
  };

  const handleAddToCart = () => {
    setAddError('');

    if (!currentRestaurantId && !currentNewName.trim()) {
      setAddError('Select a restaurant or enter a new name');
      return;
    }

    const restaurantName = currentRestaurantId
      ? restaurants.find(r => r.id === currentRestaurantId)?.name || ''
      : currentNewName.trim();

    const price = PRICES[currentPlan]?.[currentDuration] || 0;

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      restaurantId: currentRestaurantId || null,
      restaurantName,
      isNewRestaurant: !currentRestaurantId,
      plan: currentPlan as 'premium' | 'elite',
      duration: currentDuration as '3mo' | '6mo' | 'yearly',
      price,
    };

    setCart(prev => [...prev, newItem]);
    setCurrentRestaurantId('');
    setCurrentNewName('');
    setRestaurantSearch('');
    setIsDropdownOpen(false);
    setStepError('');
    setShowAddForm(false);
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => {
      const updated = prev.filter(item => item.id !== itemId);
      if (updated.length === 0) setShowAddForm(true);
      return updated;
    });
  };

  const handleCreateCheckout = async () => {
    setError('');
    setIsProcessing(true);

    try {
      const res = await fetch('/api/admin/create-multi-sales-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          contactName,
          phone,
          items: cart.map(item => ({
            restaurantId: item.restaurantId,
            restaurantName: item.restaurantName,
            isNewRestaurant: item.isNewRestaurant,
            plan: item.plan,
            duration: item.duration,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout');
      setCheckoutUrl(data.checkoutUrl);
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
    setContactName('');
    setPhone('');
    setCart([]);
    setCurrentRestaurantId('');
    setCurrentNewName('');
    setCheckoutUrl('');
    setError('');
    setAddError('');
    setStepError('');
    setRestaurantSearch('');
    setIsDropdownOpen(false);
    setShowAddForm(true);
    setStep(1);
  };

  const currentPrice = PRICES[currentPlan]?.[currentDuration] || 0;
  const durationLabel = DURATIONS.find(d => d.id === currentDuration)?.label || '';

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">New Sale</h1>
      </div>

      {/* Success State */}
      {checkoutUrl ? (
        <Card className="p-6 border-green-500/30 bg-green-500/5">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-1">Checkout Ready</h2>
            <p className="text-gray-400 text-sm">
              {cart.length} restaurant{cart.length !== 1 ? 's' : ''} &mdash; ${total.toLocaleString()}
              {discountPercent > 0 && ` (${discountPercent}% off)`}
            </p>
          </div>

          <div className="space-y-3">
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Checkout
            </a>
            <button
              onClick={() => copyToClipboard(checkoutUrl)}
              className="w-full inline-flex items-center justify-center gap-2 bg-tastelanc-surface hover:bg-tastelanc-surface-light text-white px-6 py-3 rounded-lg transition-colors"
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
            <button
              onClick={resetForm}
              className="w-full text-sm text-gray-400 hover:text-white transition-colors py-2"
            >
              Start New Sale
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    s < step
                      ? 'bg-green-500 text-white'
                      : s === step
                      ? 'bg-tastelanc-accent text-white'
                      : 'bg-tastelanc-surface-light text-gray-500'
                  }`}
                >
                  {s < step ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                <span className={`text-xs hidden sm:block ${s === step ? 'text-white' : 'text-gray-500'}`}>
                  {s === 1 ? 'Customer' : s === 2 ? 'Restaurants' : 'Review'}
                </span>
                {s < 3 && <div className={`flex-1 h-px ${s < step ? 'bg-green-500' : 'bg-tastelanc-surface-light'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Customer Info */}
          {step === 1 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-5">Customer Info</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setStepError(''); }}
                      placeholder="owner@restaurant.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(717) 555-0123"
                    className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                </div>

                {stepError && (
                  <p className="text-red-400 text-sm">{stepError}</p>
                )}

                <button
                  onClick={handleNextStep}
                  className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </Card>
          )}

          {/* Step 2: Add Restaurants */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Added restaurants (show first when items exist) */}
              {cart.length > 0 && (
                <Card className="p-4">
                  <p className="text-sm font-medium text-gray-400 mb-3">
                    {cart.length} restaurant{cart.length !== 1 ? 's' : ''} added
                    {discountPercent > 0 && (
                      <span className="text-green-400 ml-2">({discountPercent}% multi-location discount)</span>
                    )}
                  </p>
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-tastelanc-surface-light rounded-lg px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium truncate">{item.restaurantName}</p>
                          <p className="text-gray-400 text-xs capitalize">
                            {item.plan} &middot; {DURATIONS.find(d => d.id === item.duration)?.label}
                            {item.isNewRestaurant && <span className="text-tastelanc-accent ml-1">(New)</span>}
                          </p>
                        </div>
                        <span className="text-white text-sm font-semibold ml-3">${item.price}</span>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Another Restaurant button (when form is hidden) */}
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="w-full mt-3 py-2.5 border-2 border-dashed border-tastelanc-surface-light hover:border-tastelanc-accent text-gray-400 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Another Restaurant
                    </button>
                  )}
                </Card>
              )}

              {/* Add Restaurant form (visible when showAddForm is true OR cart is empty) */}
              {(showAddForm || cart.length === 0) && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-white">
                      {cart.length === 0 ? 'Add Restaurant' : 'Add Another Restaurant'}
                    </h2>
                    {cart.length > 0 && (
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Restaurant search */}
                    <div ref={dropdownRef} className="relative">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Existing Restaurant</label>
                      {currentRestaurantId && !isDropdownOpen ? (
                        <div
                          onClick={() => setIsDropdownOpen(true)}
                          className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-accent rounded-lg text-white cursor-pointer flex items-center justify-between"
                        >
                          <span className="truncate">
                            {currentRestaurantData?.name} ({currentRestaurantData?.city}, {currentRestaurantData?.state})
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentRestaurantId('');
                              setRestaurantSearch('');
                            }}
                            className="text-gray-400 hover:text-white ml-2"
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
                            onChange={(e) => { setRestaurantSearch(e.target.value); setIsDropdownOpen(true); }}
                            onFocus={() => setIsDropdownOpen(true)}
                            placeholder={isLoadingRestaurants ? 'Loading...' : 'Search restaurants...'}
                            disabled={isLoadingRestaurants}
                            className="w-full pl-10 pr-10 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                          />
                          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                      )}

                      {isDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredRestaurants.length === 0 ? (
                            <div className="px-4 py-3 text-gray-500 text-sm">
                              {restaurantSearch ? 'No restaurants found' : 'No restaurants available'}
                            </div>
                          ) : (
                            filteredRestaurants.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => {
                                  setCurrentRestaurantId(r.id);
                                  setCurrentNewName('');
                                  setRestaurantSearch('');
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-2.5 text-left hover:bg-tastelanc-surface-light transition-colors ${
                                  currentRestaurantId === r.id ? 'bg-tastelanc-accent/20 text-white' : 'text-gray-300'
                                }`}
                              >
                                {r.name} <span className="text-gray-500">({r.city}, {r.state})</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-center text-gray-500 text-xs">or</div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">New Restaurant Name</label>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          value={currentNewName}
                          onChange={(e) => { setCurrentNewName(e.target.value); if (e.target.value) setCurrentRestaurantId(''); }}
                          placeholder="Restaurant Name"
                          className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                        />
                      </div>
                    </div>

                    <hr className="border-tastelanc-surface-light" />

                    {/* Plan */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Plan</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['premium', 'elite'] as const).map((plan) => (
                          <button
                            key={plan}
                            onClick={() => setCurrentPlan(plan)}
                            className={`p-3 rounded-lg border-2 text-center transition-all ${
                              currentPlan === plan
                                ? 'border-tastelanc-accent bg-tastelanc-accent/10 text-white'
                                : 'border-tastelanc-surface-light text-gray-300 hover:border-gray-600'
                            }`}
                          >
                            <span className="font-semibold text-sm capitalize">{plan}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
                      <div className="grid grid-cols-3 gap-2">
                        {DURATIONS.map((d) => {
                          const price = PRICES[currentPlan]?.[d.id] || 0;
                          return (
                            <button
                              key={d.id}
                              onClick={() => setCurrentDuration(d.id)}
                              className={`p-2.5 rounded-lg border-2 text-center transition-all ${
                                currentDuration === d.id
                                  ? 'border-tastelanc-accent bg-tastelanc-accent/10'
                                  : 'border-tastelanc-surface-light hover:border-gray-600'
                              }`}
                            >
                              <p className="text-xs text-gray-300">{d.label}</p>
                              <p className="text-sm font-bold text-white">${price}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {addError && <p className="text-red-400 text-sm">{addError}</p>}

                    <button
                      onClick={handleAddToCart}
                      className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add — {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} {durationLabel} (${currentPrice})
                    </button>
                  </div>
                </Card>
              )}

              {stepError && (
                <p className="text-red-400 text-sm">{stepError}</p>
              )}

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(1); setStepError(''); }}
                  className="flex-1 bg-tastelanc-surface hover:bg-tastelanc-surface-light text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  className="flex-1 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Review
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Checkout */}
          {step === 3 && (
            <div className="space-y-4">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-5">Review Order</h2>

                {/* Customer summary */}
                <div className="mb-5 pb-4 border-b border-tastelanc-surface-light">
                  <p className="text-sm text-gray-400 mb-1">Customer</p>
                  <p className="text-white font-medium">{contactName || email}</p>
                  <p className="text-gray-400 text-sm">{email}</p>
                  {phone && <p className="text-gray-400 text-sm">{phone}</p>}
                </div>

                {/* Items */}
                <div className="space-y-2 mb-5">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-white text-sm">{item.restaurantName}</p>
                        <p className="text-gray-500 text-xs capitalize">
                          {item.plan} &middot; {DURATIONS.find(d => d.id === item.duration)?.label}
                        </p>
                      </div>
                      <span className="text-white text-sm">${item.price}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-tastelanc-surface-light pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-white">${subtotal.toLocaleString()}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400">Discount ({discountPercent}%)</span>
                      <span className="text-green-400">-${discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-tastelanc-surface-light">
                    <span className="text-white font-semibold">Total</span>
                    <span className="text-xl font-bold text-white">${total.toLocaleString()}</span>
                  </div>
                </div>
              </Card>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(2); setError(''); }}
                  className="flex-1 bg-tastelanc-surface hover:bg-tastelanc-surface-light text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleCreateCheckout}
                  disabled={isProcessing}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Create Checkout
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
