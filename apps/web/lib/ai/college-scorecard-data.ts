// ─────────────────────────────────────────────────────────
// College Scorecard API Fetcher
//
// Uses the Department of Education College Scorecard API
// to fetch real college/university data for expansion cities.
//
// API docs: https://collegescorecard.ed.gov/data/documentation/
// Key: free from api.data.gov/signup (falls back to DEMO_KEY)
// ─────────────────────────────────────────────────────────

import type { CollegeInfo, ResearchSource } from './expansion-types';

// State abbreviation → full name (needed for API queries)
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

// Ownership codes → type labels
function mapOwnership(code: number): CollegeInfo['type'] {
  switch (code) {
    case 1: return 'public';
    case 2: return 'private_nonprofit';
    case 3: return 'private_forprofit';
    default: return 'private_nonprofit';
  }
}

// Degree predominance codes → labels
function mapDegreeLevel(code: number | null): string {
  switch (code) {
    case 1: return 'Certificate';
    case 2: return "Associate's";
    case 3: return "Bachelor's";
    case 4: return 'Graduate';
    default: return 'Unknown';
  }
}

// Carnegie classification codes for research universities
// 15 = Doctoral Universities: Very High Research Activity (R1)
// 16 = Doctoral Universities: High Research Activity (R2)
function isResearchUniversity(carnegie: number | null): boolean {
  return carnegie === 15 || carnegie === 16;
}

export interface CollegeScorecardResult {
  colleges: CollegeInfo[];
  total_enrollment: number;
  institution_count: number;
  has_research_university: boolean;
  has_four_year: boolean;
  sources: ResearchSource[];
}

/**
 * Fetch college/university data from the College Scorecard API.
 *
 * Queries the anchor city + each cluster town to build a complete
 * picture of the educational institutions in the region.
 */
export async function fetchCollegeScorecardData(
  cityName: string,
  stateAbbr: string,
  clusterTowns?: string[]
): Promise<CollegeScorecardResult | null> {
  const apiKey = process.env.COLLEGE_SCORECARD_API_KEY || 'DEMO_KEY';
  const stateName = STATE_NAMES[stateAbbr.toUpperCase()];
  if (!stateName) {
    console.warn(`[college-scorecard] Unknown state: ${stateAbbr}`);
    return null;
  }

  const now = new Date().toISOString();
  const allCities = [cityName, ...(clusterTowns || [])];
  const allColleges: CollegeInfo[] = [];
  const seenNames = new Set<string>();

  try {
    for (const city of allCities) {
      const params = new URLSearchParams({
        'api_key': apiKey,
        'school.city': city,
        'school.state': stateAbbr.toUpperCase(),
        // Only include currently operating schools
        'school.operating': '1',
        // Fields to return
        'fields': [
          'school.name',
          'school.city',
          'latest.student.enrollment.undergrad_12_month',
          'latest.student.size',
          'school.ownership',
          'school.degrees_awarded.predominant',
          'school.carnegie_basic',
        ].join(','),
        'per_page': '50',
      });

      const url = `https://api.data.gov/ed/collegescorecard/v1/schools?${params}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (!res.ok) {
        console.warn(`[college-scorecard] API returned ${res.status} for ${city}, ${stateAbbr}`);
        continue;
      }

      const data = await res.json();
      const results = data.results || [];

      for (const school of results) {
        const name = school['school.name'];
        if (!name || seenNames.has(name)) continue;
        seenNames.add(name);

        const enrollment =
          school['latest.student.enrollment.undergrad_12_month'] ||
          school['latest.student.size'] ||
          0;

        // Skip very small institutions (< 50 students)
        if (enrollment < 50) continue;

        allColleges.push({
          name,
          city: school['school.city'] || city,
          enrollment,
          type: mapOwnership(school['school.ownership']),
          degree_level: mapDegreeLevel(school['school.degrees_awarded.predominant']),
          is_research_university: isResearchUniversity(school['school.carnegie_basic']),
        });
      }
    }

    if (allColleges.length === 0) {
      console.warn(`[college-scorecard] No colleges found for ${cityName}, ${stateAbbr}`);
      return null;
    }

    // Sort by enrollment descending
    allColleges.sort((a, b) => b.enrollment - a.enrollment);

    const totalEnrollment = allColleges.reduce((sum, c) => sum + c.enrollment, 0);
    const hasFourYear = allColleges.some(
      c => c.degree_level === "Bachelor's" || c.degree_level === 'Graduate'
    );
    const hasResearchUniv = allColleges.some(c => c.is_research_university);

    const sources: ResearchSource[] = [{
      name: 'U.S. Department of Education College Scorecard',
      url: `https://collegescorecard.ed.gov/search/?city=${encodeURIComponent(cityName)}&state=${stateAbbr}`,
      data_point: `${allColleges.length} institutions, ${totalEnrollment.toLocaleString()} total enrollment`,
      accessed_at: now,
      source_type: 'verified',
    }];

    console.log(`[college-scorecard] ${cityName}, ${stateAbbr}: ${allColleges.length} colleges, ${totalEnrollment.toLocaleString()} total enrollment`);

    return {
      colleges: allColleges,
      total_enrollment: totalEnrollment,
      institution_count: allColleges.length,
      has_research_university: hasResearchUniv,
      has_four_year: hasFourYear,
      sources,
    };
  } catch (err) {
    console.error(`[college-scorecard] Error fetching data for ${cityName}, ${stateAbbr}:`, err);
    return null;
  }
}
