'use client';

import { ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui';
import Link from 'next/link';

interface QuickWin {
  action: string;
  impact: string;
  estimate: string;
  priority: number;
}

interface QuickWinsCardProps {
  wins: QuickWin[];
  restaurantSlug?: string;
}

export function QuickWinsCard({ wins, restaurantSlug }: QuickWinsCardProps) {
  if (!wins || wins.length === 0) {
    return null;
  }

  const getActionLink = (action: string): string | null => {
    if (action.includes('photo')) return `/dashboard/${restaurantSlug}/photos`;
    if (action.includes('happy hour')) return `/dashboard/${restaurantSlug}/happy-hours`;
    if (action.includes('event')) return `/dashboard/${restaurantSlug}/events`;
    return null;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-tastelanc-text-secondary" />
        <h3 className="font-semibold text-tastelanc-text-primary">Highest-Impact Actions</h3>
      </div>

      <div className="space-y-3">
        {wins.map((win, index) => {
          const actionLink = getActionLink(win.action);

          const content = (
            <div className="group p-4 rounded-lg border border-tastelanc-border hover:border-tastelanc-accent hover:bg-tastelanc-surface/30 transition-all cursor-pointer">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium text-tastelanc-text-primary mb-1">{win.action}</div>
                  <div className="text-sm text-tastelanc-text-secondary mb-2">{win.impact}</div>
                  <div className="flex items-center gap-1 text-xs text-tastelanc-text-muted">
                    <Clock className="w-3 h-3" />
                    <span>{win.estimate}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-1 text-tastelanc-text-secondary group-hover:text-tastelanc-accent transition-colors">
                    <span className="text-sm font-medium">Start</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          );

          return actionLink ? (
            <Link key={index} href={actionLink}>
              {content}
            </Link>
          ) : (
            <div key={index}>{content}</div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-tastelanc-border">
        <p className="text-xs text-tastelanc-text-muted">
          Based on performance data from similar restaurants in your category
        </p>
      </div>
    </Card>
  );
}
