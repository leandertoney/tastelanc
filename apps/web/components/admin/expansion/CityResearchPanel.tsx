'use client';

import {
  Users,
  DollarSign,
  Calendar,
  UtensilsCrossed,
  Wine,
  RefreshCw,
  Loader2,
  Search,
} from 'lucide-react';
import type { ExpansionCity } from '@/lib/ai/expansion-types';

interface CityResearchPanelProps {
  city: ExpansionCity;
  onReResearch: () => void;
  isResearching?: boolean;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label =
    score >= 70 ? 'High' : score >= 40 ? 'Moderate' : 'Low';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-300">Market Potential Score</span>
        <span className="text-sm font-bold text-white">
          {score}/100 <span className="text-xs font-normal" style={{ color }}>{label}</span>
        </span>
      </div>
      <div className="w-full h-3 bg-tastelanc-surface-light rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | null;
}) {
  if (value === null || value === undefined) return null;
  return (
    <div className="bg-tastelanc-surface-light rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-tastelanc-accent" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-bold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function TagList({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-300 mb-2">{label}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="px-2.5 py-1 bg-tastelanc-surface-light text-gray-300 text-xs rounded-full"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProseSection({ label, text }: { label: string; text: string | null | undefined }) {
  if (!text) return null;
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-300 mb-1.5">{label}</h4>
      <p className="text-sm text-gray-400 leading-relaxed">{text}</p>
    </div>
  );
}

export default function CityResearchPanel({
  city,
  onReResearch,
  isResearching,
}: CityResearchPanelProps) {
  const hasResearch =
    city.population !== null ||
    city.market_potential_score !== null ||
    city.dining_scene_description !== null;

  if (!hasResearch) {
    return (
      <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-8 text-center">
        <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 mb-4">
          No research data yet. Click Research to get started.
        </p>
        <button
          onClick={onReResearch}
          disabled={isResearching}
          className="px-5 py-2.5 bg-tastelanc-accent text-white rounded-lg text-sm font-medium hover:bg-tastelanc-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
        >
          {isResearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Researching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Research City
            </>
          )}
        </button>
      </div>
    );
  }

  const rd = city.research_data || {};

  return (
    <div className="space-y-6">
      {/* Score bar */}
      {city.market_potential_score !== null && (
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5">
          <ScoreBar score={city.market_potential_score} />
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Population" value={city.population} />
        <StatCard
          icon={DollarSign}
          label="Median Income"
          value={city.median_income ? `$${city.median_income.toLocaleString()}` : null}
        />
        <StatCard icon={Calendar} label="Median Age" value={city.median_age} />
        <StatCard icon={UtensilsCrossed} label="Restaurants" value={city.restaurant_count} />
        <StatCard icon={Wine} label="Bars" value={city.bar_count} />
      </div>

      {/* Prose sections */}
      <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5 space-y-5">
        <ProseSection label="Dining Scene" text={city.dining_scene_description} />
        <ProseSection label="Competition Analysis" text={city.competition_analysis} />
        <ProseSection label="Local Food Traditions" text={rd.local_food_traditions as string | undefined} />
        <ProseSection label="College Presence" text={rd.college_presence as string | undefined} />
        <ProseSection label="Tourism Factors" text={rd.tourism_factors as string | undefined} />
        <ProseSection label="Seasonal Considerations" text={rd.seasonal_considerations as string | undefined} />
        <ProseSection label="Expansion Reasoning" text={rd.expansion_reasoning as string | undefined} />
      </div>

      {/* Tag lists */}
      <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5 space-y-5">
        <TagList label="Key Neighborhoods" items={(rd.key_neighborhoods as string[]) || []} />
        <TagList label="Notable Restaurants" items={(rd.notable_restaurants as string[]) || []} />
      </div>

      {/* Re-research button */}
      <div className="flex justify-end">
        <button
          onClick={onReResearch}
          disabled={isResearching}
          className="px-4 py-2 bg-tastelanc-surface-light text-gray-300 rounded-lg text-sm font-medium hover:bg-tastelanc-surface-light/80 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isResearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Re-Researching...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Re-Research
            </>
          )}
        </button>
      </div>
    </div>
  );
}
