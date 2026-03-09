'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

interface ClaimData {
  draft_id: string;
  flyer_image_url: string;
  event_details: {
    event_name?: string;
    venue_name?: string;
    date?: string;
    time_start?: string;
    time_end?: string;
    description?: string;
    performers?: string;
    category?: string;
  };
  publishing_path: string;
  status: string;
  requires_payment: boolean;
}

export default function ClaimPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    fetchClaimData();
  }, [token]);

  const fetchClaimData = async () => {
    try {
      const res = await fetch(`/api/claim/${token}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Invalid link' }));
        setError(err.error || 'This link is no longer valid.');
        return;
      }
      const data = await res.json();
      setClaimData(data);
    } catch {
      setError('Failed to load claim data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const res = await fetch(`/api/claim/${token}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Claim failed' }));
        setError(err.error);
        return;
      }

      const data = await res.json();

      if (data.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = data.checkout_url;
      } else if (data.published) {
        // Published directly (free listing)
        router.push(`/claim/${token}/success`);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#A41E22]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">
            {error.includes('expired') ? '⏰' : '⚠️'}
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {error.includes('expired') ? 'Link Expired' : 'Unable to Load'}
          </h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!claimData) return null;

  const { event_details, flyer_image_url, requires_payment } = claimData;

  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-bold text-white text-center">TasteLanc</h2>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Flyer Image */}
        {flyer_image_url && (
          <div className="relative w-full aspect-[5/7] rounded-xl overflow-hidden mb-6 bg-[#252525]">
            <Image
              src={flyer_image_url}
              alt="Event flyer"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}

        {/* Event Details */}
        <div className="bg-[#252525] rounded-xl p-6 mb-6 border border-white/10">
          <h1 className="text-2xl font-bold text-white mb-4">
            {event_details.event_name || 'Event'}
          </h1>

          {event_details.venue_name && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400">📍</span>
              <span className="text-gray-300">{event_details.venue_name}</span>
            </div>
          )}

          {event_details.date && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400">📅</span>
              <span className="text-gray-300">{event_details.date}</span>
            </div>
          )}

          {event_details.time_start && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400">🕐</span>
              <span className="text-gray-300">
                {event_details.time_start}
                {event_details.time_end ? ` - ${event_details.time_end}` : ''}
              </span>
            </div>
          )}

          {event_details.performers && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400">🎤</span>
              <span className="text-gray-300">{event_details.performers}</span>
            </div>
          )}

          {event_details.description && (
            <p className="text-gray-400 mt-4 text-sm leading-relaxed">
              {event_details.description}
            </p>
          )}
        </div>

        {/* What Happens Next */}
        <div className="bg-[#252525] rounded-xl p-6 mb-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3">What happens next</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-[#A41E22] mt-0.5">✓</span>
              Your event will be listed on TasteLanc
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#A41E22] mt-0.5">✓</span>
              Locals and tourists will discover your event
            </li>
            {requires_payment && (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-[#A41E22] mt-0.5">✓</span>
                  Featured placement in the app feed
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#A41E22] mt-0.5">✓</span>
                  Push notifications to local users leading up to your event
                </li>
              </>
            )}
          </ul>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleClaim}
          disabled={isClaiming}
          className="w-full bg-[#A41E22] hover:bg-[#C42428] text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 text-lg"
        >
          {isClaiming
            ? 'Processing...'
            : requires_payment
              ? 'Claim & Promote — $50'
              : 'Claim & Publish'}
        </button>

        <p className="text-center text-gray-500 text-xs mt-4">
          By claiming, you confirm you are authorized to list this event.
        </p>
      </div>
    </div>
  );
}
