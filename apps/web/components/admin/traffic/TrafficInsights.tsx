'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, TrendingUp, AlertCircle, Target, Loader2 } from 'lucide-react';

interface InsightData {
  uniqueVisitors: number;
  totalViews: number;
  bounceRate: number;
  prevPeriodVisitors: number;
  prevPeriodViews: number;
  sources: { source: string; count: number; percentage: number }[];
  topReferrers: {
    domain: string;
    views: number;
    uniqueVisitors: number;
    avgPagesPerSession: number;
    bounceRate: number | null;
  }[];
  marketBreakdown?: { marketId: string | null; marketName: string; views: number; visitors: number }[];
  dailyTrend: { date: string; views: number; visitors: number }[];
}

interface TrafficInsightsProps {
  data: InsightData;
}

interface Insight {
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
}

export default function TrafficInsights({ data }: TrafficInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/traffic-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          throw new Error('Failed to generate insights');
        }

        const result = await res.json();
        setInsights(result.insights || []);
        setError(null);
      } catch (err) {
        console.error('Error generating insights:', err);
        setError(err instanceof Error ? err.message : 'Failed to load insights');
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [data]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <TrendingUp className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  if (error) {
    return null; // Silently fail - insights are optional
  }

  return (
    <div className="bg-tastelanc-card rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-yellow-400" />
        <h3 className="text-tastelanc-text-primary font-semibold">AI-Generated Insights</h3>
        {loading && <Loader2 className="w-4 h-4 text-tastelanc-text-muted animate-spin ml-2" />}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-tastelanc-border bg-tastelanc-surface/50 animate-pulse">
              <div className="h-16"></div>
            </div>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <p className="text-sm text-tastelanc-text-muted">No insights available at this time.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  insight.type === 'success'
                    ? 'bg-green-500/5 border-green-500/20'
                    : insight.type === 'warning'
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-blue-500/5 border-blue-500/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      insight.type === 'success'
                        ? 'bg-green-500/10 text-green-400'
                        : insight.type === 'warning'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}
                  >
                    {getIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <h4
                      className={`font-medium mb-1 ${
                        insight.type === 'success'
                          ? 'text-green-400'
                          : insight.type === 'warning'
                          ? 'text-amber-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {insight.title}
                    </h4>
                    <p className="text-sm text-tastelanc-text-muted">{insight.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-tastelanc-border">
            <p className="text-xs text-tastelanc-text-muted italic">
              🤖 Insights powered by OpenAI GPT-4 analyzing your traffic patterns
            </p>
          </div>
        </>
      )}
    </div>
  );
}
