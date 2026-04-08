'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Calendar, MapPin } from 'lucide-react';

interface PartyEvent {
  id: string;
  name: string;
  date: string;
  venue: string;
  address: string;
}

export function PartyInviteCard({ restaurantId, buildApiUrl }: {
  restaurantId: string;
  buildApiUrl: (path: string) => string;
}) {
  const [event, setEvent] = useState<PartyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const inviteLink = `https://tastelanc.com/party/rsvp${restaurantId ? `?ref=${restaurantId}` : ''}`;

  useEffect(() => {
    fetch(buildApiUrl('/api/party/active'))
      .then(r => r.json())
      .then(data => setEvent(data.event))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [buildApiUrl]);

  function copyLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || !event) return null;

  const eventDate = new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="rounded-xl overflow-hidden border border-[#C84B31]/40 bg-gradient-to-br from-gray-900 via-gray-900 to-[#C84B31]/5">
      {/* Top banner */}
      <div className="bg-[#C84B31] px-5 py-2.5 flex items-center gap-2">
        <span className="text-white font-semibold text-sm">🎉 Industry Party</span>
        <span className="text-[#ff9d87] text-xs ml-auto">Post-Restaurant Week</span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <h3 className="text-white font-bold text-lg">{event.name}</h3>
          <div className="mt-2 space-y-1 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-[#C84B31]" />
              <span>{eventDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-[#C84B31]" />
              <span>{event.venue} — {event.address}</span>
            </div>
          </div>
        </div>

        {/* Invite link */}
        <div className="bg-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-gray-400 text-sm font-medium">Share this link with your staff to RSVP</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-blue-400 text-sm bg-gray-900 rounded-lg px-4 py-2.5 truncate">
              {inviteLink}
            </div>
            <button
              onClick={copyLink}
              className="p-2.5 bg-[#C84B31] text-white rounded-lg hover:bg-[#b03e27] transition-colors shrink-0"
              title="Copy invite link"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="text-gray-500 text-xs">
            Staff tap the link, enter their name, and RSVP. Their ticket will be in the TasteLanc app — they show the QR code at the door.
          </p>
        </div>
      </div>
    </div>
  );
}
