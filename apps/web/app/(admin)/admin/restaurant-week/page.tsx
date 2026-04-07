'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Beer, UtensilsCrossed, Music, Package, Search, Pencil, X, Eye, Users, MousePointer, BarChart3, FileText, Check, Loader2 } from 'lucide-react';

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
    rw_description: string | null;
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

// Default to first day of Restaurant Week
const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'food',
  event_date: '2026-04-13',
  start_time: '',
  end_time: '',
  original_price: '',
  special_price: '',
  discount_description: '',
};

interface SpecialRow {
  name: string;
  category: string;
  special_price: string;
  description: string;
}

const EMPTY_ROW: SpecialRow = { name: '', category: 'food', special_price: '', description: '' };

// Restaurant Week date options (April 13–19, 2026)
const RW_DATES = [
  { value: '2026-04-13', label: 'Mon Apr 13' },
  { value: '2026-04-14', label: 'Tue Apr 14' },
  { value: '2026-04-15', label: 'Wed Apr 15' },
  { value: '2026-04-16', label: 'Thu Apr 16' },
  { value: '2026-04-17', label: 'Fri Apr 17' },
  { value: '2026-04-18', label: 'Sat Apr 18' },
  { value: '2026-04-19', label: 'Sun Apr 19' },
];

export default function RestaurantWeekPage() {
  const [specials, setSpecials] = useState<HolidaySpecial[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [multiRows, setMultiRows] = useState<SpecialRow[]>([{ ...EMPTY_ROW }]);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'specials' | 'descriptions' | 'analytics'>('specials');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [editingDescValue, setEditingDescValue] = useState('');
  const [savingDescId, setSavingDescId] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/admin/holiday-specials/analytics?section_name=restaurant_week');
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
      const params = new URLSearchParams({ holiday_tag: 'restaurant-week-2026' });
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

  // Group specials by restaurant for the descriptions tab
  const restaurantDescriptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; rw_description: string | null; dealCount: number }>();
    for (const s of specials) {
      const existing = map.get(s.restaurant.id);
      if (existing) {
        existing.dealCount++;
      } else {
        map.set(s.restaurant.id, {
          id: s.restaurant.id,
          name: s.restaurant.name,
          rw_description: s.restaurant.rw_description,
          dealCount: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [specials]);

  const handleSaveDescription = async (restaurantId: string) => {
    setSavingDescId(restaurantId);
    try {
      const res = await fetch('/api/admin/holiday-specials/rw-description', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId, rw_description: editingDescValue.trim() || null }),
      });
      if (res.ok) {
        // Update local state so the change is reflected immediately
        setSpecials(prev => prev.map(s =>
          s.restaurant.id === restaurantId
            ? { ...s, restaurant: { ...s.restaurant, rw_description: editingDescValue.trim() || null } }
            : s
        ));
        setEditingDescId(null);
        setEditingDescValue('');
      }
    } catch (err) {
      console.error('Failed to save description:', err);
    } finally {
      setSavingDescId(null);
    }
  };

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(restaurantSearch.toLowerCase())
  );

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setMultiRows([{ ...EMPTY_ROW }]);
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
    if (!selectedRestaurant) return;

    setSubmitting(true);
    try {
      if (editingId) {
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
        const validRows = multiRows.filter(r => r.name.trim());
        if (validRows.length === 0) return;

        for (const row of validRows) {
          await fetch('/api/admin/holiday-specials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurant_id: selectedRestaurant.id,
              holiday_tag: 'restaurant-week-2026',
              name: row.name,
              description: row.description || null,
              category: row.category,
              event_date: formData.event_date,
              start_time: formData.start_time || null,
              end_time: formData.end_time || null,
              original_price: null,
              special_price: row.special_price ? parseFloat(row.special_price) : null,
              discount_description: null,
            }),
          });
        }
        resetForm();
        fetchSpecials();
      }
    } catch (err) {
      console.error('Failed to save special:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this deal?')) return;
    try {
      await fetch(`/api/admin/holiday-specials?id=${id}`, { method: 'DELETE' });
      fetchSpecials();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const dateSubtitle = (() => {
    if (!specials.length) return 'April 13–19, 2026';
    const days = Array.from(new Set(specials.map(s => s.event_date))).sort();
    if (days.length === 1) {
      const d = new Date(days[0] + 'T12:00:00');
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    const first = new Date(days[0] + 'T12:00:00');
    const last = new Date(days[days.length - 1] + 'T12:00:00');
    return `${first.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  })();

  const uniqueRestaurantCount = new Set(specials.map(s => s.restaurant_id)).size;

  return (
    <div className="min-h-screen bg-[#1A0C08] text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="text-4xl">🍽️</span>
              Lancaster Restaurant Week 2026
              <span className="text-4xl">🍴</span>
            </h1>
            <p className="text-[#C8532A] mt-1">
              {dateSubtitle} &middot; {specials.length} deals from {uniqueRestaurantCount} restaurants
            </p>
            <p className="text-zinc-500 text-sm mt-0.5">Collaborating with Lancaster Restaurant Week 2026</p>
          </div>
          {activeTab === 'specials' && (
            <button
              onClick={() => { if (showForm) { resetForm(); } else { setShowForm(true); } }}
              className="flex items-center gap-2 px-4 py-2 bg-[#C8532A] text-white font-semibold rounded-lg hover:bg-[#A84020] transition-colors"
            >
              {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {showForm ? 'Close' : 'Add Deal'}
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 bg-zinc-900/50 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('specials')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'specials'
                ? 'bg-[#C8532A] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🍽️ Deals
          </button>
          <button
            onClick={() => setActiveTab('descriptions')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'descriptions'
                ? 'bg-[#C8532A] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Descriptions
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-[#C8532A] text-white'
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
                    <p className="text-xs text-zinc-500 mt-1">Times deals page opened</p>
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
                              className="w-full bg-[#C8532A]/60 rounded-t hover:bg-[#C8532A] transition-colors"
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
                    <div className="text-4xl mb-3">🍽️</div>
                    <p className="text-zinc-400">No impression data yet. Data will appear once users view deals in the app.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ DESCRIPTIONS TAB ═══ */}
        {activeTab === 'descriptions' && (
          <div>
            <div className="mb-4">
              <p className="text-zinc-400 text-sm">
                These descriptions appear on the <strong className="text-zinc-300">back of the flipped card</strong> in the app. Tap a card to flip it and see the &ldquo;About&rdquo; section — this is where the description shows.
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12 text-zinc-400">Loading...</div>
            ) : restaurantDescriptions.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📝</div>
                <p className="text-zinc-400">No participating restaurants yet. Add deals first in the Deals tab.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {restaurantDescriptions.map((r) => {
                  const isEditing = editingDescId === r.id;
                  const isSaving = savingDescId === r.id;
                  return (
                    <div key={r.id} className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{r.name}</h3>
                          <span className="text-xs text-zinc-500">{r.dealCount} deal{r.dealCount !== 1 ? 's' : ''}</span>
                        </div>
                        {!isEditing && (
                          <button
                            onClick={() => { setEditingDescId(r.id); setEditingDescValue(r.rw_description || ''); }}
                            className="flex items-center gap-1.5 text-sm text-[#C8532A] hover:text-[#D96B40] transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            {r.rw_description ? 'Edit' : 'Add Description'}
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div>
                          <textarea
                            value={editingDescValue}
                            onChange={e => setEditingDescValue(e.target.value)}
                            rows={4}
                            placeholder="Write a description for this restaurant's Restaurant Week participation. This shows when users flip the card in the app."
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-[#C8532A] focus:outline-none resize-y text-sm leading-relaxed"
                          />
                          <div className="flex items-center gap-3 mt-3">
                            <button
                              onClick={() => handleSaveDescription(r.id)}
                              disabled={isSaving}
                              className="flex items-center gap-2 px-4 py-2 bg-[#C8532A] text-white font-semibold rounded-lg hover:bg-[#A84020] disabled:opacity-50 transition-colors text-sm"
                            >
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => { setEditingDescId(null); setEditingDescValue(''); }}
                              className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors text-sm"
                            >
                              Cancel
                            </button>
                            <span className="text-xs text-zinc-600 ml-auto">{editingDescValue.length} chars</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {r.rw_description ? (
                            <p className="text-sm text-zinc-300 leading-relaxed">{r.rw_description}</p>
                          ) : (
                            <p className="text-sm text-zinc-600 italic">No description — a generic fallback will show in the app.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ SPECIALS TAB ═══ */}
        {activeTab === 'specials' && <>

        {/* App Preview Card */}
        {!showForm && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#C8532A] uppercase tracking-wider mb-3">
              🍽️ How it looks in the app
            </h2>
            <div className="max-w-sm mx-auto">
              <div className="relative bg-[#241008] border-2 border-[#C8532A] rounded-2xl p-5 py-6 overflow-hidden shadow-[0_0_12px_rgba(200,83,42,0.18)]">
                {/* Corner decorations */}
                <span className="absolute top-1 left-1.5 text-lg text-[#C8532A]/45 font-light">&#9556;</span>
                <span className="absolute top-1 right-1.5 text-lg text-[#C8532A]/45 font-light">&#9559;</span>
                <span className="absolute bottom-1 left-1.5 text-lg text-[#C8532A]/45 font-light">&#9562;</span>
                <span className="absolute bottom-1 right-1.5 text-lg text-[#C8532A]/45 font-light">&#9565;</span>

                {/* Background */}
                <span className="absolute top-5 right-4 text-6xl opacity-[0.04] rotate-[15deg]">🍽️</span>
                <span className="absolute bottom-4 left-3 text-5xl opacity-[0.03] -rotate-[25deg]">🍴</span>

                {/* Event label */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-px bg-[#C8532A]/30" />
                  <span className="text-[10px] font-bold text-[#C8532A]/40 tracking-[3px]">RESTAURANT WEEK 2026</span>
                  <div className="flex-1 h-px bg-[#C8532A]/30" />
                </div>

                {/* Restaurant name */}
                <h3 className="text-2xl font-black text-[#F0D060] text-center uppercase tracking-tight leading-tight">
                  Restaurant Name
                </h3>

                {/* Rule */}
                <div className="flex items-center gap-2 my-2.5 px-1">
                  <div className="flex-1 h-px bg-[#C8532A]/30" />
                  <span className="text-[10px] text-[#C8532A]/40">🍴</span>
                  <div className="flex-1 h-px bg-[#C8532A]/30" />
                </div>

                {/* Example deals */}
                <div className="text-center py-2">
                  <div className="flex items-center justify-center gap-2.5">
                    <span className="text-3xl font-black text-[#F0D060] leading-none" style={{ textShadow: '0 1px 4px rgba(240,208,96,0.3)' }}>$35</span>
                    <span className="text-lg font-bold text-[#FFF8F0] uppercase tracking-wide">Prix Fixe Menu</span>
                  </div>
                </div>

                <div className="h-px bg-[#C8532A]/10 my-1" />

                <div className="text-center py-2">
                  <span className="text-lg font-extrabold text-[#FFF8F0] uppercase tracking-wider">3-Course Dinner</span>
                  <p className="text-[11px] text-[#7A5030] italic tracking-wide mt-1">Appetizer, entrée, and dessert</p>
                </div>

                {/* Rule */}
                <div className="flex items-center gap-2 my-2.5 px-1">
                  <div className="flex-1 h-px bg-[#C8532A]/30" />
                  <span className="text-[10px] text-[#C8532A]/40">🍴</span>
                  <div className="flex-1 h-px bg-[#C8532A]/30" />
                </div>

                {/* Branding */}
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-[10px] font-semibold text-[#C8532A]/40 uppercase tracking-[2px]">TasteLanc</span>
                  <span className="text-[10px] text-[#C8532A]/40">&middot;</span>
                  <span className="text-[10px] font-semibold text-[#C8532A]/40 uppercase tracking-[2px]">Apr 13–19</span>
                </div>

                {/* Collaboration badge */}
                <div className="flex justify-center mt-2.5">
                  <span className="text-[9px] font-bold text-[#C8532A] tracking-[2px] uppercase bg-[#C8532A]/15 border border-[#C8532A]/40 rounded-full px-3 py-1">
                    IN PARTNERSHIP WITH LCRW
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#C8532A]/50 text-center mt-2 italic">
                Each restaurant&apos;s deals appear as a poster card like this in the app
              </p>
            </div>
          </div>
        )}

        {/* Add / Edit Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">
              {editingId ? 'Edit Deal' : 'Add Restaurant Week Deal'}
            </h2>

            {/* Restaurant Search */}
            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-1">Restaurant</label>
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

            {editingId ? (
              /* Single-deal edit form */
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Deal Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. $35 Prix Fixe Menu"
                      required
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:border-zinc-400 focus:outline-none"
                    >
                      <option value="food">Food Special</option>
                      <option value="drink">Drink Special</option>
                      <option value="combo">Combo Deal</option>
                      <option value="entertainment">Entertainment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Event Date</label>
                    <select
                      value={formData.event_date}
                      onChange={e => setFormData(f => ({ ...f, event_date: e.target.value }))}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:border-zinc-400 focus:outline-none"
                    >
                      {RW_DATES.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Special Price (optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.special_price}
                      onChange={e => setFormData(f => ({ ...f, special_price: e.target.value }))}
                      placeholder="$0.00"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Original Price (optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.original_price}
                      onChange={e => setFormData(f => ({ ...f, original_price: e.target.value }))}
                      placeholder="$0.00"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Start Time (optional)</label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={e => setFormData(f => ({ ...f, start_time: e.target.value }))}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:border-zinc-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">End Time (optional)</label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={e => setFormData(f => ({ ...f, end_time: e.target.value }))}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:border-zinc-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Description (optional)</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                      placeholder="e.g. 3-course dinner — appetizer, entrée, dessert"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Discount Description (optional)</label>
                    <input
                      type="text"
                      value={formData.discount_description}
                      onChange={e => setFormData(f => ({ ...f, discount_description: e.target.value }))}
                      placeholder="e.g. 50% off, BOGO"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Multi-deal add form */
              <>
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-zinc-400">Deals</label>
                    <span className="text-xs text-zinc-500">Add all deals for this restaurant at once</span>
                  </div>
                  {multiRows.map((row, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                      <input
                        type="text"
                        value={row.name}
                        onChange={e => {
                          const updated = [...multiRows];
                          updated[i] = { ...updated[i], name: e.target.value };
                          setMultiRows(updated);
                        }}
                        placeholder="e.g. $35 Prix Fixe Menu"
                        className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none text-sm"
                      />
                      <select
                        value={row.category}
                        onChange={e => {
                          const updated = [...multiRows];
                          updated[i] = { ...updated[i], category: e.target.value };
                          setMultiRows(updated);
                        }}
                        className="w-32 px-2 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-sm focus:border-zinc-400 focus:outline-none"
                      >
                        <option value="food">Food</option>
                        <option value="drink">Drink</option>
                        <option value="combo">Combo</option>
                        <option value="entertainment">Event</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={row.special_price}
                        onChange={e => {
                          const updated = [...multiRows];
                          updated[i] = { ...updated[i], special_price: e.target.value };
                          setMultiRows(updated);
                        }}
                        placeholder="Price"
                        className="w-24 px-2 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none text-sm"
                      />
                      {multiRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMultiRows(multiRows.filter((_, j) => j !== i))}
                          className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMultiRows([...multiRows, { ...EMPTY_ROW }])}
                    className="flex items-center gap-1.5 text-sm text-[#C8532A] hover:text-[#D96B40] mt-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add another deal
                  </button>
                </div>
              </>
            )}

            {/* Add-only: Event Date + Times (edit form has its own inline) */}
            {!editingId && <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 mt-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Event Date</label>
                <select
                  value={formData.event_date}
                  onChange={e => setFormData(f => ({ ...f, event_date: e.target.value }))}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:border-zinc-400 focus:outline-none"
                >
                  {RW_DATES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Start Time (optional)</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={e => setFormData(f => ({ ...f, start_time: e.target.value }))}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:border-zinc-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">End Time (optional)</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={e => setFormData(f => ({ ...f, end_time: e.target.value }))}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:border-zinc-400 focus:outline-none"
                />
              </div>
            </div>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || !selectedRestaurant || (!editingId && !multiRows.some(r => r.name.trim()))}
                className="px-6 py-2 bg-[#C8532A] text-white font-semibold rounded-lg hover:bg-[#A84020] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Add Deal'}
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

        {/* Deals List */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading deals...</div>
        ) : specials.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-[#C8532A] mb-2">No deals yet</h3>
            <p className="text-zinc-500">Add Restaurant Week deals from participating restaurants.</p>
            <p className="text-zinc-600 text-sm mt-2">Restaurant Week runs April 13–19, 2026</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {specials.map(special => {
              const Icon = CATEGORY_ICONS[special.category] || UtensilsCrossed;
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
                    <span className="text-[#C8532A] text-xs font-medium">
                      {new Date(special.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {special.special_price && (
                      <span className="text-[#F0D060] font-bold">
                        ${Number(special.special_price).toFixed(2)}
                        {special.original_price && (
                          <span className="text-zinc-600 line-through ml-1 font-normal">
                            ${Number(special.original_price).toFixed(2)}
                          </span>
                        )}
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
