// ─────────────────────────────────────────────────────────
// Census Bureau Data Fetcher
//
// Uses the free Census Bureau ACS 5-Year Estimates API
// (no API key required) to fetch real population,
// median household income, and median age for US cities.
// ─────────────────────────────────────────────────────────

export interface CensusData {
  population: number;
  median_income: number;
  median_age: number;
  source_url: string;
  year: number;
}

// State abbreviation → FIPS code lookup
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

// State abbreviation → full name
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

/**
 * Fetch real demographic data from the US Census Bureau ACS 5-Year Estimates.
 *
 * Variables:
 *   B01003_001E = Total population
 *   B19013_001E = Median household income
 *   B01002_001E = Median age
 *
 * This API is free and requires no key.
 */
export async function fetchCensusData(
  cityName: string,
  stateAbbr: string,
): Promise<CensusData | null> {
  const fips = STATE_FIPS[stateAbbr.toUpperCase()];
  if (!fips) {
    console.warn(`[census] Unknown state abbreviation: ${stateAbbr}`);
    return null;
  }

  const stateName = STATE_NAMES[stateAbbr.toUpperCase()] || stateAbbr;
  const year = 2023; // Latest available ACS 5-year

  try {
    // Fetch all places in the state with population, income, and age
    const url = `https://api.census.gov/data/${year}/acs/acs5?get=NAME,B01003_001E,B19013_001E,B01002_001E&for=place:*&in=state:${fips}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      console.warn(`[census] API returned ${res.status} for ${cityName}, ${stateAbbr}`);
      return null;
    }

    const data: string[][] = await res.json();

    // First row is headers, rest are data rows
    // Format: [NAME, population, income, age, state, place]
    if (!data || data.length < 2) return null;

    // Normalize city name for matching
    const normalizedCity = cityName.toLowerCase().trim();

    // Try to find an exact match first, then fuzzy match
    let match: string[] | undefined;

    for (const row of data.slice(1)) {
      const placeName = row[0].toLowerCase();
      // Census names look like "Allentown city, Pennsylvania" or "Reading city, Pennsylvania"
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
      console.warn(`[census] No match found for "${cityName}" in ${stateAbbr}`);
      return null;
    }

    const population = parseInt(match[1], 10);
    const medianIncome = parseInt(match[2], 10);
    const medianAge = parseFloat(match[3]);

    // Validate the numbers
    if (isNaN(population) || population <= 0) return null;

    // Build Census QuickFacts URL
    const encodedCity = encodeURIComponent(`${cityName} city, ${stateName}`).replace(/%20/g, '_');
    const sourceUrl = `https://data.census.gov/profile/${encodedCity}`;

    return {
      population,
      median_income: isNaN(medianIncome) ? 0 : medianIncome,
      median_age: isNaN(medianAge) ? 0 : medianAge,
      source_url: sourceUrl,
      year,
    };
  } catch (err) {
    console.error(`[census] Error fetching data for ${cityName}, ${stateAbbr}:`, err);
    return null;
  }
}
