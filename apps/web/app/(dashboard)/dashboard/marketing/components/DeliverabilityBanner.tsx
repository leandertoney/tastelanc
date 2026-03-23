'use client';

import { useState } from 'react';
import { Mail, CheckCircle, X, Loader2 } from 'lucide-react';

type CheckStatus = null | 'pending' | 'confirmed' | 'dismissed';

interface DeliverabilityBannerProps {
  restaurantId: string;
  initialStatus: CheckStatus;
}

export default function DeliverabilityBanner({ restaurantId, initialStatus }: DeliverabilityBannerProps) {
  const [status, setStatus] = useState<CheckStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  // Don't show if confirmed or dismissed
  if (status === 'confirmed' || status === 'dismissed') return null;

  async function handleSendEmail() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dashboard/marketing/deliverability-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId }),
      });
      const data = await res.json();
      if (data.status) setStatus(data.status);
    } catch {
      // Silently fail — banner stays in current state
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm() {
    setIsLoading(true);
    try {
      await fetch('/api/dashboard/marketing/deliverability-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId, status: 'confirmed' }),
      });
      setStatus('confirmed');
    } catch {
      setStatus('confirmed'); // Optimistic — dismiss either way
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDismiss() {
    try {
      await fetch('/api/dashboard/marketing/deliverability-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId, status: 'dismissed' }),
      });
    } catch {
      // Silently fail
    }
    setStatus('dismissed');
  }

  return (
    <div className="bg-tastelanc-surface-light border border-tastelanc-border rounded-lg p-4 mb-6 flex items-start gap-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center mt-0.5">
        <Mail className="w-4 h-4 text-blue-400" />
      </div>

      <div className="flex-1 min-w-0">
        {status === null ? (
          <>
            <p className="text-sm font-medium text-tastelanc-text-primary mb-0.5">
              Make sure our emails reach you
            </p>
            <p className="text-sm text-tastelanc-text-muted mb-3">
              Reply to our test email so your inbox knows we&apos;re safe. This ensures campaign reports and notifications from us don&apos;t end up in spam.
            </p>
            <button
              onClick={handleSendEmail}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tastelanc-accent text-white text-sm font-medium hover:bg-tastelanc-accent/90 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              Send test email
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-tastelanc-text-primary mb-0.5">
              Email sent — check your inbox (and spam)
            </p>
            <p className="text-sm text-tastelanc-text-muted mb-3">
              Reply to the test email so your inbox recognizes us, then come back and confirm.
            </p>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-500 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              I replied ✓
            </button>
          </>
        )}
      </div>

      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-tastelanc-text-faint hover:text-tastelanc-text-muted transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
