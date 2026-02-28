'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  ArrowLeft,
  Loader2,
  Search,
  Store,
  MapPin,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui';

const CATEGORIES = ['restaurant', 'bar', 'cafe', 'brewery', 'bakery', 'food_truck', 'other'];

interface SearchResult {
  source: 'directory' | 'google_places';
  restaurant_id?: string;
  google_place_id?: string;
  business_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  website: string;
  category: string;
  is_active?: boolean;
  tier_name?: string;
}

export default function NewLeadPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: 'Lancaster',
    state: 'PA',
    zip_code: '',
    category: 'restaurant',
    notes: '',
  });

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/sales/places/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectResult = (result: SearchResult) => {
    setSelectedResult(result);
    setShowResults(false);
    setSearchQuery('');
    setForm({
      ...form,
      business_name: result.business_name,
      address: result.address || '',
      city: result.city || 'Lancaster',
      state: result.state || 'PA',
      zip_code: result.zip_code || '',
      phone: result.phone || '',
      website: result.website || '',
      category: result.category || 'restaurant',
    });
  };

  const handleUnlink = () => {
    setSelectedResult(null);
  };

  const handleManualMode = () => {
    setManualMode(true);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.business_name) {
      setError('Business name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/sales/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          restaurant_id: selectedResult?.restaurant_id || null,
          google_place_id: selectedResult?.google_place_id || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create lead');
      }

      router.push(`/sales/leads/${data.lead.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-400 hover:text-white hover:bg-tastelanc-surface-light rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Add New Lead</h1>
          <p className="text-gray-400 text-sm">Search for a business or enter details manually</p>
        </div>
      </div>

      {/* Business Search */}
      {!manualMode && !selectedResult && (
        <Card className="p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Find a Business</h2>
          <div ref={searchRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search restaurants, bars, cafes..."
                className={`${inputClass} pl-10`}
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
              )}
            </div>

            {/* Results dropdown */}
            {showResults && (
              <div className="absolute z-10 w-full mt-1 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg shadow-xl max-h-80 overflow-y-auto">
                {searchResults.length === 0 && !isSearching ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No results found for &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  searchResults.map((result, idx) => (
                    <button
                      key={`${result.source}-${result.restaurant_id || result.google_place_id || idx}`}
                      onClick={() => handleSelectResult(result)}
                      className="w-full text-left px-4 py-3 hover:bg-tastelanc-surface-light transition-colors border-b border-tastelanc-surface-light last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {result.source === 'directory' ? (
                            <Store className="w-4 h-4 text-green-400" />
                          ) : (
                            <MapPin className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white truncate">{result.business_name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              result.source === 'directory'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {result.source === 'directory' ? 'In Directory' : 'Google'}
                            </span>
                            {result.tier_name && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-lancaster-gold/20 text-lancaster-gold font-medium">
                                {result.tier_name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {[result.address, result.city, result.state].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}

                {/* Manual entry link */}
                <button
                  onClick={handleManualMode}
                  className="w-full text-left px-4 py-3 text-sm text-tastelanc-accent hover:bg-tastelanc-surface-light transition-colors"
                >
                  Enter manually instead
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleManualMode}
            className="mt-3 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Or enter details manually
          </button>
        </Card>
      )}

      {/* Linked business banner */}
      {selectedResult && (
        <div className={`mb-4 p-4 rounded-lg flex items-center justify-between ${
          selectedResult.source === 'directory'
            ? 'bg-green-500/10 border border-green-500/30'
            : 'bg-blue-500/10 border border-blue-500/30'
        }`}>
          <div className="flex items-center gap-3">
            {selectedResult.source === 'directory' ? (
              <Store className="w-5 h-5 text-green-400" />
            ) : (
              <MapPin className="w-5 h-5 text-blue-400" />
            )}
            <div>
              <p className="text-white font-medium">{selectedResult.business_name}</p>
              <p className="text-xs text-gray-400">
                {selectedResult.source === 'directory' ? 'Linked to directory' : 'Found via Google Places'}
                {selectedResult.tier_name && ` \u00b7 ${selectedResult.tier_name}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleUnlink}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lead form (shown after selecting a result or choosing manual mode) */}
      {(selectedResult || manualMode) && (
        <form onSubmit={handleSubmit}>
          <Card className="p-6 space-y-5">
            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Business Name *</label>
              <input
                type="text"
                value={form.business_name}
                onChange={(e) => handleChange('business_name', e.target.value)}
                placeholder="Restaurant name"
                className={inputClass}
              />
            </div>

            {/* Contact Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Contact Name</label>
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => handleChange('contact_name', e.target.value)}
                placeholder="Owner or manager name"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@restaurant.com"
                  className={inputClass}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(717) 555-0123"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Website</label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://restaurant.com"
                className={inputClass}
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="123 Main St"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Zip */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">ZIP Code</label>
                <input
                  type="text"
                  value={form.zip_code}
                  onChange={(e) => handleChange('zip_code', e.target.value)}
                  placeholder="17601"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                placeholder="Any additional context..."
                className={`${inputClass} resize-none`}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Lead
                </>
              )}
            </button>
          </Card>
        </form>
      )}
    </div>
  );
}
