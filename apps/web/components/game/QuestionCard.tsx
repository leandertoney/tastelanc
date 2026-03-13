'use client';

import { type QuestionCategory } from '@/lib/game/types';

interface QuestionCardProps {
  statement: string;
  restaurantName: string;
  category: QuestionCategory;
  index: number;
  total: number;
}

const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  happy_hour: 'Happy Hour',
  special: 'Specials',
  event: 'Events',
  vibe: 'Vibe Check',
  cuisine: 'Cuisine',
};

const CATEGORY_COLORS: Record<QuestionCategory, string> = {
  happy_hour: 'bg-amber-500/30 text-amber-200 border border-amber-500/30',
  special: 'bg-purple-500/30 text-purple-200 border border-purple-500/30',
  event: 'bg-blue-500/30 text-blue-200 border border-blue-500/30',
  vibe: 'bg-pink-500/30 text-pink-200 border border-pink-500/30',
  cuisine: 'bg-green-500/30 text-green-200 border border-green-500/30',
};

export function QuestionCard({ statement, restaurantName, category, index, total }: QuestionCardProps) {
  return (
    <div className="w-full h-full flex flex-col justify-end px-6 pb-8 pt-6 select-none">
      {/* Top: question counter */}
      <div className="absolute top-5 left-0 right-0 flex justify-center">
        <span className="text-xs text-white/40 font-medium">
          {index + 1} of {total}
        </span>
      </div>

      {/* Bottom: content stacked */}
      <span className={`self-start text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-3 backdrop-blur-sm ${CATEGORY_COLORS[category]}`}>
        {CATEGORY_LABELS[category]}
      </span>

      <h2 className="text-sm font-bold text-white/70 mb-2 drop-shadow-lg">
        {restaurantName}
      </h2>

      <p className="text-2xl font-serif font-bold text-white leading-snug drop-shadow-lg">
        {statement}
      </p>
    </div>
  );
}
