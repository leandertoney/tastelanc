'use client';

import { useState, useEffect, useCallback } from 'react';
import { QrCode, Users, CheckCircle, Clock, Download, Plus, Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, X } from 'lucide-react';

interface PartyEvent {
  id: string;
  name: string;
  date: string;
  venue: string;
  address: string;
  capacity: number | null;
  rsvp_count: number;
  checked_in_count: number;
  spots_remaining: number | null;
}

interface InviteCode {
  id: string;
  code: string;
  use_limit: number;
  use_count: number;
  channel: string;
  requested_headcount: number | null;
  notes: string | null;
  created_at: string;
  restaurants: {
    id: string;
    name: string;
    tiers: { name: string; display_name: string } | null;
  } | null;
}

interface RSVP {
  id: string;
  name: string;
  qr_token: string;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
  invite_code_id: string;
  party_invite_codes: {
    code: string;
    restaurant_id: string | null;
    restaurants: { name: string } | null;
  } | null;
}

export default function PartyAdminPage() {
  const [event, setEvent] = useState<PartyEvent | null>(null);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [rsvps, setRSVPs] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'codes' | 'rsvps'>('codes');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Generate code form
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [useLimit, setUseLimit] = useState(5);
  const [channel, setChannel] = useState<'manual' | 'email' | 'sms' | 'dashboard'>('manual');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  // Per-row approval state: { [pendingCodeId]: approvedSpots }
  const [approvalSpots, setApprovalSpots] = useState<Record<string, number>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Per-row decline state
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReasons, setDeclineReasons] = useState<Record<string, string>>({});
  const [submittingDeclineId, setSubmittingDeclineId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/party/admin/rsvps');
      const data = await res.json();
      setEvent(data.event);
      setCodes(data.codes ?? []);
      setRSVPs(data.rsvps ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleGenerateCode() {
    if (!restaurantName.trim() || useLimit < 1) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/party/admin/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_name: restaurantName.trim(),
          use_limit: useLimit,
          channel,
          notes: notes.trim() || null,
        }),
      });
      if (res.ok) {
        setRestaurantName('');
        setUseLimit(5);
        setNotes('');
        setShowGenerateForm(false);
        await load();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(pendingCodeId: string, defaultSpots: number) {
    const spots = approvalSpots[pendingCodeId] ?? defaultSpots;
    if (!spots || spots < 1) return;
    setApprovingId(pendingCodeId);
    try {
      const res = await fetch('/api/party/admin/approve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_code_id: pendingCodeId, use_limit: spots }),
      });
      if (res.ok) {
        setApprovalSpots(prev => {
          const next = { ...prev };
          delete next[pendingCodeId];
          return next;
        });
        await load();
      }
    } finally {
      setApprovingId(null);
    }
  }

  async function handleDecline(pendingCodeId: string) {
    const reason = declineReasons[pendingCodeId]?.trim();
    if (!reason) return;
    setSubmittingDeclineId(pendingCodeId);
    try {
      const res = await fetch('/api/party/admin/decline-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_code_id: pendingCodeId, reason }),
      });
      if (res.ok) {
        setDecliningId(null);
        setDeclineReasons(prev => {
          const next = { ...prev };
          delete next[pendingCodeId];
          return next;
        });
        await load();
      }
    } finally {
      setSubmittingDeclineId(null);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function exportCSV() {
    const rows = [
      ['Name', 'Restaurant', 'Code', 'Checked In', 'Check-In Time', 'RSVP Time'],
      ...rsvps.map(r => {
        const code = r.party_invite_codes;
        const restaurant = code?.restaurants?.name ?? '';
        return [
          r.name,
          restaurant,
          code?.code ?? '',
          r.checked_in ? 'Yes' : 'No',
          r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : '',
          new Date(r.created_at).toLocaleString(),
        ];
      }),
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

  const CHANNEL_LABELS: Record<string, string> = {
    dashboard: 'Dashboard',
    email: 'Email',
    sms: 'SMS',
    manual: 'Manual',
  };

  if (loading) {
    return (
      <div className="p-8 text-gray-400">Loading party data...</div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-gray-400">No active party event found.</div>
    );
  }

  const checkedInRSVPs = rsvps.filter(r => r.checked_in);
  const pendingCodes = codes.filter(c => (c as any).status === 'pending' || (c.use_limit === 0 && !(c as any).status));
  const declinedCodes = codes.filter(c => (c as any).status === 'declined');
  const activeCodes = codes.filter(c => c.use_limit > 0 && (c as any).status !== 'declined');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{event.name}</h1>
          <p className="text-gray-400 mt-1">
            {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {' · '}{event.venue}
          </p>
          <p className="text-gray-500 text-sm">{event.address}</p>
        </div>
        <div className="flex gap-3">
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
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total RSVPs', value: event.rsvp_count, icon: Users, color: 'text-blue-400' },
          { label: 'Checked In', value: event.checked_in_count, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Pending Arrival', value: event.rsvp_count - event.checked_in_count, icon: Clock, color: 'text-yellow-400' },
          { label: 'Spots Remaining', value: event.spots_remaining ?? '∞', icon: Users, color: 'text-purple-400' },
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

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {(['codes', 'rsvps'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'codes' ? `Invite Codes (${activeCodes.length})` : `RSVPs (${rsvps.length})`}
          </button>
        ))}
      </div>

      {/* Invite Codes Tab */}
      {activeTab === 'codes' && (
        <div className="space-y-4">
          {/* Pending headcount requests */}
          {pendingCodes.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4">
              <h3 className="text-yellow-400 font-medium mb-3">Pending Headcount Requests ({pendingCodes.length})</h3>
              <div className="space-y-3">
                {pendingCodes.map(c => {
                  const defaultSpots = c.requested_headcount ?? 5;
                  const spots = approvalSpots[c.id] ?? defaultSpots;
                  const isApproving = approvingId === c.id;
                  const isShowingDecline = decliningId === c.id;
                  const isSubmittingDecline = submittingDeclineId === c.id;
                  return (
                    <div key={c.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="text-white font-medium">{c.restaurants?.name ?? 'Unknown restaurant'}</span>
                          <span className="text-gray-400 ml-2">— requested {c.requested_headcount ?? '?'} spots</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-gray-400 text-xs">Approve</label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={spots}
                            onChange={e => setApprovalSpots(prev => ({ ...prev, [c.id]: parseInt(e.target.value) || 1 }))}
                            className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-green-500"
                          />
                          <span className="text-gray-400 text-xs">spots</span>
                          <button
                            onClick={() => handleApprove(c.id, defaultSpots)}
                            disabled={isApproving || spots < 1}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-medium hover:bg-green-600 disabled:opacity-50"
                          >
                            <ThumbsUp size={12} />
                            {isApproving ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => setDecliningId(isShowingDecline ? null : c.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs font-medium hover:bg-red-900/50 hover:text-red-400"
                          >
                            <ThumbsDown size={12} />
                            Decline
                          </button>
                        </div>
                      </div>
                      {isShowingDecline && (
                        <div className="flex items-center gap-2 pl-2 border-l-2 border-red-800">
                          <input
                            type="text"
                            value={declineReasons[c.id] ?? ''}
                            onChange={e => setDeclineReasons(prev => ({ ...prev, [c.id]: e.target.value }))}
                            placeholder="Reason for declining (sent to restaurant owner)..."
                            className="flex-1 bg-gray-800 border border-red-900/50 rounded px-3 py-1.5 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-red-700"
                          />
                          <button
                            onClick={() => handleDecline(c.id)}
                            disabled={isSubmittingDecline || !declineReasons[c.id]?.trim()}
                            className="px-3 py-1.5 bg-red-800 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
                          >
                            {isSubmittingDecline ? 'Declining...' : 'Confirm Decline'}
                          </button>
                          <button onClick={() => setDecliningId(null)} className="text-gray-500 hover:text-gray-300">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Declined requests */}
          {declinedCodes.length > 0 && (
            <div className="bg-red-900/10 border border-red-800/30 rounded-xl p-4">
              <h3 className="text-red-400 font-medium mb-3">Declined Requests ({declinedCodes.length})</h3>
              <div className="space-y-2">
                {declinedCodes.map(c => (
                  <div key={c.id} className="text-sm">
                    <span className="text-white font-medium">{c.restaurants?.name ?? 'Unknown restaurant'}</span>
                    <span className="text-gray-400 ml-2">— requested {c.requested_headcount ?? '?'} spots</span>
                    {(c as any).decline_reason && (
                      <p className="text-red-400/70 text-xs mt-0.5 ml-0">Reason: {(c as any).decline_reason}</p>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-gray-600 text-xs mt-3">Restaurant owners can revise and resubmit from their dashboard.</p>
            </div>
          )}

          {/* Generate code form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Generate Invite Code</h3>
              <button
                onClick={() => setShowGenerateForm(!showGenerateForm)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#C84B31] text-white rounded-lg text-sm hover:bg-[#b03e27]"
              >
                <Plus size={14} />
                New Code
              </button>
            </div>

            {showGenerateForm && (
              <div className="space-y-3 border-t border-gray-800 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Restaurant Name</label>
                    <input
                      type="text"
                      value={restaurantName}
                      onChange={e => setRestaurantName(e.target.value)}
                      placeholder="e.g. Fishbones"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#C84B31]"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Staff Count (use limit)</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={useLimit}
                      onChange={e => setUseLimit(parseInt(e.target.value) || 1)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C84B31]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Channel</label>
                    <select
                      value={channel}
                      onChange={e => setChannel(e.target.value as typeof channel)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C84B31]"
                    >
                      <option value="manual">Manual</option>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="dashboard">Dashboard</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="e.g. sent via text 3/20"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#C84B31]"
                    />
                  </div>
                </div>
                <button
                  onClick={handleGenerateCode}
                  disabled={generating || !restaurantName.trim()}
                  className="px-4 py-2 bg-[#C84B31] text-white rounded-lg text-sm font-medium hover:bg-[#b03e27] disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate Code'}
                </button>
              </div>
            )}
          </div>

          {/* Active codes list */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs">
                  <th className="text-left p-4">Restaurant</th>
                  <th className="text-left p-4">Code</th>
                  <th className="text-left p-4">Used / Limit</th>
                  <th className="text-left p-4">Channel</th>
                  <th className="text-left p-4">Notes</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeCodes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500 py-8">No codes yet. Generate one above.</td>
                  </tr>
                ) : (
                  activeCodes.map(code => (
                    <tr key={code.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="p-4 text-white font-medium">
                        {(code.restaurants?.name ?? restaurantName) || '—'}
                        {code.restaurants?.tiers && (
                          <span className="ml-2 text-xs text-gray-500">({code.restaurants.tiers.display_name})</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-[#C84B31] font-bold">{code.code}</span>
                      </td>
                      <td className="p-4">
                        <span className={code.use_count >= code.use_limit ? 'text-red-400' : 'text-green-400'}>
                          {code.use_count} / {code.use_limit}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400">{CHANNEL_LABELS[code.channel] ?? code.channel}</td>
                      <td className="p-4 text-gray-500 text-xs">{code.notes ?? '—'}</td>
                      <td className="p-4">
                        <button
                          onClick={() => copyCode(code.code)}
                          className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs hover:bg-gray-700"
                        >
                          {copiedCode === code.code ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                          {copiedCode === code.code ? 'Copied!' : 'Copy'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RSVPs Tab */}
      {activeTab === 'rsvps' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-sm"
            >
              <Download size={14} />
              Export Guest List CSV
            </button>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs">
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Restaurant</th>
                  <th className="text-left p-4">Code</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">RSVP Time</th>
                </tr>
              </thead>
              <tbody>
                {rsvps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-500 py-8">No RSVPs yet.</td>
                  </tr>
                ) : (
                  rsvps.map(rsvp => {
                    const code = rsvp.party_invite_codes;
                    const restaurant = code?.restaurants?.name ?? '—';
                    return (
                      <tr key={rsvp.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="p-4 text-white font-medium">{rsvp.name}</td>
                        <td className="p-4 text-gray-300">{restaurant}</td>
                        <td className="p-4 font-mono text-gray-400 text-xs">{code?.code ?? '—'}</td>
                        <td className="p-4">
                          {rsvp.checked_in ? (
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
