'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Beer, UtensilsCrossed, Music, Package, Search, Pencil, X, Eye, Users, MousePointer, BarChart3 } from 'lucide-react';

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

interface AnalyticsData {
  summary: {
    totalImpressions: number;
    uniqueVisitors: number;
    screenViews: number;
    uniqueScreenVisitors: number;
    teaserClicks: number;
  };
  perRestaurant: {
    restaurantId: string;
    restaurantName: string;
    impressions: number;
    uniqueViewers: number;
    avgPosition: number | null;
  }[];
  dailyTrend: { date: string; count: number }[];
}

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'drink',
  event_date: '2026-03-17',
  start_time: '',
  end_time: '',
  original_price: '',
  special_price: '',
  discount_description: '',
};

export default function StPatricksDayPage() {
  const [specials, setSpecials] = useState<HolidaySpecial[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'specials' | 'analytics'>('specials');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/admin/holiday-specials/analytics?section_name=st_patricks_day');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics' && !analytics) {
      fetchAnalytics();
    }
  }, [activeTab, analytics, fetchAnalytics]);

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

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setSelectedRestaurant(null);
    setRestaurantSearch('');
  };

  const handleEdit = (special: HolidaySpecial) => {
    setEditingId(special.id);
    setSelectedRestaurant({ id: special.restaurant.id, name: special.restaurant.name, market_id: special.restaurant.market_id });
    setFormData({
      name: special.name,
      description: special.description || '',
      category: special.category,
      event_date: special.event_date,
      start_time: special.start_time?.slice(0, 5) || '',
      end_time: special.end_time?.slice(0, 5) || '',
      original_price: special.original_price != null ? String(special.original_price) : '',
      special_price: special.special_price != null ? String(special.special_price) : '',
      discount_description: special.discount_description || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant || !formData.name.trim()) return;

    setSubmitting(true);
    try {
      if (editingId) {
        // Update existing
        const res = await fetch('/api/admin/holiday-specials', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            name: formData.name,
            description: formData.description || null,
            category: formData.category,
            event_date: formData.event_date,
            start_time: formData.start_time || null,
            end_time: formData.end_time || null,
            original_price: formData.original_price ? parseFloat(formData.original_price) : null,
            special_price: formData.special_price ? parseFloat(formData.special_price) : null,
            discount_description: formData.discount_description || null,
          }),
        });
        if (res.ok) {
          resetForm();
          fetchSpecials();
        }
      } else {
        // Create new
        const res = await fetch('/api/admin/holiday-specials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurant_id: selectedRestaurant.id,
            holiday_tag: 'st-patricks-2026',
            name: formData.name,
            description: formData.description || null,
            category: formData.category,
            event_date: formData.event_date,
            start_time: formData.start_time || null,
            end_time: formData.end_time || null,
            original_price: formData.original_price ? parseFloat(formData.original_price) : null,
            special_price: formData.special_price ? parseFloat(formData.special_price) : null,
            discount_description: formData.discount_description || null,
          }),
        });
        if (res.ok) {
          resetForm();
          fetchSpecials();
        }
      }
    } catch (err) {
      console.error('Failed to save special:', err);
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

  // Build date range subtitle from actual specials
  const dateSubtitle = (() => {
    if (!specials.length) return 'March 17, 2026';
    const days = Array.from(new Set(specials.map(s => s.event_date))).sort();
    if (days.length === 1) {
      const d = new Date(days[0] + 'T12:00:00');
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    const first = new Date(days[0] + 'T12:00:00');
    const last = new Date(days[days.length - 1] + 'T12:00:00');
    return `${first.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  })();

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
              {dateSubtitle} &middot; {specials.length} specials from {new Set(specials.map(s => s.restaurant_id)).size} bars
            </p>
          </div>
          {activeTab === 'specials' && (
            <button
              onClick={() => { if (showForm) { resetForm(); } else { setShowForm(true); } }}
              className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C9A227] transition-colors"
            >
              {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {showForm ? 'Close' : 'Add Special'}
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 bg-zinc-900/50 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('specials')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'specials'
                ? 'bg-[#D4AF37] text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            &#9752; Specials
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-[#D4AF37] text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
        </div>

        {/* ═══ ANALYTICS TAB ═══ */}
        {activeTab === 'analytics' && (
          <div>
            {analyticsLoading ? (
              <div className="text-center py-12 text-zinc-400">Loading analytics...</div>
            ) : !analytics ? (
              <div className="text-center py-12 text-zinc-500">No analytics data available yet.</div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-zinc-400 mb-2">
                      <Eye className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider font-medium">Impressions</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{analytics.summary.totalImpressions.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500 mt-1">Restaurant views in the app</p>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-zinc-400 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider font-medium">Unique Visitors</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{analytics.summary.uniqueVisitors.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500 mt-1">Distinct users who viewed</p>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-zinc-400 mb-2">
                      <Eye className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider font-medium">Screen Views</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{analytics.summary.screenViews.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500 mt-1">Times specials page opened</p>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-zinc-400 mb-2">
                      <MousePointer className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider font-medium">Teaser Taps</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{analytics.summary.teaserClicks.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500 mt-1">Taps from the Move tab</p>
                  </div>
                </div>

                {/* Daily Trend */}
                {analytics.dailyTrend.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 mb-8">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">Daily Impressions</h3>
                    <div className="flex items-end gap-1 h-32">
                      {(() => {
                        const maxCount = Math.max(...analytics.dailyTrend.map(d => d.count), 1);
                        return analytics.dailyTrend.slice(-14).map((day) => (
                          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full bg-[#2ECC40]/60 rounded-t hover:bg-[#2ECC40] transition-colors"
                              style={{ height: `${Math.max((day.count / maxCount) * 100, 4)}%` }}
                              title={`${day.date}: ${day.count} impressions`}
                            />
                            <span className="text-[9px] text-zinc-600 rotate-[-45deg] whitespace-nowrap origin-top-left translate-y-2">
                              {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Per-Restaurant Table */}
                {analytics.perRestaurant.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-700">
                      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Performance by Restaurant</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                            <th className="text-left px-4 py-3 font-medium">Restaurant</th>
                            <th className="text-right px-4 py-3 font-medium">Impressions</th>
                            <th className="text-right px-4 py-3 font-medium">Unique Viewers</th>
                            <th className="text-right px-4 py-3 font-medium">Avg Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.perRestaurant.map((r) => (
                            <tr key={r.restaurantId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                              <td className="px-4 py-3 font-medium text-white">{r.restaurantName}</td>
                              <td className="px-4 py-3 text-right text-zinc-300">{r.impressions.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-zinc-400">{r.uniqueViewers.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-zinc-500">{r.avgPosition != null ? `#${r.avgPosition}` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {analytics.perRestaurant.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">&#9752;</div>
                    <p className="text-zinc-400">No impression data yet. Data will appear once users view specials in the app.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ SPECIALS TAB ═══ */}
        {activeTab === 'specials' && <>

        {/* Example Card Preview — shows what it looks like in the app */}
        {!showForm && (
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
        )}

        {/* Add / Edit Special Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">
              {editingId ? 'Edit Special' : 'Add St. Patrick\u2019s Day Special'}
            </h2>

            {/* Restaurant Search */}
            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-1">Restaurant / Bar</label>
              {selectedRestaurant ? (
                <div className="flex items-center justify-between bg-zinc-800 px-4 py-2 rounded-lg">
                  <span className="font-medium">{selectedRestaurant.name}</span>
                  {!editingId && (
                    <button
                      type="button"
                      onClick={() => { setSelectedRestaurant(null); setRestaurantSearch(''); }}
                      className="text-zinc-400 hover:text-white text-sm"
                    >
                      Change
                    </button>
                  )}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

              {/* Event Date */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Event Date</label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={e => setFormData(f => ({ ...f, event_date: e.target.value }))}
                  required
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:border-zinc-400 focus:outline-none"
                />
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
                {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Add Special'}
              </button>
              <button
                type="button"
                onClick={resetForm}
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => handleEdit(special)}
                        className="text-zinc-400 hover:text-white p-1"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(special.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">{special.name}</h3>
                  <p className="text-sm text-zinc-400 font-medium mb-2">
                    {special.restaurant.name}
                  </p>

                  {special.description && (
                    <p className="text-sm text-zinc-500 mb-2">{special.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="text-emerald-400 text-xs font-medium">
                      {new Date(special.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
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

        </>}
      </div>
    </div>
  );
}
