// ─────────────────────────────────────────────────────────
// Census Bureau Extended Data Fetcher
//
// Fetches additional Census ACS variables beyond the basic
// population/income/age from census-data.ts:
//   - Median home value (B25077_001E)
//   - Median gross rent (B25064_001E)
//   - Bachelor's degree holders (B15003_022E)
//   - Population 25+ (B15003_001E)
//
// Computes: rent_to_income_ratio, bachelors_degree_pct
//
// Uses the same free Census Bureau ACS API (no key required).
// ─────────────────────────────────────────────────────────

import type { CensusExtendedInfo, ResearchSource } from './expansion-types';

// State abbreviation → FIPS code (shared with census-data.ts)
const STATE_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06',
  CO: '08', CT: '09', DE: '10', FL: '12', GA: '13',
  HI: '15', ID: '16', IL: '17', IN: '18', IA: '19',
  KS: '20', KY: '21', LA: '22', ME: '23', MD: '24',
  MA: '25', MI: '26', MN: '27', MS: '28', MO: '29',
  MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34',
  NM: '35', NY: '36', NC: '37', ND: '38', OH: '39',
  OK: '40', OR: '41', PA: '42', RI: '44', SC: '45',
  SD: '46', TN: '47', TX: '48', UT: '49', VT: '50',
  VA: '51', WA: '53', WV: '54', WI: '55', WY: '56',
  DC: '11',
};

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

export interface CensusExtendedResult {
  data: CensusExtendedInfo;
  sources: ResearchSource[];
}

/**
 * Fetch extended Census variables for a city.
 *
 * Variables:
 *   B25077_001E = Median home value
 *   B25064_001E = Median gross rent
 *   B15003_001E = Population 25 years and over
 *   B15003_022E = Bachelor's degree holders (25+)
 *   B19013_001E = Median household income (needed for rent-to-income ratio)
 */
export async function fetchCensusExtendedData(
  cityName: string,
  stateAbbr: string
): Promise<CensusExtendedResult | null> {
  const fips = STATE_FIPS[stateAbbr.toUpperCase()];
  if (!fips) {
    console.warn(`[census-ext] Unknown state: ${stateAbbr}`);
    return null;
  }

  const stateName = STATE_NAMES[stateAbbr.toUpperCase()] || stateAbbr;
  const year = 2023;
  const now = new Date().toISOString();

  try {
    const variables = 'B25077_001E,B25064_001E,B15003_001E,B15003_022E,B19013_001E';
    const url = `https://api.census.gov/data/${year}/acs/acs5?get=NAME,${variables}&for=place:*&in=state:${fips}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      console.warn(`[census-ext] API returned ${res.status} for ${cityName}, ${stateAbbr}`);
      return null;
    }

    const data: string[][] = await res.json();
    if (!data || data.length < 2) return null;

    // Find matching city (same logic as census-data.ts)
    const normalizedCity = cityName.toLowerCase().trim();
    let match: string[] | undefined;

    for (const row of data.slice(1)) {
      const placeName = row[0].toLowerCase();
      if (
        placeName.startsWith(`${normalizedCity} city,`) ||
        placeName.startsWith(`${normalizedCity} town,`) ||
        placeName.startsWith(`${normalizedCity} borough,`) ||
        placeName.startsWith(`${normalizedCity} village,`) ||
        placeName.startsWith(`${normalizedCity} cdp,`) ||
        placeName === `${normalizedCity}, ${stateName.toLowerCase()}`
      ) {
        match = row;
        break;
      }
    }

    if (!match) {
      console.warn(`[census-ext] No match for "${cityName}" in ${stateAbbr}`);
      return null;
    }

    // Parse values: [NAME, B25077, B25064, B15003_001, B15003_022, B19013, state, place]
    const medianHomeValue = parseInt(match[1], 10);
    const medianGrossRent = parseInt(match[2], 10);
    const pop25Plus = parseInt(match[3], 10);
    const bachelorsDegree = parseInt(match[4], 10);
    const medianIncome = parseInt(match[5], 10);

    // Compute derived metrics
    const bachelorsPct = (pop25Plus > 0 && !isNaN(bachelorsDegree))
      ? Math.round((bachelorsDegree / pop25Plus) * 1000) / 10
      : null;

    // rent_to_income_ratio = (annual rent) / (annual income)
    // Lower = more disposable income for dining out
    const rentToIncome = (medianGrossRent > 0 && medianIncome > 0 && !isNaN(medianGrossRent) && !isNaN(medianIncome))
      ? Math.round(((medianGrossRent * 12) / medianIncome) * 100) / 100
      : null;

    const result: CensusExtendedInfo = {
      median_home_value: isNaN(medianHomeValue) ? null : medianHomeValue,
      median_gross_rent: isNaN(medianGrossRent) ? null : medianGrossRent,
      bachelors_degree_pct: bachelorsPct,
      rent_to_income_ratio: rentToIncome,
    };

    const encodedCity = encodeURIComponent(`${cityName} city, ${stateName}`).replace(/%20/g, '_');
    const sources: ResearchSource[] = [{
      name: `US Census Bureau ACS ${year} (Extended)`,
      url: `https://data.census.gov/profile/${encodedCity}`,
      data_point: [
        result.median_home_value ? `Home Value: $${result.median_home_value.toLocaleString()}` : null,
        result.median_gross_rent ? `Rent: $${result.median_gross_rent.toLocaleString()}/mo` : null,
        result.bachelors_degree_pct ? `Education: ${result.bachelors_degree_pct}% bachelor's+` : null,
      ].filter(Boolean).join(' | '),
      accessed_at: now,
      source_type: 'verified',
    }];

    console.log(`[census-ext] ${cityName}, ${stateAbbr}: Home $${medianHomeValue?.toLocaleString() || 'N/A'}, Rent $${medianGrossRent?.toLocaleString() || 'N/A'}/mo, Education ${bachelorsPct || 'N/A'}%`);

    return { data: result, sources };
  } catch (err) {
    console.error(`[census-ext] Error fetching data for ${cityName}, ${stateAbbr}:`, err);
    return null;
  }
}
