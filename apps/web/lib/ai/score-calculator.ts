// ─────────────────────────────────────────────────────────
// Programmatic Sub-Score Calculator
//
// Replaces AI-guessed sub-scores with deterministic formulas
// computed from real data (Census, College Scorecard, BEA,
// Google Places, Overpass).
//
// Each formula outputs 0-100 clamped score plus a prose
// explanation showing the actual data that drove the score.
// ─────────────────────────────────────────────────────────

import type {
  MarketSubScores,
  SubScoreReasoning,
  CollegeInfo,
  TourismEconomicData,
  CensusExtendedInfo,
  VenueBreakdown,
} from './expansion-types';

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

// ─────────────────────────────────────────────────────────
// Input data for the calculator
// ─────────────────────────────────────────────────────────

export interface ScoreInputs {
  // Census basic
  population: number;
  cluster_population?: number;
  median_income: number;
  median_age: number;
  // Census extended
  census_extended?: CensusExtendedInfo | null;
  // College Scorecard
  colleges?: CollegeInfo[] | null;
  total_college_enrollment?: number;
  has_research_university?: boolean;
  has_four_year?: boolean;
  // BEA
  tourism_economic_data?: TourismEconomicData | null;
  // Google Places
  google_places_restaurant_count?: number;
  google_places_bar_count?: number;
  // Overpass
  venue_breakdown?: VenueBreakdown | null;
  cuisine_diversity?: number; // number of distinct cuisine types
}

export interface ScoreResult {
  sub_scores: MarketSubScores;
  sub_score_reasoning: SubScoreReasoning;
}

// ─────────────────────────────────────────────────────────
// Individual score formulas
// ─────────────────────────────────────────────────────────

function scorePopulationDensity(inputs: ScoreInputs): { score: number; reasoning: string } {
  const pop = inputs.cluster_population || inputs.population;
  const age = inputs.median_age;
  const educationPct = inputs.census_extended?.bachelors_degree_pct;

  // Base score from population (logarithmic scale)
  // 30k = ~35, 50k = ~45, 100k = ~55, 200k = ~65, 500k = ~78
  let score = Math.log10(Math.max(pop, 1000)) * 22 - 44;

  // Young median age bonus (< 35 is ideal for dining apps)
  if (age > 0 && age < 33) score += 8;
  else if (age < 36) score += 4;
  else if (age > 42) score -= 5;

  // Education bonus (higher education = more dining culture)
  if (educationPct && educationPct > 35) score += 6;
  else if (educationPct && educationPct > 25) score += 3;

  const parts: string[] = [`${pop.toLocaleString()} ${inputs.cluster_population ? 'cluster' : 'city'} population`];
  if (age > 0) parts.push(`median age ${age}`);
  if (educationPct) parts.push(`${educationPct}% bachelor's+`);

  return {
    score: clamp(score),
    reasoning: `Score ${clamp(score)}: ${parts.join(', ')}.`,
  };
}

