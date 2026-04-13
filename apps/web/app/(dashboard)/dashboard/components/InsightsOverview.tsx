'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, ChevronRight, Loader2, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui';

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  message: string;
  action: string;
  actionLabel: string;
}

interface InsightsOverviewProps {
  restaurantId: string;
  buildApiUrl: (path: string) => string;
  hasElite: boolean;
}

function PriorityDot({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const colors = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-500' };
  return <div className={`w-2 h-2 rounded-full ${colors[priority]} flex-shrink-0 mt-1.5`} />;
}

export function InsightsOverview({ restaurantId, buildApiUrl, hasElite }: InsightsOverviewProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsights() {
      if (!restaurantId || !hasElite) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(buildApiUrl(`/api/dashboard/insights?restaurant_id=${restaurantId}`));
        if (!response.ok) throw new Error('Failed to fetch insights');

        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error('Error fetching insights:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [restaurantId, buildApiUrl, hasElite]);

  // Don't show if not Elite
  if (!hasElite) return null;

  // Loading state
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-tastelanc-text-secondary" />
          <h3 className="font-semibold text-tastelanc-text-primary">Insights</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-tastelanc-text-muted animate-spin" />
        </div>
      </Card>
    );
  }

  // No recommendations - you're doing great
  if (recommendations.length === 0) {
    return (
      <Card className="p-6 border border-green-500/20">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-tastelanc-text-primary mb-1">You're performing well</h3>
            <p className="text-sm text-tastelanc-text-secondary">
              Your content matches or exceeds top performers in your category. Keep it up!
            </p>
          </div>
          <Link
            href="/dashboard/insights"
            className="text-tastelanc-accent hover:text-tastelanc-accent-hover text-sm font-medium whitespace-nowrap flex items-center gap-1"
          >
            Details
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </Card>
    );
  }

  // Show top 2 recommendations
  const topRecommendations = recommendations.slice(0, 2);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-tastelanc-text-secondary" />
          <h3 className="font-semibold text-tastelanc-text-primary">Insights</h3>
        </div>
        {recommendations.length > 2 && (
          <Link
            href="/dashboard/insights"
            className="text-tastelanc-accent hover:text-tastelanc-accent-hover text-sm font-medium flex items-center gap-1"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {topRecommendations.map((rec, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 bg-tastelanc-surface rounded-lg"
          >
            <PriorityDot priority={rec.priority} />
            <div className="flex-1 min-w-0">
              <p className="text-tastelanc-text-secondary text-sm">{rec.message}</p>
            </div>
            <Link
              href={rec.action}
              className="flex items-center gap-1 text-tastelanc-accent hover:text-tastelanc-accent-hover text-sm font-medium whitespace-nowrap flex-shrink-0"
            >
              {rec.actionLabel}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>

      {recommendations.length > 2 && (
        <div className="mt-4 pt-4 border-t border-tastelanc-border text-center">
          <Link
            href="/dashboard/insights"
            className="text-tastelanc-text-muted hover:text-tastelanc-text-secondary text-xs"
          >
            +{recommendations.length - 2} more recommendation{recommendations.length - 2 !== 1 ? 's' : ''}
          </Link>
        </div>
      )}
    </Card>
  );
}
