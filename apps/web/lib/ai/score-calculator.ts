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

  const clamped = clamp(score);
  const popLabel = inputs.cluster_population ? 'cluster' : 'city';
  const lines: string[] = [
    `${clamped}/100 — ${pop.toLocaleString()} ${popLabel} population (50k-200k is our sweet spot for early-stage markets).`,
  ];
  if (age > 0) {
    if (age < 33) lines.push(`Median age ${age} — young & dining-active demographic (+8 pts).`);
    else if (age < 36) lines.push(`Median age ${age} — under 36 is dining-active (+4 pts).`);
    else if (age > 42) lines.push(`Median age ${age} — older skewing, less nightlife demand (-5 pts).`);
    else lines.push(`Median age ${age} — moderate, no bonus or penalty.`);
  }
  if (educationPct) {
    if (educationPct > 35) lines.push(`${educationPct}% bachelor's+ — highly educated, strong dining culture (+6 pts).`);
    else if (educationPct > 25) lines.push(`${educationPct}% bachelor's+ — above average education (+3 pts).`);
    else lines.push(`${educationPct}% bachelor's+ — below threshold for education bonus.`);
  }

  return {
    score: clamped,
    reasoning: lines.join('\n'),
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

  const clamped = clamp(score);
  const densityLabel = restaurantsPerCapita >= 30 ? 'high density' :
    restaurantsPerCapita >= 20 ? 'good density' :
    restaurantsPerCapita >= 12 ? 'moderate density' :
    restaurantsPerCapita >= 6 ? 'low density' : 'very low density';

  const lines: string[] = [
    `${clamped}/100 — ${restaurants} restaurants found, ${restaurantsPerCapita.toFixed(1)} per 10k residents (${densityLabel}, target is 20-40).`,
  ];
  if (googleRestaurants > 0 && osmRestaurants > 0) {
    lines.push(`Sources: ${googleRestaurants} via Google Places, ${osmRestaurants} via OpenStreetMap (using higher count).`);
  }
  if (cuisineDiversity > 0) {
    if (cuisineDiversity >= 12) lines.push(`${cuisineDiversity} distinct cuisine types — excellent diversity (+10 pts).`);
    else if (cuisineDiversity >= 8) lines.push(`${cuisineDiversity} distinct cuisine types — good diversity (+6 pts).`);
    else if (cuisineDiversity >= 4) lines.push(`${cuisineDiversity} distinct cuisine types — some variety (+3 pts).`);
    else lines.push(`${cuisineDiversity} distinct cuisine types — limited variety.`);
  }
  if (bars > 0) {
    const ratioLabel = barRatio > 0.4 ? 'very active nightlife (+5 pts)' :
      barRatio > 0.25 ? 'active nightlife (+3 pts)' : 'limited nightlife scene';
    lines.push(`${bars} bars/pubs (${(barRatio * 100).toFixed(0)}% bar ratio — ${ratioLabel}).`);
  }

  return {
    score: clamped,
    reasoning: lines.join('\n'),
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

  const clamped = clamp(score);
  const lines: string[] = [
    `${clamped}/100 — Starting from base 80 (no known hyperlocal dining apps exist in most markets this size).`,
  ];
  if (pop > 500000) lines.push(`Population over 500k — high chance of existing competitors like Yelp/Infatuation locals (-25 pts).`);
  else if (pop > 300000) lines.push(`Population over 300k — moderate chance of existing local dining apps (-15 pts).`);
  else if (pop > 200000) lines.push(`Population over 200k — some competitor risk (-10 pts).`);
  else if (pop > 100000) lines.push(`Population over 100k — slight competitor risk (-5 pts).`);
  else lines.push(`Population under 100k — very low competition risk, ideal for first-mover advantage.`);

  return {
    score: clamped,
    reasoning: lines.join('\n'),
  };
}

function scoreCollegePresence(inputs: ScoreInputs): { score: number; reasoning: string } {
  const colleges = inputs.colleges || [];
  const totalEnrollment = inputs.total_college_enrollment || 0;
  const hasResearch = inputs.has_research_university || false;
  const hasFourYear = inputs.has_four_year || false;

  if (colleges.length === 0) {
    return { score: 15, reasoning: '15/100 — No colleges found in the area. College towns drive dining demand from students and young professionals.' };
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

  const clamped = clamp(score);
  const topColleges = colleges.slice(0, 3).map(c => `${c.name} (${c.enrollment.toLocaleString()})`);

  const enrollLabel = totalEnrollment >= 30000 ? 'major college market' :
    totalEnrollment >= 15000 ? 'strong college presence' :
    totalEnrollment >= 8000 ? 'moderate college presence' :
    totalEnrollment >= 3000 ? 'small college presence' : 'minimal college presence';

  const lines: string[] = [
    `${clamped}/100 — ${colleges.length} institution${colleges.length > 1 ? 's' : ''}, ${totalEnrollment.toLocaleString()} total enrollment (${enrollLabel}).`,
    `Top schools: ${topColleges.join(', ')}.`,
  ];
  if (hasResearch) lines.push(`Includes R1/R2 research university (+10 pts — drives dining culture and young population).`);
  if (fourYearCount >= 3) lines.push(`${fourYearCount} four-year institutions (+5 pts — multiple campuses = broader dining demand).`);

  return {
    score: clamped,
    reasoning: lines.join('\n'),
  };
}

function scoreTourism(inputs: ScoreInputs): { score: number; reasoning: string } {
  const tourism = inputs.tourism_economic_data;

  if (!tourism || tourism.hospitality_gdp_millions === null) {
    return { score: 40, reasoning: '40/100 — No BEA economic data available. Default score applied; tourism impact is unknown.' };
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
  const clamped = clamp(score);

  const pctLabel = pctOfGdp !== null ? (
    pctOfGdp >= 10 ? 'tourism-driven economy' :
    pctOfGdp >= 7 ? 'strong tourism presence' :
    pctOfGdp >= 5 ? 'above-average tourism' :
    pctOfGdp >= 3 ? 'moderate tourism' : 'below-average tourism'
  ) : 'unknown tourism share';

  const lines: string[] = [
    `${clamped}/100 — Hospitality GDP: $${hospitalityGdp.toLocaleString()}M${pctOfGdp !== null ? ` (${pctOfGdp}% of county economy — ${pctLabel}, national avg is ~4%)` : ''}.`,
  ];
  if (hospitalityGdp >= 1000) lines.push(`Large hospitality sector ($1B+) — significant visitor spending (+5 pts).`);
  else if (hospitalityGdp >= 500) lines.push(`Substantial hospitality sector ($500M+) — meaningful visitor spending (+3 pts).`);
  if (arts !== null) lines.push(`Arts & Entertainment GDP: $${arts.toLocaleString()}M — indicates cultural attractions that drive dining.`);
  if (tourism.year) lines.push(`Data from ${tourism.year} BEA county-level economic analysis.`);

  return {
    score: clamped,
    reasoning: lines.join('\n'),
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

  const clamped = clamp(score);
  const incomeLabel = income >= 100000 ? 'high income market' :
    income >= 80000 ? 'above-average income' :
    income >= 65000 ? 'solid middle-class' :
    income >= 50000 ? 'moderate income' :
    income >= 40000 ? 'below-average income' : 'low income market';

  const lines: string[] = [
    `${clamped}/100 — Median household income: $${income.toLocaleString()} (${incomeLabel}).`,
  ];
  if (homeValue) lines.push(`Median home value: $${homeValue.toLocaleString()} — indicates overall area wealth.`);
  if (rent) lines.push(`Median rent: $${rent.toLocaleString()}/mo.`);
  if (rentToIncome != null) {
    const rtiPct = (rentToIncome * 100).toFixed(0);
    if (rentToIncome < 0.25) lines.push(`Rent-to-income: ${rtiPct}% — affordable area, more disposable income for dining out (+8 pts).`);
    else if (rentToIncome < 0.30) lines.push(`Rent-to-income: ${rtiPct}% — reasonable affordability (+4 pts).`);
    else if (rentToIncome > 0.40) lines.push(`Rent-to-income: ${rtiPct}% — cost-burdened area, less dining-out budget (-5 pts).`);
    else lines.push(`Rent-to-income: ${rtiPct}% — average affordability.`);
  }

  return {
    score: clamped,
    reasoning: lines.join('\n'),
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
