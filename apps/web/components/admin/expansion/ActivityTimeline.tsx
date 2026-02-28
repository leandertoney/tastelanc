'use client';

import type { ActivityLogEntry, ExpansionAction } from '@/lib/ai/expansion-types';

function getRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

const ACTION_DOT_COLORS: Record<string, string> = {
  city_added: 'bg-gray-400',
  research_started: 'bg-blue-400',
  research_completed: 'bg-blue-500',
  brand_generated: 'bg-purple-400',
  brand_selected: 'bg-purple-500',
  brand_regenerated: 'bg-purple-400',
  job_listing_generated: 'bg-yellow-400',
  job_listing_approved: 'bg-green-400',
  job_listing_rejected: 'bg-red-400',
  city_approved: 'bg-green-500',
  city_rejected: 'bg-red-500',
  city_put_on_hold: 'bg-gray-400',
  market_created: 'bg-emerald-500',
  status_changed: 'bg-orange-400',
  note_added: 'bg-gray-400',
};

interface ActivityTimelineProps {
  activities: ActivityLogEntry[];
}

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-8 text-center">
        <p className="text-gray-500">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {activities.map((entry, index) => {
        const isLast = index === activities.length - 1;
        const dotColor = ACTION_DOT_COLORS[entry.action] || 'bg-gray-400';

        return (
          <div key={entry.id} className="flex gap-4">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-3 h-3 rounded-full mt-1.5 ${dotColor}`} />
              {!isLast && <div className="w-px flex-1 bg-tastelanc-surface-light min-h-[2rem]" />}
            </div>

            {/* Content */}
            <div className="pb-6 min-w-0 flex-1">
              <p className="text-sm text-gray-300 leading-relaxed">
                {entry.description || entry.action.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {getRelativeTime(entry.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
