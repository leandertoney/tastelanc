'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, Badge, Button } from '@/components/ui';
import { Store, MapPin, Check, X, Loader2, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORIES_BY_GROUP, CATEGORY_GROUPS, ALL_CATEGORIES } from '@/lib/constants/categories';
import type { RestaurantCategory } from '@/types/database';
import { useMarket } from '@/contexts/MarketContext';

interface PendingVenue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string | null;
  website: string | null;
  categories: RestaurantCategory[];
  logo_url: string | null;
  description: string | null;
  created_at: string;
}

export default function PendingReviewPage() {
  const [venues, setVenues] = useState<PendingVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, RestaurantCategory[]>>({});
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const supabase = createClient();
  const { marketId } = useMarket();

  useEffect(() => {
    if (marketId) fetchPendingVenues();
  }, [marketId]);

  async function fetchPendingVenues() {
    setLoading(true);
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('market_id', marketId!)
      .eq('is_active', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending venues:', error);
    } else {
      setVenues(data || []);
      // Initialize selected categories from existing categories
      const initial: Record<string, RestaurantCategory[]> = {};
      (data || []).forEach((v) => {
        initial[v.id] = v.categories || [];
      });
      setSelectedCategories(initial);
    }
    setLoading(false);
  }

  function toggleCategory(venueId: string, category: RestaurantCategory) {
    setSelectedCategories((prev) => {
      const current = prev[venueId] || [];
      if (current.includes(category)) {
        return { ...prev, [venueId]: current.filter((c) => c !== category) };
      } else {
        return { ...prev, [venueId]: [...current, category] };
      }
    });
  }

  async function approveVenue(venueId: string) {
    const categories = selectedCategories[venueId] || [];
    if (categories.length === 0) {
      alert('Please select at least one category before approving.');
      return;
    }

    setApproving(venueId);
    const { error } = await supabase
      .from('restaurants')
      .update({
        is_active: true,
        categories: categories,
      })
      .eq('id', venueId);

    if (error) {
      console.error('Error approving venue:', error);
      toast.error('Failed to approve venue');
    } else {
      setVenues((prev) => prev.filter((v) => v.id !== venueId));
      toast.success('Venue approved');
    }
    setApproving(null);
  }

  async function rejectVenue(venueId: string) {
    if (!confirm('Are you sure you want to permanently delete this venue?')) {
      return;
    }

    setRejecting(venueId);
    const { error } = await supabase.from('restaurants').delete().eq('id', venueId);

    if (error) {
      console.error('Error rejecting venue:', error);
      toast.error('Failed to delete venue');
    } else {
      setVenues((prev) => prev.filter((v) => v.id !== venueId));
      toast.success('Venue deleted');
    }
    setRejecting(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-tastelanc-accent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ClipboardCheck className="w-8 h-8 text-lancaster-gold" />
          <h1 className="text-3xl font-bold text-white">Pending Review</h1>
        </div>
        <p className="text-gray-400">
          {venues.length} venue{venues.length !== 1 ? 's' : ''} awaiting approval
        </p>
      </div>

      {venues.length === 0 ? (
        <Card className="p-12 text-center">
          <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">All caught up!</h3>
          <p className="text-gray-400">No venues are pending review at this time.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {venues.map((venue) => (
            <Card key={venue.id} className="p-6">
              <div className="flex items-start gap-4">
                {venue.logo_url ? (
                  <img
                    src={venue.logo_url}
                    alt={venue.name}
                    className="w-20 h-20 rounded-lg object-cover bg-tastelanc-surface-light"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 bg-tastelanc-surface-light rounded-lg flex items-center justify-center">
                    <Store className="w-10 h-10 text-gray-600" />
                  </div>
                )}

                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-1">{venue.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {venue.address}, {venue.city}, {venue.state} {venue.zip_code}
                    </span>
                  </div>
                  {venue.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{venue.description}</p>
                  )}

                  {/* Category Selection - Grouped */}
                  <div className="mb-4 space-y-3">
                    <p className="text-sm text-gray-400">Select categories:</p>

                    {/* Cuisines */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{CATEGORY_GROUPS.cuisines}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORIES_BY_GROUP.cuisines.map((cat) => {
                          const isSelected = (selectedCategories[venue.id] || []).includes(cat.value);
                          return (
                            <button
                              key={cat.value}
                              onClick={() => toggleCategory(venue.id, cat.value)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                isSelected
                                  ? 'bg-tastelanc-accent text-white'
                                  : 'bg-tastelanc-surface-light text-gray-400 hover:bg-tastelanc-surface-light/80 hover:text-white'
                              }`}
                            >
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Meal Time */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{CATEGORY_GROUPS.meal_time}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORIES_BY_GROUP.meal_time.map((cat) => {
                          const isSelected = (selectedCategories[venue.id] || []).includes(cat.value);
                          return (
                            <button
                              key={cat.value}
                              onClick={() => toggleCategory(venue.id, cat.value)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                isSelected
                                  ? 'bg-tastelanc-accent text-white'
                                  : 'bg-tastelanc-surface-light text-gray-400 hover:bg-tastelanc-surface-light/80 hover:text-white'
                              }`}
                            >
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Drinks & Bars */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{CATEGORY_GROUPS.drinks}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORIES_BY_GROUP.drinks.map((cat) => {
                          const isSelected = (selectedCategories[venue.id] || []).includes(cat.value);
                          return (
                            <button
                              key={cat.value}
                              onClick={() => toggleCategory(venue.id, cat.value)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                isSelected
                                  ? 'bg-tastelanc-accent text-white'
                                  : 'bg-tastelanc-surface-light text-gray-400 hover:bg-tastelanc-surface-light/80 hover:text-white'
                              }`}
                            >
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Features */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{CATEGORY_GROUPS.features}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORIES_BY_GROUP.features.map((cat) => {
                          const isSelected = (selectedCategories[venue.id] || []).includes(cat.value);
                          return (
                            <button
                              key={cat.value}
                              onClick={() => toggleCategory(venue.id, cat.value)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                isSelected
                                  ? 'bg-tastelanc-accent text-white'
                                  : 'bg-tastelanc-surface-light text-gray-400 hover:bg-tastelanc-surface-light/80 hover:text-white'
                              }`}
                            >
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => approveVenue(venue.id)}
                      disabled={approving === venue.id || rejecting === venue.id}
                      className="flex items-center gap-2"
                    >
                      {approving === venue.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => rejectVenue(venue.id)}
                      disabled={approving === venue.id || rejecting === venue.id}
                      className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      {rejecting === venue.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="text-right text-sm text-gray-500">
                  Added {new Date(venue.created_at).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
