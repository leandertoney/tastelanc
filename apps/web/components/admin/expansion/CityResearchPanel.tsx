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
  ExternalLink,
  CheckCircle2,
  Bot,
  Home,
  TrendingUp,
  Star,
  Coffee,
  Beer,
  Utensils,
} from 'lucide-react';
import { useState } from 'react';
import type {
  ExpansionCity,
  MarketSubScores,
  ResearchSource,
  CollegeInfo,
  TourismEconomicData,
  CensusExtendedInfo,
  VenueBreakdown,
  CuisineEntry,
} from '@/lib/ai/expansion-types';
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
// Data Completeness Bar
// ─────────────────────────────────────────────────────────

function DataCompletenessBar({ completeness }: { completeness: Record<string, boolean> }) {
  const sources = [
    { key: 'census', label: 'Census', color: 'emerald' },
    { key: 'census_extended', label: 'Housing/Education', color: 'emerald' },
    { key: 'college_scorecard', label: 'Colleges', color: 'blue' },
    { key: 'bea', label: 'BEA Economy', color: 'purple' },
    { key: 'google_places', label: 'Google Places', color: 'blue' },
    { key: 'overpass', label: 'OpenStreetMap', color: 'teal' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {sources.map(({ key, label, color }) => {
        const ok = completeness[key];
        return (
          <span
            key={key}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
              ok
                ? `bg-${color}-500/20 text-${color}-400`
                : 'bg-gray-700/30 text-gray-600'
            }`}
            style={ok ? {} : { opacity: 0.6 }}
          >
            {ok ? <CheckCircle2 className="w-3 h-3" /> : null}
            {label}
            {!ok && ' —'}
          </span>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// College Grid
// ─────────────────────────────────────────────────────────

function CollegeGrid({ colleges }: { colleges: CollegeInfo[] }) {
  if (!colleges || colleges.length === 0) return null;
  const totalEnrollment = colleges.reduce((sum, c) => sum + c.enrollment, 0);

  return (
    <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-tastelanc-accent" />
          Colleges & Universities
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full font-medium">
            College Scorecard
          </span>
        </h4>
        <span className="text-xs text-gray-500">
          {colleges.length} institutions &middot; {totalEnrollment.toLocaleString()} total enrollment
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {colleges.map((college, i) => {
          const isSeminarTarget = (college.degree_level === "Bachelor's" || college.degree_level === 'Graduate') && college.enrollment >= 2000;

          return (
            <div
              key={i}
              className={`bg-tastelanc-surface-light rounded-lg p-3 ${
                isSeminarTarget ? 'border border-tastelanc-accent/30' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-white leading-tight">{college.name}</span>
                {college.is_research_university && (
                  <span className="flex-shrink-0" aria-label="Research University">
                    <Star className="w-4 h-4 text-yellow-400" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400">{college.enrollment.toLocaleString()} students</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  college.type === 'public'
                    ? 'bg-blue-500/20 text-blue-400'
                    : college.type === 'private_nonprofit'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {college.type === 'public' ? 'Public' : college.type === 'private_nonprofit' ? 'Private' : 'For-Profit'}
                </span>
                <span className="text-[10px] text-gray-600">{college.degree_level}</span>
                {isSeminarTarget && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-tastelanc-accent/20 text-tastelanc-accent rounded-full font-medium">
                    Hiring Seminar Target
                  </span>
                )}
              </div>
              {college.city && (
                <span className="text-[10px] text-gray-600 mt-1 block">{college.city}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Tourism & Economy Panel
// ─────────────────────────────────────────────────────────

function TourismEconomyPanel({ data }: { data: TourismEconomicData }) {
  return (
    <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5">
      <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-tastelanc-accent" />
        Tourism & Economy
        <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full font-medium">
          BEA {data.year || 'N/A'}
        </span>
      </h4>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.hospitality_gdp_millions !== null && (
          <div className="bg-tastelanc-surface-light rounded-lg p-3">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Hospitality GDP</span>
            <p className="text-lg font-bold text-white">${data.hospitality_gdp_millions.toLocaleString()}M</p>
            {data.hospitality_pct_of_gdp !== null && (
              <p className="text-[11px] text-gray-500">{data.hospitality_pct_of_gdp}% of county economy</p>
            )}
          </div>
        )}

        {data.arts_entertainment_gdp_millions !== null && (
          <div className="bg-tastelanc-surface-light rounded-lg p-3">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Arts/Entertainment GDP</span>
            <p className="text-lg font-bold text-white">${data.arts_entertainment_gdp_millions.toLocaleString()}M</p>
          </div>
        )}

        {data.total_county_gdp_millions !== null && (
          <div className="bg-tastelanc-surface-light rounded-lg p-3">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Total County GDP</span>
            <p className="text-lg font-bold text-white">${data.total_county_gdp_millions.toLocaleString()}M</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Venue Breakdown Panel
// ─────────────────────────────────────────────────────────

function VenueBreakdownPanel({
  venueBreakdown,
  cuisineDistribution,
  googleRestaurants,
  googleBars,
}: {
  venueBreakdown: VenueBreakdown;
  cuisineDistribution: CuisineEntry[];
  googleRestaurants?: number;
  googleBars?: number;
}) {
  const venueTypes = [
    { key: 'restaurants', label: 'Restaurants', icon: Utensils, count: venueBreakdown.restaurants },
    { key: 'bars', label: 'Bars', icon: Beer, count: venueBreakdown.bars },
    { key: 'cafes', label: 'Cafes', icon: Coffee, count: venueBreakdown.cafes },
    { key: 'pubs', label: 'Pubs', icon: Wine, count: venueBreakdown.pubs },
    { key: 'fast_food', label: 'Fast Food', icon: UtensilsCrossed, count: venueBreakdown.fast_food },
  ].filter(v => v.count > 0);

  return (
    <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5">
      <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        <UtensilsCrossed className="w-4 h-4 text-tastelanc-accent" />
        Venue Breakdown
        <span className="text-[10px] px-1.5 py-0.5 bg-teal-500/20 text-teal-400 rounded-full font-medium">
          OpenStreetMap
        </span>
      </h4>

      {/* Cross-reference with Google */}
      {(googleRestaurants || googleBars) ? (
        <p className="text-[11px] text-gray-500 mb-3">
          Cross-reference: Google Places {googleRestaurants?.toLocaleString() || '?'} restaurants, {googleBars?.toLocaleString() || '?'} bars
          &bull; OSM {venueBreakdown.restaurants} restaurants, {venueBreakdown.bars} bars
        </p>
      ) : null}

      {/* Venue type bars */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {venueTypes.map(({ key, label, icon: Icon, count }) => (
          <div key={key} className="bg-tastelanc-surface-light rounded-lg p-2 text-center">
            <Icon className="w-4 h-4 text-gray-500 mx-auto mb-1" />
            <p className="text-sm font-bold text-white">{count}</p>
            <p className="text-[10px] text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Cuisine distribution */}
      {cuisineDistribution && cuisineDistribution.length > 0 && (
        <div>
          <h5 className="text-xs text-gray-500 mb-2">Top Cuisines</h5>
          <div className="flex flex-wrap gap-1.5">
            {cuisineDistribution.slice(0, 12).map((c, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 bg-tastelanc-surface-light text-gray-300 rounded-full"
              >
                {c.cuisine} <span className="text-gray-600">({c.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}
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

  // Deep research structured data
  const dataCompleteness = (rd.data_completeness as Record<string, boolean>) || {};
  const hasDeepResearch = Object.keys(dataCompleteness).length > 0;
  const colleges = (rd.colleges as CollegeInfo[]) || [];
  const tourismEcon = rd.tourism_economic_data as TourismEconomicData | undefined;
  const censusExt = rd.census_extended as CensusExtendedInfo | undefined;
  const venueBreakdown = rd.venue_breakdown as VenueBreakdown | undefined;
  const cuisineDistribution = (rd.cuisine_distribution as CuisineEntry[]) || [];

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
      {/* Data Completeness Bar */}
      {hasDeepResearch && (
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-tastelanc-accent" />
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Data Sources Collected</h4>
          </div>
          <DataCompletenessBar completeness={dataCompleteness} />
        </div>
      )}

      {/* Regional cluster info */}
      {clusterTowns.length > 0 && (
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-tastelanc-accent" />
            <h4 className="text-sm font-medium text-gray-300">Regional Cluster</h4>
            {regionName && (
              <span className="text-xs px-2 py-0.5 bg-tastelanc-accent/20 text-tastelanc-accent rounded-full font-medium">
                {regionName}
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

      {/* Stats grid (expanded with housing/education data) */}
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
        {/* Extended census stats */}
        {censusExt?.median_home_value && (
          <StatCard
            icon={Home}
            label="Home Value"
            value={`$${censusExt.median_home_value.toLocaleString()}`}
            badge="Census"
          />
        )}
        {censusExt?.median_gross_rent && (
          <StatCard
            icon={DollarSign}
            label="Median Rent"
            value={`$${censusExt.median_gross_rent.toLocaleString()}/mo`}
            badge="Census"
          />
        )}
        {censusExt?.bachelors_degree_pct && (
          <StatCard
            icon={GraduationCap}
            label="Bachelor's+"
            value={`${censusExt.bachelors_degree_pct}%`}
            badge="Census"
          />
        )}
        {censusExt?.rent_to_income_ratio && (
          <StatCard
            icon={TrendingUp}
            label="Rent/Income"
            value={`${(censusExt.rent_to_income_ratio * 100).toFixed(0)}%`}
            subValue={censusExt.rent_to_income_ratio < 0.30 ? 'Affordable' : censusExt.rent_to_income_ratio > 0.35 ? 'High cost' : 'Moderate'}
          />
        )}
      </div>

      {/* Venue Breakdown + Cuisine Distribution */}
      {venueBreakdown && venueBreakdown.total_dining > 0 && (
        <VenueBreakdownPanel
          venueBreakdown={venueBreakdown}
          cuisineDistribution={cuisineDistribution}
          googleRestaurants={googleValidated ? (rd.google_places_restaurant_count as number) : undefined}
          googleBars={googleValidated ? (rd.google_places_bar_count as number) : undefined}
        />
      )}

      {/* College Cards Grid */}
      {colleges.length > 0 && <CollegeGrid colleges={colleges} />}

      {/* Tourism & Economy Panel */}
      {tourismEcon && (tourismEcon.hospitality_gdp_millions !== null || tourismEcon.total_county_gdp_millions !== null) && (
        <TourismEconomyPanel data={tourismEcon} />
      )}

      {/* Data Sources */}
      {(() => {
        const sources = (rd.sources as ResearchSource[] | undefined) || [];
        if (sources.length === 0) return null;

        return (
          <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5">
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-gray-500" />
              All Data Sources ({sources.length})
            </h4>
            <div className="space-y-2">
              {sources.map((source, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 font-medium truncate">{source.name}</span>
                      {source.source_type === 'verified' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      ) : source.name?.includes('Census') || source.name?.includes('Google') || source.name?.includes('College') || source.name?.includes('BEA') || source.name?.includes('OpenStreetMap') ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Bot className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-gray-500">{source.data_point}</span>
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tastelanc-accent hover:text-tastelanc-accent/80 flex-shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Prose sections (AI synthesized from real data) */}
      <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5 space-y-5">
        {hasDeepResearch && (
          <p className="text-[10px] text-gray-600 uppercase tracking-wide flex items-center gap-1">
            <Bot className="w-3 h-3" /> AI-synthesized from verified data
          </p>
        )}
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
