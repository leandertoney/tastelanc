'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Send, Loader2, Smartphone } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui';
import { getMarketConfig, BRAND } from '@/config/market';
import UsageMeter from './UsageMeter';
import { useModal } from '@/components/dashboard/ModalProvider';

interface PushCampaign {
  id: string;
  title: string;
  body: string;
  audience: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  sent_at: string | null;
  created_at: string;
}

interface PushLimits {
  used: number;
  limit: number;
  remaining: number;
  period: string;
  marketSlug: string;
  audienceCounts: {
    favorites: number;
    checked_in: number;
  };
}

interface PushNotificationsTabProps {
  restaurantId: string;
  restaurantName: string;
  tierName: string | null;
}

const AUDIENCE_LABELS: Record<string, string> = {
  favorites: 'Favorited Users',
  checked_in: 'Checked-in Users',
};

// Map market slugs to their app icon paths
const MARKET_APP_ICONS: Record<string, string> = {
  'lancaster-pa': '/images/tastelanc_icon.png',
  'cumberland-pa': '/images/tastecumberland_icon.png',
  'fayetteville-nc': '/images/tastefayetteville_logo.png',
};

function NotificationPreview({
  title,
  body,
  restaurantName,
  marketSlug,
}: {
  title: string;
  body: string;
  restaurantName: string;
  marketSlug: string;
}) {
  const brand = getMarketConfig(marketSlug) || BRAND;
  const appIcon = MARKET_APP_ICONS[marketSlug] || MARKET_APP_ICONS['lancaster-pa'];
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex items-center gap-1.5 mb-3">
        <Smartphone className="w-3.5 h-3.5 text-tastelanc-text-faint" />
        <span className="text-xs text-tastelanc-text-faint">Live Preview</span>
      </div>

      {/* iPhone frame */}
      <div className="relative w-[280px]">
        {/* Phone body */}
        <div className="rounded-[40px] border-[3px] border-gray-700 bg-black p-2 shadow-2xl">
          {/* Screen */}
          <div
            className="rounded-[34px] overflow-hidden relative"
            style={{
              background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              aspectRatio: '9 / 19.5',
            }}
          >
            {/* Dynamic Island */}
            <div className="flex justify-center pt-3">
              <div className="w-[90px] h-[22px] bg-black rounded-full" />
            </div>

            {/* Lock screen content */}
            <div className="flex flex-col items-center mt-8">
              {/* Time */}
              <p className="text-white text-[54px] font-light leading-none tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                {timeStr}
              </p>
              {/* Date */}
              <p className="text-white/70 text-[13px] mt-1 font-medium">
                {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Notification bubble */}
            <div className="px-3 mt-8">
              <div
                className="rounded-[18px] overflow-hidden backdrop-blur-xl"
                style={{ backgroundColor: 'rgba(245, 245, 247, 0.95)' }}
              >
                {/* App header */}
                <div className="flex items-center gap-2 px-3 pt-2.5 pb-0.5">
                  <div className="w-6 h-6 rounded-[6px] overflow-hidden flex-shrink-0">
                    <Image
                      src={appIcon}
                      alt={brand.name}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500 flex-1 truncate uppercase tracking-wider">
                    {brand.name}
                  </span>
                  <span className="text-[11px] text-gray-400">now</span>
                </div>

                {/* Notification body */}
                <div className="px-3 pb-2.5 pt-0.5">
                  {title ? (
                    <p className="text-[13px] font-bold text-gray-900 leading-tight">{restaurantName}: {title}</p>
                  ) : (
                    <p className="text-[13px] text-gray-300 italic leading-tight">{restaurantName}: Notification title...</p>
                  )}
                  {body ? (
                    <p className="text-[12px] text-gray-600 leading-snug mt-0.5 line-clamp-4">{body}</p>
                  ) : (
                    <p className="text-[12px] text-gray-300 italic leading-snug mt-0.5">Your message will appear here...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom spacer with home indicator */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2">
              <div className="w-[100px] h-[4px] bg-white/30 rounded-full" />
            </div>
          </div>
        </div>

        {/* Side button (power) */}
        <div className="absolute right-[-5px] top-[90px] w-[3px] h-[30px] bg-gray-700 rounded-r-sm" />
        {/* Volume buttons */}
        <div className="absolute left-[-5px] top-[75px] w-[3px] h-[20px] bg-gray-700 rounded-l-sm" />
        <div className="absolute left-[-5px] top-[102px] w-[3px] h-[30px] bg-gray-700 rounded-l-sm" />
        <div className="absolute left-[-5px] top-[140px] w-[3px] h-[30px] bg-gray-700 rounded-l-sm" />
      </div>

      <p className="text-[10px] text-tastelanc-text-faint mt-3 text-center">
        Exactly how your notification appears on customers&apos; phones
      </p>
    </div>
  );
}

export default function PushNotificationsTab({ restaurantId, restaurantName, tierName }: PushNotificationsTabProps) {
  const modal = useModal();
  const [campaigns, setCampaigns] = useState<PushCampaign[]>([]);
  const [limits, setLimits] = useState<PushLimits | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<string>('favorites');
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignsRes, limitsRes] = await Promise.all([
        fetch(`/api/dashboard/marketing/push?restaurant_id=${restaurantId}`),
        fetch(`/api/dashboard/marketing/push/limits?restaurant_id=${restaurantId}`),
      ]);

      const campaignsData = await campaignsRes.json();
      const limitsData = await limitsRes.json();

      if (campaignsRes.ok) setCampaigns(campaignsData.campaigns);
      if (limitsRes.ok) setLimits(limitsData);
    } catch (err) {
      console.error('Error fetching push data:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSend = async () => {
    if (!title || !body) return;

    const audienceCount = limits?.audienceCounts[audience as keyof typeof limits.audienceCounts] || 0;
    const confirmed = await modal.confirm({
      title: 'Send Push Notification',
      description: `This will send a notification to ${audienceCount} ${AUDIENCE_LABELS[audience].toLowerCase()}.`,
      details: [
        { label: 'Title', value: `${restaurantName}: ${title}` },
        { label: 'Message', value: body },
        { label: 'Audience', value: AUDIENCE_LABELS[audience] },
      ],
      warning: 'This cannot be undone. Users will receive this notification immediately.',
      confirmLabel: `Send to ${audienceCount} users`,
    });
    if (!confirmed) return;

    setSending(true);
    try {
      const res = await fetch(
        `/api/dashboard/marketing/push?restaurant_id=${restaurantId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, body, audience }),
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        modal.alert({ type: 'success', text: `Notification sent to ${data.sent} user${data.sent === 1 ? '' : 's'}!` });
        setTitle('');
        setBody('');
        fetchData();
      } else {
        modal.alert({ type: 'error', text: data.error || 'Failed to send notification' });
      }
    } catch (err) {
      console.error('Error sending push:', err);
      modal.alert({ type: 'error', text: 'Failed to send notification. Please try again.' });
    } finally {
      setSending(false);
    }
  };

  const isAtLimit = limits ? limits.used >= limits.limit : false;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-tastelanc-text-faint animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Usage Meter */}
      {limits && (
        <UsageMeter
          used={limits.used}
          limit={limits.limit}
          label={`Push notifications — ${limits.period}`}
        />
      )}

      {/* Send Form + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-3 bg-tastelanc-surface-light rounded-lg p-6 space-y-4">
          <h3 className="text-tastelanc-text-primary font-medium">Send Push Notification</h3>

          <div className="bg-tastelanc-accent/10 border border-tastelanc-accent/20 rounded-lg px-4 py-3 text-xs text-tastelanc-text-muted space-y-1">
            <p className="font-medium text-tastelanc-accent">How push notifications work:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Send directly to phones of users who favorited or checked in at your restaurant</li>
              <li>Great for flash specials, event reminders, or last-minute deals</li>
              <li>Grow your audience by encouraging customers to favorite you in the app</li>
            </ul>
          </div>

          <div>
            <label className="text-xs text-tastelanc-text-muted mb-1 block">
              Title * <span className="text-tastelanc-text-faint">({title.length}/50)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 50))}
              placeholder="e.g. Happy Hour Starts Now!"
              disabled={isAtLimit}
              className="w-full bg-tastelanc-bg border border-tastelanc-border rounded-lg px-3 py-2 text-tastelanc-text-primary text-sm focus:outline-none focus:border-tastelanc-accent disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs text-tastelanc-text-muted mb-1 block">
              Message * <span className="text-tastelanc-text-faint">({body.length}/178)</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 178))}
              placeholder="e.g. Half-price wings and $5 craft drafts until 7pm. Swing by!"
              rows={3}
              disabled={isAtLimit}
              className="w-full bg-tastelanc-bg border border-tastelanc-border rounded-lg px-3 py-2 text-tastelanc-text-primary text-sm focus:outline-none focus:border-tastelanc-accent resize-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs text-tastelanc-text-muted mb-2 block">Audience</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(AUDIENCE_LABELS).map(([key, label]) => {
                const count = limits?.audienceCounts[key as keyof typeof limits.audienceCounts] || 0;
                return (
                  <button
                    key={key}
                    onClick={() => setAudience(key)}
                    disabled={isAtLimit}
                    className={`p-3 rounded-lg border text-left transition-colors disabled:opacity-50 ${
                      audience === key
                        ? 'border-tastelanc-accent bg-tastelanc-accent/10 text-tastelanc-text-primary'
                        : 'border-tastelanc-border bg-tastelanc-bg text-tastelanc-text-muted hover:border-tastelanc-border'
                    }`}
                  >
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-tastelanc-text-faint mt-1">{count} users</p>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={!title || !body || sending || isAtLimit}
            className="bg-tastelanc-accent hover:bg-tastelanc-accent/80 text-white disabled:opacity-50"
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Send to {limits?.audienceCounts[audience as keyof typeof limits.audienceCounts] || 0} users
              </span>
            )}
          </Button>

          {isAtLimit && tierName === 'premium' && (
            <p className="text-xs text-tastelanc-text-muted">
              Upgrade to Elite for 8 notifications/month.{' '}
              <a href="/dashboard/subscription" className="text-tastelanc-accent hover:underline">
                View plans
              </a>
            </p>
          )}
        </div>

        {/* Live Preview — no container, just the phone */}
        <div className="lg:col-span-2 flex items-start justify-center pt-4">
          <NotificationPreview
            title={title}
            body={body}
            restaurantName={restaurantName}
            marketSlug={limits?.marketSlug || 'lancaster-pa'}
          />
        </div>
      </div>

      {/* History */}
      {campaigns.length > 0 && (
        <div>
          <h3 className="text-tastelanc-text-primary font-medium mb-3">Recent Notifications</h3>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-tastelanc-surface-light rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-tastelanc-text-primary text-sm font-medium">{campaign.title}</p>
                    <p className="text-tastelanc-text-muted text-sm mt-1">{campaign.body}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-tastelanc-text-faint">
                      <span>{AUDIENCE_LABELS[campaign.audience] || campaign.audience}</span>
                      <span>Sent to {campaign.sent_count}</span>
                      <span>
                        {campaign.sent_at
                          ? new Date(campaign.sent_at).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                  </div>
                  <Bell className="w-4 h-4 text-tastelanc-text-faint flex-shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {campaigns.length === 0 && (
        <div className="text-center py-8">
          <Bell className="w-12 h-12 text-tastelanc-text-faint mx-auto mb-3" />
          <p className="text-tastelanc-text-primary font-medium mb-1">No notifications sent yet</p>
          <p className="text-tastelanc-text-muted text-sm max-w-md mx-auto">
            Send push notifications directly to customers who have favorited or checked in at your restaurant. A great way to fill seats during slow hours or promote tonight&apos;s specials.
          </p>
        </div>
      )}

    </div>
  );
}
