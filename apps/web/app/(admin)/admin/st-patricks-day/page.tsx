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

  const fetchSpecials = useCallback(async () => {
    try {
      const params = new URLSearchParams({ holiday_tag: 'st-patricks-2026' });
      const res = await fetch(`/api/admin/holiday-specials?${params}`);
      const data = await res.json();
      setSpecials(data.specials || []);
    } catch (err) {
      console.error('Failed to fetch specials:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
  );

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

        {/* Example Card Preview — shows what it looks like in the app */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">
            &#9752; How it looks in the app
          </h2>
          <div className="max-w-sm mx-auto">
            <div className="relative bg-[#0F2B0F] border-2 border-[#D4AF37] rounded-2xl p-5 py-6 overflow-hidden shadow-[0_0_12px_rgba(212,175,55,0.15)]">
              {/* Corner decorations */}
              <span className="absolute top-1 left-1.5 text-lg text-[#D4AF37]/50 font-light">&#9556;</span>
              <span className="absolute top-1 right-1.5 text-lg text-[#D4AF37]/50 font-light">&#9559;</span>
              <span className="absolute bottom-1 left-1.5 text-lg text-[#D4AF37]/50 font-light">&#9562;</span>
              <span className="absolute bottom-1 right-1.5 text-lg text-[#D4AF37]/50 font-light">&#9565;</span>

              {/* Background shamrocks */}
              <span className="absolute top-5 right-4 text-6xl opacity-[0.04] rotate-[15deg]">&#9752;</span>
              <span className="absolute bottom-4 left-3 text-5xl opacity-[0.03] -rotate-[25deg]">&#9752;</span>

              {/* Holiday label */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-px bg-[#D4AF37]/30" />
                <span className="text-[10px] font-bold text-[#D4AF37]/40 tracking-[3px]">ST. PATRICK&apos;S DAY 2026</span>
                <div className="flex-1 h-px bg-[#D4AF37]/30" />
              </div>

              {/* Bar name */}
              <h3 className="text-2xl font-black text-[#D4AF37] text-center uppercase tracking-tight leading-tight">
                Restaurant Name
              </h3>

              {/* Gold rule */}
              <div className="flex items-center gap-2 my-2.5 px-1">
                <div className="flex-1 h-px bg-[#D4AF37]/30" />
                <span className="text-[10px] text-[#D4AF37]/40">&#9752;</span>
                <div className="flex-1 h-px bg-[#D4AF37]/30" />
              </div>

              {/* Example specials */}
              <div className="text-center py-2">
                <div className="flex items-center justify-center gap-2.5">
                  <span className="text-3xl font-black text-[#D4AF37] leading-none" style={{ textShadow: '0 1px 4px rgba(212,175,55,0.3)' }}>$3</span>
                  <span className="text-lg font-bold text-[#E8F5E8] uppercase tracking-wide">Green Beer</span>
                </div>
              </div>

              <div className="h-px bg-[#2ECC40]/10 my-1" />

              <div className="text-center py-2">
                <span className="text-lg font-extrabold text-[#E8F5E8] uppercase tracking-wider">Corned Beef &amp; Cabbage</span>
                <p className="text-[11px] text-[#5A8A5A] italic tracking-wide mt-1">Traditional Irish dinner plate</p>
              </div>

              {/* Gold rule */}
              <div className="flex items-center gap-2 my-2.5 px-1">
                <div className="flex-1 h-px bg-[#D4AF37]/30" />
                <span className="text-[10px] text-[#D4AF37]/40">&#9752;</span>
                <div className="flex-1 h-px bg-[#D4AF37]/30" />
              </div>

              {/* Branding */}
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[10px] font-semibold text-[#D4AF37]/40 uppercase tracking-[2px]">TasteLanc</span>
                <span className="text-[10px] text-[#D4AF37]/40">&middot;</span>
                <span className="text-[10px] font-semibold text-[#D4AF37]/40 uppercase tracking-[2px]">March 17th</span>
              </div>
            </div>
            <p className="text-xs text-emerald-500/60 text-center mt-2 italic">
              Each restaurant&apos;s specials appear as a poster card like this in the app
            </p>
          </div>
        </div>

        {/* Add Special Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">Add St. Patrick&apos;s Day Special</h2>

            {/* Restaurant Search */}
            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-1">Restaurant / Bar</label>
              {selectedRestaurant ? (
                <div className="flex items-center justify-between bg-zinc-800 px-4 py-2 rounded-lg">
                  <span className="font-medium">{selectedRestaurant.name}</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedRestaurant(null); setRestaurantSearch(''); }}
                    className="text-zinc-400 hover:text-white text-sm"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={restaurantSearch}
                    onChange={e => setRestaurantSearch(e.target.value)}
                    placeholder="Search restaurants..."
                    className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
                  />
                  {restaurantSearch.length >= 2 && filteredRestaurants.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-600 rounded-lg max-h-48 overflow-y-auto">
                      {filteredRestaurants.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => { setSelectedRestaurant(r); setRestaurantSearch(''); }}
                          className="w-full text-left px-4 py-2 hover:bg-zinc-800 text-sm"
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
                <label className="block text-sm text-zinc-400 mb-1">Special Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. $3 Green Beer"
                  required
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:border-zinc-400 focus:outline-none"
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
              <label className="block text-sm text-zinc-400 mb-1">Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Green beer, Irish car bombs, Shamrock shots..."
                rows={2}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Start Time</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={e => setFormData(f => ({ ...f, start_time: e.target.value }))}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:border-zinc-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">End Time</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={e => setFormData(f => ({ ...f, end_time: e.target.value }))}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:border-zinc-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Original Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.original_price}
                  onChange={e => setFormData(f => ({ ...f, original_price: e.target.value }))}
                  placeholder="$0.00"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Special Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.special_price}
                  onChange={e => setFormData(f => ({ ...f, special_price: e.target.value }))}
                  placeholder="$0.00"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-1">Discount Description (optional)</label>
              <input
                type="text"
                value={formData.discount_description}
                onChange={e => setFormData(f => ({ ...f, discount_description: e.target.value }))}
                placeholder="e.g. BOGO, 50% off, $2 off"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
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
                className="px-6 py-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Specials List */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading specials...</div>
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
                  className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 hover:border-zinc-500 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div>
                        <span className="text-xs text-zinc-500 uppercase tracking-wide">
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
                  <p className="text-sm text-zinc-400 font-medium mb-2">
                    {special.restaurant.name}
                  </p>

                  {special.description && (
                    <p className="text-sm text-zinc-500 mb-2">{special.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    {special.special_price && (
                      <span className="text-[#D4AF37] font-bold">
                        ${Number(special.special_price).toFixed(2)}
                        {special.original_price && (
                          <span className="text-zinc-600 line-through ml-1 font-normal">
                            ${Number(special.original_price).toFixed(2)}
                          </span>
                        )}
                      </span>
                    )}
                    {special.discount_description && (
                      <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-xs">
                        {special.discount_description}
                      </span>
                    )}
                    {special.start_time && (
                      <span className="text-zinc-500 text-xs">
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
