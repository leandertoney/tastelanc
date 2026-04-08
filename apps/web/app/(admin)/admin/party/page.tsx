'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, CheckCircle, Clock, Download, Copy, Check, RefreshCw, QrCode, ThumbsUp, ThumbsDown } from 'lucide-react';

interface PartyEvent {
  id: string;
  name: string;
  date: string;
  venue: string;
  address: string;
  capacity: number | null;
  rsvp_count: number;
  attending_count: number;
  declined_count: number;
  checked_in_count: number;
  spots_remaining: number | null;
}

interface RSVP {
  id: string;
  name: string;
  email: string | null;
  qr_token: string;
  response: string;
  source: string;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
  restaurant_id: string | null;
  restaurants: { name: string } | null;
  invite_code_id: string | null;
  party_invite_codes: {
    code: string;
    restaurant_id: string | null;
    restaurants: { name: string } | null;
  } | null;
}

const INVITE_LINK = 'https://tastelanc.com/party/rsvp';

export default function PartyAdminPage() {
  const [event, setEvent] = useState<PartyEvent | null>(null);
  const [rsvps, setRSVPs] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<'all' | 'yes' | 'no'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/party/admin/rsvps');
      const data = await res.json();
      setEvent(data.event);
      setRSVPs(data.rsvps ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function getRestaurantName(rsvp: RSVP): string {
    // Prefer direct restaurant_id join
    const direct = Array.isArray(rsvp.restaurants) ? rsvp.restaurants[0] : rsvp.restaurants;
    if (direct?.name) return direct.name;
    // Fallback to invite_code join (old RSVPs)
    const code = Array.isArray(rsvp.party_invite_codes) ? rsvp.party_invite_codes[0] : rsvp.party_invite_codes;
    return code?.restaurants?.name ?? '—';
  }

  function copyLink() {
    navigator.clipboard.writeText(INVITE_LINK);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function exportCSV() {
    const rows = [
      ['Name', 'Email', 'Response', 'Restaurant', 'Source', 'Checked In', 'Check-In Time', 'RSVP Time'],
      ...filteredRsvps.map(r => [
        r.name,
        r.email ?? '',
        r.response === 'yes' ? 'Yes' : 'No',
        getRestaurantName(r),
        r.source,
        r.checked_in ? 'Yes' : 'No',
        r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : '',
        new Date(r.created_at).toLocaleString(),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'party-guest-list.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const SOURCE_LABELS: Record<string, string> = {
    app: 'App',
    link: 'Link',
    dashboard: 'Dashboard',
  };

  const filteredRsvps = rsvps.filter(r => {
    if (filter === 'all') return true;
    return r.response === filter;
  });

  if (loading) {
    return <div className="p-8 text-gray-400">Loading party data...</div>;
  }

  if (!event) {
    return <div className="p-8 text-gray-400">No active party event found.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{event.name}</h1>
          <p className="text-gray-400 mt-1">
            {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {' · '}{event.venue}
          </p>
          <p className="text-gray-500 text-sm">{event.address}</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-sm border border-gray-700"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Invite Link'}
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <a
            href="/admin/party/scan"
            className="flex items-center gap-2 px-4 py-2 bg-[#C84B31] text-white rounded-lg hover:bg-[#b03e27] text-sm font-medium"
          >
            <QrCode size={16} />
            Door Scanner
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total RSVPs', value: event.rsvp_count, icon: Users, color: 'text-blue-400' },
          { label: 'Attending', value: event.attending_count, icon: ThumbsUp, color: 'text-green-400' },
          { label: 'Declined', value: event.declined_count, icon: ThumbsDown, color: 'text-red-400' },
          { label: 'Checked In', value: event.checked_in_count, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Spots Left', value: event.spots_remaining ?? '∞', icon: Clock, color: 'text-purple-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={16} className={stat.color} />
              <span className="text-gray-400 text-sm">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filter + Export */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
          {(['all', 'yes', 'no'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? `All (${rsvps.length})` : f === 'yes' ? `Attending (${rsvps.filter(r => r.response === 'yes').length})` : `Declined (${rsvps.filter(r => r.response === 'no').length})`}
            </button>
          ))}
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-sm"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* RSVP Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs">
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Response</th>
                <th className="text-left p-4">Restaurant</th>
                <th className="text-left p-4">Source</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">RSVP Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredRsvps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-8">No RSVPs yet.</td>
                </tr>
              ) : (
                filteredRsvps.map(rsvp => (
                  <tr key={rsvp.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="p-4 text-white font-medium">{rsvp.name}</td>
                    <td className="p-4 text-gray-400 text-xs">{rsvp.email ?? '—'}</td>
                    <td className="p-4">
                      {rsvp.response === 'yes' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 text-xs font-medium">
                          <ThumbsUp size={10} /> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 text-xs font-medium">
                          <ThumbsDown size={10} /> No
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-300">{getRestaurantName(rsvp)}</td>
                    <td className="p-4 text-gray-400 text-xs">{SOURCE_LABELS[rsvp.source] ?? rsvp.source}</td>
                    <td className="p-4">
                      {rsvp.response === 'no' ? (
                        <span className="text-gray-600 text-xs">—</span>
                      ) : rsvp.checked_in ? (
                        <span className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                          <CheckCircle size={12} />
                          Checked In
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-yellow-400 text-xs">
                          <Clock size={12} />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-500 text-xs">
                      {new Date(rsvp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