function scoreDiningScene(inputs: ScoreInputs): { score: number; reasoning: string } {
  const pop = inputs.cluster_population || inputs.population;
  const googleRestaurants = inputs.google_places_restaurant_count || 0;
  const googleBars = inputs.google_places_bar_count || 0;
  const osmRestaurants = inputs.venue_breakdown?.restaurants || 0;
  const osmBars = inputs.venue_breakdown?.bars || 0;
  const cuisineDiversity = inputs.cuisine_diversity || 0;

  // Use the higher of Google Places vs Overpass for restaurant count
  const restaurants = Math.max(googleRestaurants, osmRestaurants);
  const bars = Math.max(googleBars, osmBars);

  // Restaurants per 10k people (target: 20-40 is good)
  const restaurantsPerCapita = pop > 0 ? (restaurants / pop) * 10000 : 0;

  // Base score from restaurant density
  let score: number;
  if (restaurantsPerCapita >= 30) score = 80;
  else if (restaurantsPerCapita >= 20) score = 70;
  else if (restaurantsPerCapita >= 12) score = 60;
  else if (restaurantsPerCapita >= 6) score = 45;
  else score = 30;

  // Cuisine diversity bonus
  if (cuisineDiversity >= 12) score += 10;
  else if (cuisineDiversity >= 8) score += 6;
  else if (cuisineDiversity >= 4) score += 3;

  // Bar ratio bonus (bars/restaurants > 0.3 = active nightlife)
  const barRatio = restaurants > 0 ? bars / restaurants : 0;
  if (barRatio > 0.4) score += 5;
  else if (barRatio > 0.25) score += 3;

  const parts: string[] = [];
  if (googleRestaurants > 0) parts.push(`${googleRestaurants} Google Places restaurants`);
  if (osmRestaurants > 0) parts.push(`${osmRestaurants} OSM restaurants`);
  if (restaurants > 0) parts.push(`${restaurantsPerCapita.toFixed(1)} per 10k residents`);
  if (cuisineDiversity > 0) parts.push(`${cuisineDiversity} cuisine types`);
  if (bars > 0) parts.push(`${bars} bars/pubs`);

  return {
    score: clamp(score),
    reasoning: `Score ${clamp(score)}: ${parts.join(', ')}.`,
  };
}

function scoreCompetition(inputs: ScoreInputs): { score: number; reasoning: string } {
  const pop = inputs.cluster_population || inputs.population;

  // Start at 80 (no hyperlocal dining apps in most small-mid cities)
  let score = 80;

  // Population penalty — larger cities are more likely to have competitors
  if (pop > 500000) score -= 25;
  else if (pop > 300000) score -= 15;
  else if (pop > 200000) score -= 10;
  else if (pop > 100000) score -= 5;

  // The actual competitive landscape (specific apps, local blogs, etc.)
  // is still best assessed by AI prose — we just set the base score here
  const parts: string[] = [
    `Base 80 (no known hyperlocal dining apps in most markets this size)`,
  ];
  if (pop > 200000) parts.push(`-${pop > 300000 ? 15 : 10} for larger metro (more likely to have competitors)`);

  return {
    score: clamp(score),
    reasoning: `Score ${clamp(score)}: ${parts.join('. ')}.`,
  };
}

function scoreCollegePresence(inputs: ScoreInputs): { score: number; reasoning: string } {
  const colleges = inputs.colleges || [];
  const totalEnrollment = inputs.total_college_enrollment || 0;
  const hasResearch = inputs.has_research_university || false;
  const hasFourYear = inputs.has_four_year || false;

  if (colleges.length === 0) {
    return { score: 15, reasoning: 'Score 15: No colleges found in the area.' };
  }

  // Base score from total enrollment
  let score: number;
  if (totalEnrollment >= 30000) score = 85;
  else if (totalEnrollment >= 15000) score = 70;
  else if (totalEnrollment >= 8000) score = 58;
  else if (totalEnrollment >= 3000) score = 45;
  else score = 30;

  // Research university bonus
  if (hasResearch) score += 10;

  // Multiple 4-year institution bonus
  const fourYearCount = colleges.filter(
    c => c.degree_level === "Bachelor's" || c.degree_level === 'Graduate'
  ).length;
  if (fourYearCount >= 3) score += 5;

  const topColleges = colleges.slice(0, 3).map(c => `${c.name} (${c.enrollment.toLocaleString()})`);

  const parts: string[] = [
    `${colleges.length} institution${colleges.length > 1 ? 's' : ''}`,
    `${totalEnrollment.toLocaleString()} total enrollment`,
  ];
  if (hasResearch) parts.push('includes R1/R2 research university');
  parts.push(`Top: ${topColleges.join(', ')}`);

  return {
    score: clamp(score),
    reasoning: `Score ${clamp(score)}: ${parts.join('. ')}.`,
  };
}

