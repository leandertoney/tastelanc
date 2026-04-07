'use client';

import { useState } from 'react';
import { Sparkles, Loader2, CheckCircle, ExternalLink } from 'lucide-react';

interface Props {
  restaurantId: string;
  marketSlug: string;
  restaurantName: string;
  tierName: string;
}

export default function AdminSpotlightButton({ restaurantId, marketSlug, restaurantName, tierName }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ postId: string; mediaUrls: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEligible = tierName === 'premium' || tierName === 'elite';

  if (!isEligible) {
    return (
      <p className="text-sm text-tastelanc-text-muted">
        Spotlight posts are only available for Premium and Elite partners.
        Upgrade this restaurant&apos;s tier to generate a spotlight.
      </p>
    );
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/instagram/spotlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_slug: marketSlug, restaurant_id: restaurantId }),
      });
      const data = await res.json();

      if (data.success) {
        setResult({ postId: data.post_id, mediaUrls: data.media_urls ?? [] });
      } else {
        setError(data.error ?? 'Generation failed');
      }
    } catch (err) {
      setError('Network error — please try again');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/15 text-violet-400 border border-violet-500/30 rounded-lg hover:bg-violet-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {isGenerating ? 'Generating spotlight… (this takes ~20s)' : `Generate "Inside ${restaurantName}" Post`}
      </button>

      {result && (
        <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div className="text-sm text-emerald-300 space-y-1">
            <p className="font-medium">Spotlight post created — pending review</p>
            <p className="text-xs text-emerald-400/80">
              {result.mediaUrls.length} slide{result.mediaUrls.length !== 1 ? 's' : ''} generated
              · Post ID: <code className="font-mono">{result.postId.slice(0, 8)}…</code>
            </p>
            <a
              href="/admin/instagram-posts"
              className="inline-flex items-center gap-1 text-xs text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
            >
              View in Instagram Posts
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          Error: {error}
        </p>
      )}
    </div>
  );
}
