'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Beer, UtensilsCrossed, Music, Package, Search } from 'lucide-react';

interface HolidaySpecial {
  id: string;
  restaurant_id: string;
  holiday_tag: string;
  name: string;
  description: string | null;
  category: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  original_price: number | null;
  special_price: number | null;
  discount_description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  restaurant: {
    id: string;
    name: string;
    cover_image_url: string | null;
    market_id: string;
  };
}

interface Restaurant {
  id: string;
  name: string;
  market_id: string;
}

const CATEGORY_ICONS: Record<string, typeof Beer> = {
  drink: Beer,
  food: UtensilsCrossed,
  entertainment: Music,
  combo: Package,
};

const CATEGORY_LABELS: Record<string, string> = {
  drink: 'Drink Special',
  food: 'Food Special',
  entertainment: 'Entertainment',
  combo: 'Combo Deal',
};

export default function StPatricksDayPage() {
  const [specials, setSpecials] = useState<HolidaySpecial[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'drink',
    start_time: '',
    end_time: '',
    original_price: '',
    special_price: '',
    discount_description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [marketFilter, setMarketFilter] = useState('all');

  const fetchSpecials = useCallback(async () => {
    try {
      const params = new URLSearchParams({ holiday_tag: 'st-patricks-2026' });
      if (marketFilter !== 'all') params.set('market_id', marketFilter);
      const res = await fetch(`/api/admin/holiday-specials?${params}`);
      const data = await res.json();
      setSpecials(data.specials || []);
    } catch (err) {
      console.error('Failed to fetch specials:', err);
    } finally {
      setLoading(false);
    }
  }, [marketFilter]);

  const fetchRestaurants = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/holiday-specials/restaurants');
      const data = await res.json();
      setRestaurants(data.restaurants || []);
    } catch {
      // Will use inline search fallback
    }
  }, []);

  useEffect(() => { fetchSpecials(); }, [fetchSpecials]);
  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(restaurantSearch.toLowerCase())
  ).slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant || !formData.name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/holiday-specials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: selectedRestaurant.id,
          holiday_tag: 'st-patricks-2026',
          name: formData.name,
          description: formData.description || null,
          category: formData.category,
          event_date: '2026-03-17',
          start_time: formData.start_time || null,
          end_time: formData.end_time || null,
          original_price: formData.original_price ? parseFloat(formData.original_price) : null,
          special_price: formData.special_price ? parseFloat(formData.special_price) : null,
          discount_description: formData.discount_description || null,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({ name: '', description: '', category: 'drink', start_time: '', end_time: '', original_price: '', special_price: '', discount_description: '' });
        setSelectedRestaurant(null);
        setRestaurantSearch('');
        fetchSpecials();
      }
    } catch (err) {
      console.error('Failed to create special:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this special?')) return;
    try {
      await fetch(`/api/admin/holiday-specials?id=${id}`, { method: 'DELETE' });
      fetchSpecials();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const drinkSpecials = specials.filter(s => s.category === 'drink');
  const foodSpecials = specials.filter(s => s.category === 'food');
  const otherSpecials = specials.filter(s => s.category !== 'drink' && s.category !== 'food');

  return (
    <div className="min-h-screen bg-[#0A3D0A] text-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="text-4xl">&#9752;</span>
              St. Patrick&apos;s Day 2026
              <span className="text-4xl">&#9752;</span>
            </h1>
            <p className="text-emerald-300 mt-1">
              March 17, 2026 &middot; {specials.length} specials from {new Set(specials.map(s => s.restaurant_id)).size} bars
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C9A227] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Special
          </button>
        </div>

        {/* Market Filter */}
        <div className="flex gap-2 mb-6">
          {[
            { value: 'all', label: 'All Markets' },
            { value: 'lancaster-pa', label: 'Lancaster' },
            { value: 'cumberland-pa', label: 'Cumberland' },
            { value: 'fayetteville-nc', label: 'Fayetteville' },
          ].map(m => (
            <button
              key={m.value}
              onClick={() => setMarketFilter(m.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                marketFilter === m.value
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Add Special Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-[#1A2E1A] border border-emerald-800 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-emerald-300 mb-4">Add St. Patrick&apos;s Day Special</h2>

            {/* Restaurant Search */}
            <div className="mb-4">
              <label className="block text-sm text-emerald-400 mb-1">Restaurant / Bar</label>
              {selectedRestaurant ? (
                <div className="flex items-center justify-between bg-emerald-900/30 px-4 py-2 rounded-lg">
                  <span className="font-medium">{selectedRestaurant.name}</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedRestaurant(null); setRestaurantSearch(''); }}
                    className="text-emerald-400 hover:text-white text-sm"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-emerald-500" />
                  <input
                    type="text"
                    value={restaurantSearch}
                    onChange={e => setRestaurantSearch(e.target.value)}
                    placeholder="Search restaurants..."
                    className="w-full pl-9 pr-4 py-2 bg-emerald-900/30 border border-emerald-700 rounded-lg text-white placeholder-emerald-600 focus:border-emerald-500 focus:outline-none"
                  />
                  {restaurantSearch.length >= 2 && filteredRestaurants.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-[#1A2E1A] border border-emerald-700 rounded-lg max-h-48 overflow-y-auto">
                      {filteredRestaurants.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => { setSelectedRestaurant(r); setRestaurantSearch(''); }}
                          className="w-full text-left px-4 py-2 hover:bg-emerald-900/50 text-sm"
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Special Name */}
              <div>
                <label className="block text-sm text-emerald-400 mb-1">Special Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. $3 Green Beer"
                  required
                  className="w-full px-4 py-2 bg-emerald-900/30 border border-emerald-700 rounded-lg text-white placeholder-emerald-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm text-emerald-400 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-4 py-2 bg-emerald-900/30 border border-emerald-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="drink">Drink Special</option>
                  <option value="food">Food Special</option>
                  <option value="combo">Combo Deal</option>
                  <option value="entertainment">Entertainment</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm text-emerald-400 mb-1">Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Green beer, Irish car bombs, Shamrock shots..."
                rows={2}
                className="w-full px-4 py-2 bg-emerald-900/30 border border-emerald-700 rounded-lg text-white placeholder-emerald-600 focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm text-emerald-400 mb-1">Start Time</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={e => setFormData(f => ({ ...f, start_time: e.target.value }))}
                  className="w-full px-4 py-2 bg-emerald-900/30 border border-emerald-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-emerald-400 mb-1">End Time</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={e => setFormData(f => ({ ...f, end_time: e.target.value }))}
                  className="w-full px-4 py-2 bg-emerald-900/30 border border-emerald-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-emerald-400 mb-1">Original Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.original_price}
                  onChange={e => setFormData(f => ({ ...f, original_price: e.target.value }))}
                  placeholder="$0.00"
                  className="w-full px-4 py-2 bg-emerald-900/30 border border-emerald-700 rounded-lg text-white placeholder-emerald-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-emerald-400 mb-1">Special Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.special_price}
                  onChange={e => setFormData(f => ({ ...f, special_price: e.target.value }))}
                  placeholder="$0.00"
                  className="w-full px-4 py-2 bg-emerald-900/30 border border-emerald-700 rounded-lg text-white placeholder-emerald-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-emerald-400 mb-1">Discount Description (optional)</label>
              <input
                type="text"
                value={formData.discount_description}
                onChange={e => setFormData(f => ({ ...f, discount_description: e.target.value }))}
                placeholder="e.g. BOGO, 50% off, $2 off"
                className="w-full px-4 py-2 bg-emerald-900/30 border border-emerald-700 rounded-lg text-white placeholder-emerald-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || !selectedRestaurant || !formData.name.trim()}
                className="px-6 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C9A227] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Adding...' : 'Add Special'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-emerald-900/50 text-emerald-300 rounded-lg hover:bg-emerald-800/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1A2E1A] border border-emerald-800 rounded-xl p-4 text-center">
            <Beer className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-emerald-300">{drinkSpecials.length}</div>
            <div className="text-xs text-emerald-500">Drink Specials</div>
          </div>
          <div className="bg-[#1A2E1A] border border-emerald-800 rounded-xl p-4 text-center">
            <UtensilsCrossed className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-emerald-300">{foodSpecials.length}</div>
            <div className="text-xs text-emerald-500">Food Specials</div>
          </div>
          <div className="bg-[#1A2E1A] border border-emerald-800 rounded-xl p-4 text-center">
            <Music className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-emerald-300">{otherSpecials.length}</div>
            <div className="text-xs text-emerald-500">Entertainment / Combos</div>
          </div>
        </div>

        {/* Specials List */}
        {loading ? (
          <div className="text-center py-12 text-emerald-400">Loading specials...</div>
        ) : specials.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">&#9752;</div>
            <h3 className="text-xl font-semibold text-emerald-300 mb-2">No specials yet</h3>
            <p className="text-emerald-500">Add St. Patrick&apos;s Day specials from your partner bars.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {specials.map(special => {
              const Icon = CATEGORY_ICONS[special.category] || Beer;
              return (
                <div
                  key={special.id}
                  className="bg-[#1A2E1A] border border-emerald-800 rounded-xl p-4 hover:border-emerald-600 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-900/50 rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <span className="text-xs text-emerald-500 uppercase tracking-wide">
                          {CATEGORY_LABELS[special.category] || special.category}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(special.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">{special.name}</h3>
                  <p className="text-sm text-emerald-400 font-medium mb-2">
                    {special.restaurant.name}
                  </p>

                  {special.description && (
                    <p className="text-sm text-emerald-300/70 mb-2">{special.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    {special.special_price && (
                      <span className="text-[#D4AF37] font-bold">
                        ${Number(special.special_price).toFixed(2)}
                        {special.original_price && (
                          <span className="text-emerald-600 line-through ml-1 font-normal">
                            ${Number(special.original_price).toFixed(2)}
                          </span>
                        )}
                      </span>
                    )}
                    {special.discount_description && (
                      <span className="bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded-full text-xs">
                        {special.discount_description}
                      </span>
                    )}
                    {special.start_time && (
                      <span className="text-emerald-500 text-xs">
                        {special.start_time.slice(0, 5)}{special.end_time ? ` - ${special.end_time.slice(0, 5)}` : '+'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
