'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy, Plus, Trash2, Pencil, X, Check } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  player_name: string;
  score: number;
  venue_name: string;
  position: number;
  is_winner: boolean;
  prize_description: string | null;
  winner_email: string | null;
  email_verified: boolean;
  week_start: string;
  nightly_date: string | null;
  is_active: boolean;
  market_id: string | null;
  created_at: string;
}

const LANCASTER_MARKET_ID = null; // null fetches all; set to UUID to filter

const EMPTY_FORM = {
  week_start: new Date().toISOString().split('T')[0],
  nightly_date: '',
  player_name: '',
  score: 0,
  venue_name: '',
  position: 1,
  is_winner: false,
  prize_description: '',
  winner_email: '',
};

export default function TriviaLeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterWeek, setFilterWeek] = useState<string>('all');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/trivia-leaderboard');
      const data = await res.json();
      console.log('[TFK Debug] API Response:', data);
      console.log('[TFK Debug] Entries:', data.entries);
      console.log('[TFK Debug] First entry:', data.entries?.[0]);
      console.log('[TFK Debug] First entry player_name:', data.entries?.[0]?.player_name);
      console.log('[TFK Debug] player_name type:', typeof data.entries?.[0]?.player_name);
      setEntries(data.entries || []);
    } catch (e) {
      setError('Failed to load entries');
      console.error('[TFK Debug] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Unique weeks for filter
  const weeks = Array.from(new Set(entries.map((e) => e.week_start))).sort().reverse();

  const filtered = filterWeek === 'all'
    ? entries
    : entries.filter((e) => e.week_start === filterWeek);

  const handleSave = async () => {
    if (!form.player_name || !form.venue_name || !form.week_start) {
      setError('Player name, venue, and week start are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        nightly_date: form.nightly_date || null,
        prize_description: form.prize_description || null,
        score: Number(form.score),
        position: Number(form.position),
      };

      if (editingId) {
        await fetch('/api/admin/trivia-leaderboard', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        await fetch('/api/admin/trivia-leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await fetchEntries();
    } catch (e) {
      setError('Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry: LeaderboardEntry) => {
    setForm({
      week_start: entry.week_start,
      nightly_date: entry.nightly_date || '',
      player_name: entry.player_name,
      score: entry.score,
      venue_name: entry.venue_name,
      position: entry.position,
      is_winner: entry.is_winner,
      prize_description: entry.prize_description || '',
      winner_email: entry.winner_email || '',
    });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    await fetch(`/api/admin/trivia-leaderboard?id=${id}`, { method: 'DELETE' });
    await fetchEntries();
  };

  const handleToggleActive = async (entry: LeaderboardEntry) => {
    await fetch('/api/admin/trivia-leaderboard', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, is_active: !entry.is_active }),
    });
    await fetchEntries();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="text-yellow-500" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">TFK Trivia Winners</h1>
            <p className="text-sm text-gray-500">Thirsty for Knowledge — Restaurant Week Nightly Winners</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium"
        >
          <Plus size={16} /> Add Entry
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit Entry' : 'Add Entry'}</h2>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}>
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Player Name *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.player_name}
                onChange={(e) => setForm({ ...form, player_name: e.target.value })}
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.venue_name}
                onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
                placeholder="Southern Market Lancaster"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Week Start *</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.week_start}
                onChange={(e) => setForm({ ...form, week_start: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nightly Date <span className="text-gray-400">(leave blank for weekly overall)</span>
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.nightly_date}
                onChange={(e) => setForm({ ...form, nightly_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.score}
                onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <input
                type="number"
                min={1}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prize Description</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.prize_description}
                onChange={(e) => setForm({ ...form, prize_description: e.target.value })}
                placeholder="$25 prize"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Winner's Email <span className="text-gray-400">(ask winner for their email)</span>
              </label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.winner_email}
                onChange={(e) => setForm({ ...form, winner_email: e.target.value })}
                placeholder="winner@gmail.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ask winner for the email they'll use in the app. Deal auto-appears when they sign up.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-6 col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_winner}
                  onChange={(e) => setForm({ ...form, is_winner: e.target.checked })}
                  className="rounded"
                />
                Mark as Winner (shows trophy badge)
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50"
            >
              <Check size={16} /> {saving ? 'Saving...' : 'Save Entry'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter by week */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium text-gray-600">Week:</span>
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          value={filterWeek}
          onChange={(e) => setFilterWeek(e.target.value)}
        >
          <option value="all">All weeks</option>
          {weeks.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400">{filtered.length} entries</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-gray-500">No entries yet. Add the first winner above!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pos</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Player</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Venue</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Night</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Prize Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((entry) => (
                <tr key={entry.id} className={`hover:bg-gray-50 ${!entry.is_active ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3 font-bold text-purple-700">
                    {entry.is_winner ? '🏆 ' : ''}{entry.position}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {entry.player_name || '[EMPTY]'}
                      <span className="text-xs text-red-500 ml-2">
                        {typeof entry.player_name} | len: {entry.player_name?.length || 0}
                      </span>
                    </div>
                    {entry.winner_email && (
                      <div className="text-xs text-gray-500 mt-0.5">{entry.winner_email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{entry.venue_name}</td>
                  <td className="px-4 py-3 font-mono font-bold">{entry.score}</td>
                  <td className="px-4 py-3 text-gray-500">{entry.nightly_date || '—'}</td>
                  <td className="px-4 py-3">
                    {entry.winner_email ? (
                      <div className="flex items-center gap-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          entry.email_verified
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {entry.email_verified ? '✓ Claimed' : 'Pending'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No email</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(entry)}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        entry.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {entry.is_active ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="text-gray-400 hover:text-purple-600"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
