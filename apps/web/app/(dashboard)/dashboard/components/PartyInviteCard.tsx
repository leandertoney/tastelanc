'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Clock, Users, MapPin, Calendar } from 'lucide-react';

interface PartyEvent {
  id: string;
  name: string;
  date: string;
  venue: string;
  address: string;
}

interface StatusData {
  eligible: boolean;
  event: PartyEvent | null;
  code: { code: string; use_limit: number; use_count: number } | null;
  request_pending: boolean;
  requested_headcount: number | null;
}

export function PartyInviteCard({ restaurantId, buildApiUrl }: {
  restaurantId: string;
  buildApiUrl: (path: string) => string;
}) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [headcount, setHeadcount] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    fetch(buildApiUrl('/api/party/restaurant-status'))
      .then(r => r.json())
      .then(data => setStatus(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [restaurantId, buildApiUrl]);

  async function submitHeadcount() {
    if (!restaurantId || headcount < 1) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/party/admin/headcount-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId, headcount }),
      });
      if (res.ok) {
        setSubmitted(true);
        // Refresh status
        const statusRes = await fetch(buildApiUrl(`/api/party/restaurant-status?restaurant_id=${restaurantId}`));
        const newStatus = await statusRes.json();
        setStatus(newStatus);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function copyCode() {
    if (!status?.code) return;
    navigator.clipboard.writeText(status.code.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Don't render if loading, not eligible, or no active event
  if (loading || !status?.eligible || !status.event) return null;

  const event = status.event;
  const eventDate = new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="rounded-xl overflow-hidden border border-[#C84B31]/40 bg-gradient-to-br from-gray-900 via-gray-900 to-[#C84B31]/5">
      {/* Top banner */}
      <div className="bg-[#C84B31] px-5 py-2.5 flex items-center gap-2">
        <span className="text-white font-semibold text-sm">🎉 You're Invited</span>
        <span className="text-[#ff9d87] text-xs ml-auto">Post-Restaurant Week · Industry Only · App Exclusive</span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <h3 className="text-white font-bold text-lg">{event.name}</h3>
          <div className="mt-2 space-y-1 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-[#C84B31]" />
              <span>{eventDate} · April 20, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-[#C84B31]" />
              <span>{event.venue} — {event.address}</span>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-3">
            A private celebration for Lancaster's restaurant industry. Your staff RSVP and check in using the TasteLanc app.
          </p>
        </div>

        {/* State: code assigned */}
        {status.code && (
          <div className="bg-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
              <Check size={14} />
              Your invite code is ready
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 font-mono text-[#C84B31] font-bold text-lg tracking-widest bg-gray-900 rounded-lg px-4 py-2 text-center">
                {status.code.code}
              </div>
              <button
                onClick={copyCode}
                className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                title="Copy code"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Users size={11} />
                Up to {status.code.use_limit} staff can use this code
              </span>
              <span className="text-gray-600">·</span>
              <span>{status.code.use_count} of {status.code.use_limit} claimed</span>
            </div>
            <p className="text-gray-500 text-xs">
              Share this code with your staff. Each person enters it in the TasteLanc app to get their personal QR ticket. They'll show the ticket at the door.
            </p>
          </div>
        )}

        {/* State: request pending admin approval */}
        {!status.code && status.request_pending && (
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-4 flex items-center gap-3">
            <Clock size={18} className="text-yellow-400 shrink-0" />
            <div>
              <p className="text-yellow-400 text-sm font-medium">Request received — pending approval</p>
              <p className="text-yellow-600 text-xs mt-0.5">
                We've noted your request for {status.requested_headcount} spots. Your invite code will appear here once approved.
              </p>
            </div>
          </div>
        )}

        {/* State: eligible but no request yet */}
        {!status.code && !status.request_pending && !submitted && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm font-medium">How many staff are you bringing?</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2 flex-1">
                <Users size={14} className="text-gray-500" />
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={headcount}
                  onChange={e => setHeadcount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="bg-transparent text-white text-sm font-medium w-full focus:outline-none"
                />
                <span className="text-gray-500 text-xs">staff</span>
              </div>
              <button
                onClick={submitHeadcount}
                disabled={submitting}
                className="px-4 py-2 bg-[#C84B31] text-white rounded-xl text-sm font-medium hover:bg-[#b03e27] disabled:opacity-50 whitespace-nowrap"
              >
                {submitting ? 'Submitting...' : 'Request Spots'}
              </button>
            </div>
            <p className="text-gray-600 text-xs">
              We'll review your request and publish your invite code here shortly.
            </p>
          </div>
        )}

        {/* State: just submitted */}
        {submitted && !status.request_pending && !status.code && (
          <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-4 flex items-center gap-3">
            <Check size={18} className="text-green-400 shrink-0" />
            <p className="text-green-400 text-sm">Request submitted! Your invite code will appear here once approved.</p>
          </div>
        )}
      </div>
    </div>
  );
}
