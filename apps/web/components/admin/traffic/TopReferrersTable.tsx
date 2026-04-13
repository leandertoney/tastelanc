'use client';

import { ExternalLink, TrendingUp, Users, Eye, Activity } from 'lucide-react';

interface ReferrerData {
  domain: string;
  views: number;
  uniqueVisitors: number;
  avgPagesPerSession: number;
  bounceRate: number | null;
}

interface TopReferrersTableProps {
  data: ReferrerData[];
}

export default function TopReferrersTable({ data }: TopReferrersTableProps) {
  if (!data.length) {
    return (
      <div className="bg-tastelanc-card rounded-xl p-6 h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-tastelanc-text-primary font-semibold">Top Referrers</h3>
          <p className="text-xs text-tastelanc-text-muted">Actionable ROI Metrics</p>
        </div>
        <div className="h-48 flex items-center justify-center text-tastelanc-text-muted text-sm">
          No referrer data yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-tastelanc-card rounded-xl p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-tastelanc-text-primary font-semibold">Top Referrers</h3>
        <p className="text-xs text-tastelanc-text-muted">Quality & Engagement Metrics</p>
      </div>

      <div className="space-y-3 max-h-[480px] overflow-y-auto">
        {data.map((ref, i) => {
          // Calculate quality score (higher pages/session and lower bounce rate = better)
          const qualityScore =
            (ref.avgPagesPerSession * 20) + // Up to 100 points for 5+ pages/session
            ((ref.bounceRate !== null ? (100 - ref.bounceRate) : 50)); // Lower bounce = higher score

          const isHighQuality = qualityScore > 120; // Above average
          const isMediumQuality = qualityScore > 80;

          return (
            <div
              key={ref.domain}
              className={`p-3 rounded-lg border transition-all ${
                isHighQuality
                  ? 'bg-green-500/5 border-green-500/20'
                  : isMediumQuality
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-tastelanc-surface border-tastelanc-border'
              }`}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-tastelanc-text-faint text-xs font-medium w-5">#{i + 1}</span>
                    <a
                      href={`https://${ref.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-tastelanc-text-primary font-medium truncate flex items-center gap-1 hover:text-tastelanc-accent transition-colors"
                      title={ref.domain}
                    >
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      {ref.domain}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {isHighQuality && (
                    <div className="flex items-center gap-1 bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full text-[10px] font-medium">
                      <TrendingUp className="w-3 h-3" />
                      High Quality
                    </div>
                  )}
                  {isMediumQuality && !isHighQuality && (
                    <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-[10px] font-medium">
                      <Activity className="w-3 h-3" />
                      Good
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-tastelanc-surface/50 rounded px-2 py-1.5">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Eye className="w-3 h-3 text-tastelanc-text-faint" />
                  </div>
                  <div className="text-sm font-semibold text-tastelanc-text-primary">
                    {ref.views.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-tastelanc-text-muted uppercase tracking-wide">
                    Views
                  </div>
                </div>

                <div className="bg-tastelanc-surface/50 rounded px-2 py-1.5">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Users className="w-3 h-3 text-tastelanc-text-faint" />
                  </div>
                  <div className="text-sm font-semibold text-tastelanc-text-primary">
                    {ref.uniqueVisitors.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-tastelanc-text-muted uppercase tracking-wide">
                    Visitors
                  </div>
                </div>

                <div className="bg-tastelanc-surface/50 rounded px-2 py-1.5">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Activity className="w-3 h-3 text-tastelanc-text-faint" />
                  </div>
                  <div className="text-sm font-semibold text-tastelanc-text-primary">
                    {ref.avgPagesPerSession}
                  </div>
                  <div className="text-[10px] text-tastelanc-text-muted uppercase tracking-wide">
                    Pages/Session
                  </div>
                </div>

                <div className="bg-tastelanc-surface/50 rounded px-2 py-1.5">
                  <div className="text-sm font-semibold text-tastelanc-text-primary">
                    {ref.bounceRate !== null ? `${ref.bounceRate}%` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-tastelanc-text-muted uppercase tracking-wide">
                    Bounce
                  </div>
                </div>
              </div>

              {/* ROI Insight */}
              <div className="mt-2 pt-2 border-t border-tastelanc-border/50">
                <p className="text-xs text-tastelanc-text-muted">
                  {isHighQuality && (
                    <span className="text-green-600 font-medium">
                      💚 High-value traffic: Strong engagement & low bounce rate
                    </span>
                  )}
                  {isMediumQuality && !isHighQuality && (
                    <span className="text-amber-600 font-medium">
                      ⚡ Decent engagement - consider optimizing landing pages
                    </span>
                  )}
                  {!isMediumQuality && (
                    <span className="text-tastelanc-text-muted">
                      💡 Opportunity: Improve landing page relevance or target better audience
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
