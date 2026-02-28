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
  GraduationCap,
  Shield,
  Plane,
  ChevronDown,
  ChevronUp,
  MapPin,
} from 'lucide-react';
import { useState } from 'react';
import type { ExpansionCity, MarketSubScores } from '@/lib/ai/expansion-types';
import { SCORING_WEIGHTS } from '@/lib/ai/expansion-agent';

interface CityResearchPanelProps {
  city: ExpansionCity;
  onReResearch: () => void;
  isResearching?: boolean;
}

// ─────────────────────────────────────────────────────────
// Score category config
// ─────────────────────────────────────────────────────────

const SCORE_CATEGORIES: {
  key: keyof MarketSubScores;
  label: string;
  weightPct: number;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'dining_scene',       label: 'Dining Scene Quality',   weightPct: 25, icon: UtensilsCrossed },
  { key: 'population_density', label: 'Population & Density',   weightPct: 20, icon: Users },
  { key: 'competition',        label: 'Low Competition',        weightPct: 15, icon: Shield },
  { key: 'college_presence',   label: 'College Presence',       weightPct: 15, icon: GraduationCap },
  { key: 'income_level',       label: 'Income Level',           weightPct: 15, icon: DollarSign },
  { key: 'tourism',            label: 'Tourism Factors',        weightPct: 10, icon: Plane },
];

function scoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function scoreLabel(score: number): string {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Moderate';
  return 'Low';
}

// ─────────────────────────────────────────────────────────
// Score breakdown (new)
// ─────────────────────────────────────────────────────────

function ScoreBreakdown({ city }: { city: ExpansionCity }) {
  const [expanded, setExpanded] = useState(true);
  const subScores = city.research_data?.sub_scores as MarketSubScores | undefined;
  const reasoning = city.research_data?.sub_score_reasoning as Record<string, string> | undefined;
  const overallScore = city.market_potential_score ?? 0;

  return (
    <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5">
      {/* Overall score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-gray-300">Market Potential Score</span>
          <span className="text-sm font-bold text-white">
            {overallScore}/100{' '}
            <span className="text-xs font-normal" style={{ color: scoreColor(overallScore) }}>
              {scoreLabel(overallScore)}
            </span>
          </span>
        </div>
        <div className="w-full h-3 bg-tastelanc-surface-light rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${overallScore}%`, backgroundColor: scoreColor(overallScore) }}
          />
        </div>
      </div>

      {/* Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Hide' : 'Show'} Score Breakdown
      </button>

      {/* Sub-score bars */}
      {expanded && subScores && (
        <div className="space-y-3">
          {SCORE_CATEGORIES.map(({ key, label, weightPct, icon: Icon }) => {
            const score = subScores[key] ?? 0;
            const reason = reasoning?.[key];

            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-400">
                      {label} <span className="text-gray-600">({weightPct}%)</span>
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-300">{score}/100</span>
                </div>
                <div className="w-full h-2 bg-tastelanc-surface-light rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${score}%`, backgroundColor: scoreColor(score) }}
                  />
                </div>
                {reason && (
                  <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{reason}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Legacy single score bar (backward compat)
// ─────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-300">Market Potential Score</span>
        <span className="text-sm font-bold text-white">
          {score}/100{' '}
          <span className="text-xs font-normal" style={{ color: scoreColor(score) }}>
            {scoreLabel(score)}
          </span>
        </span>
      </div>
      <div className="w-full h-3 bg-tastelanc-surface-light rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: scoreColor(score) }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Shared components
// ─────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  badge,
  subValue,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | null;
  badge?: string;
  subValue?: string;
}) {
  if (value === null || value === undefined) return null;
  return (
    <div className="bg-tastelanc-surface-light rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-tastelanc-accent" />
        <span className="text-xs text-gray-500">{label}</span>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">
            {badge}
          </span>
        )}
      </div>
      <p className="text-lg font-bold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subValue && (
        <p className="text-[11px] text-gray-600 mt-0.5">{subValue}</p>
      )}
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

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

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
  const hasSubScores = rd.sub_scores && typeof rd.sub_scores === 'object' && Object.keys(rd.sub_scores).length > 0;
  const googleValidated = rd.google_places_validated === true;
  const clusterTowns = (rd.cluster_towns as string[]) || [];
  const regionName = rd.suggested_region_name as string | undefined;
  const clusterPop = rd.cluster_population as number | undefined;

  // Build restaurant/bar stat labels
  const restaurantBadge = googleValidated ? 'Google' : undefined;
  const barBadge = googleValidated ? 'Google' : undefined;
  const restaurantSub = googleValidated && rd.ai_estimated_restaurant_count
    ? `AI est: ${(rd.ai_estimated_restaurant_count as number).toLocaleString()}`
    : undefined;
  const barSub = googleValidated && rd.ai_estimated_bar_count
    ? `AI est: ${(rd.ai_estimated_bar_count as number).toLocaleString()}`
    : undefined;

  return (
    <div className="space-y-6">
      {/* Regional cluster info */}
      {clusterTowns.length > 0 && (
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-tastelanc-accent" />
            <h4 className="text-sm font-medium text-gray-300">Regional Cluster</h4>
            {regionName && (
              <span className="text-xs px-2 py-0.5 bg-tastelanc-accent/20 text-tastelanc-accent rounded-full font-medium">
                Taste{regionName.replace(/\s+/g, '')}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {clusterTowns.map((town, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-tastelanc-surface-light text-gray-300 text-xs rounded-full"
              >
                {town}
              </span>
            ))}
          </div>
          {clusterPop && (
            <p className="text-xs text-gray-500 mt-1">
              Combined population: {clusterPop.toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Score — sub-score breakdown or legacy single bar */}
      {city.market_potential_score !== null && (
        hasSubScores ? (
          <ScoreBreakdown city={city} />
        ) : (
          <ScoreBar score={city.market_potential_score} />
        )
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
        <StatCard
          icon={UtensilsCrossed}
          label="Restaurants"
          value={city.restaurant_count}
          badge={restaurantBadge}
          subValue={restaurantSub}
        />
        <StatCard
          icon={Wine}
          label="Bars"
          value={city.bar_count}
          badge={barBadge}
          subValue={barSub}
        />
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