function scoreTourism(inputs: ScoreInputs): { score: number; reasoning: string } {
  const tourism = inputs.tourism_economic_data;

  if (!tourism || tourism.hospitality_gdp_millions === null) {
    return { score: 40, reasoning: 'Score 40: No BEA economic data available (default).' };
  }

  const hospitalityGdp = tourism.hospitality_gdp_millions;
  const pctOfGdp = tourism.hospitality_pct_of_gdp;

  // Score from hospitality % of GDP (national avg ~4%)
  let score: number;
  if (pctOfGdp !== null) {
    if (pctOfGdp >= 10) score = 90;
    else if (pctOfGdp >= 7) score = 78;
    else if (pctOfGdp >= 5) score = 65;
    else if (pctOfGdp >= 3) score = 50;
    else score = 35;
  } else {
    score = 40;
  }

  // Absolute GDP size bonus
  if (hospitalityGdp >= 1000) score += 5;
  else if (hospitalityGdp >= 500) score += 3;

  const arts = tourism.arts_entertainment_gdp_millions;

  const parts: string[] = [];
  parts.push(`Hospitality GDP: $${hospitalityGdp.toLocaleString()}M`);
  if (pctOfGdp !== null) parts.push(`${pctOfGdp}% of county economy`);
  if (arts !== null) parts.push(`Arts/Entertainment: $${arts.toLocaleString()}M`);
  if (tourism.year) parts.push(`(${tourism.year} data)`);

  return {
    score: clamp(score),
    reasoning: `Score ${clamp(score)}: ${parts.join(', ')}.`,
  };
}

function scoreIncomeLevel(inputs: ScoreInputs): { score: number; reasoning: string } {
  const income = inputs.median_income;
  const ext = inputs.census_extended;
  const homeValue = ext?.median_home_value;
  const rent = ext?.median_gross_rent;
  const rentToIncome = ext?.rent_to_income_ratio;

  // Base score from median income
  // $40k = ~40, $55k = ~55, $70k = ~68, $85k = ~78, $100k+ = ~85
  let score: number;
  if (income >= 100000) score = 85;
  else if (income >= 80000) score = 75;
  else if (income >= 65000) score = 65;
  else if (income >= 50000) score = 55;
  else if (income >= 40000) score = 42;
  else score = 30;

  // Affordability bonus (low rent-to-income = more disposable income for dining)
  if (rentToIncome != null) {
    if (rentToIncome < 0.25) score += 8;
    else if (rentToIncome < 0.30) score += 4;
    else if (rentToIncome > 0.40) score -= 5;
  }

  const parts: string[] = [`Median income: $${income.toLocaleString()}`];
  if (homeValue) parts.push(`home value: $${homeValue.toLocaleString()}`);
  if (rent) parts.push(`rent: $${rent.toLocaleString()}/mo`);
  if (rentToIncome != null) parts.push(`rent-to-income: ${(rentToIncome * 100).toFixed(0)}%`);

  return {
    score: clamp(score),
    reasoning: `Score ${clamp(score)}: ${parts.join(', ')}.`,
  };
}

// ─────────────────────────────────────────────────────────
// Main calculator
// ─────────────────────────────────────────────────────────

export function calculateSubScores(inputs: ScoreInputs): ScoreResult {
  const pop = scorePopulationDensity(inputs);
  const dining = scoreDiningScene(inputs);
  const competition = scoreCompetition(inputs);
  const college = scoreCollegePresence(inputs);
  const tourism = scoreTourism(inputs);
  const income = scoreIncomeLevel(inputs);

  return {
    sub_scores: {
      population_density: pop.score,
      dining_scene: dining.score,
      competition: competition.score,
      college_presence: college.score,
      tourism: tourism.score,
      income_level: income.score,
    },
    sub_score_reasoning: {
      population_density: pop.reasoning,
      dining_scene: dining.reasoning,
      competition: competition.reasoning,
      college_presence: college.reasoning,
      tourism: tourism.reasoning,
      income_level: income.reasoning,
    },
  };
}
