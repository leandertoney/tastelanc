'use client';

import { ExternalLink } from 'lucide-react';

interface ReferrerData {
  domain: string;
  count: number;
}

interface TopReferrersTableProps {
  data: ReferrerData[];
}

export default function TopReferrersTable({ data }: TopReferrersTableProps) {
  if (!data.length) {
    return (
      <div className="bg-tastelanc-card rounded-xl p-6 h-full">
        <h3 className="text-tastelanc-text-primary font-semibold mb-4">Top Referrers</h3>
        <div className="h-48 flex items-center justify-center text-tastelanc-text-muted text-sm">
          No referrer data yet
        </div>
      </div>
    );
  }

  const maxCount = data[0]?.count || 1;

  return (
    <div className="bg-tastelanc-card rounded-xl p-6 h-full">
      <h3 className="text-tastelanc-text-primary font-semibold mb-4">Top Referrers</h3>
      <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
        {data.map((ref, i) => (
          <div key={ref.domain}>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-tastelanc-text-faint w-5 text-right flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-tastelanc-text-secondary truncate flex items-center gap-1" title={ref.domain}>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    {ref.domain}
                  </span>
                  <span className="text-tastelanc-text-primary font-medium ml-2 flex-shrink-0">
                    {ref.count.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-tastelanc-surface-light rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${(ref.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
