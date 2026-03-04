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

// Common city name abbreviations → full forms
const CITY_ABBREVIATIONS: Record<string, string> = {
  ft: 'fort',
  st: 'saint',
  mt: 'mount',
};

/**
 * Expand common abbreviations: "Ft Lauderdale" → "Fort Lauderdale"
 */
function expandCityAbbreviations(name: string): string {
  const lower = name.toLowerCase();
  for (const [abbr, full] of Object.entries(CITY_ABBREVIATIONS)) {
    if (lower.startsWith(abbr + ' ') || lower.startsWith(abbr + '.')) {
      return full + name.slice(abbr.length);
    }
  }
  return name;
}

/**
 * Check if a Census place name matches a given city name.
 * Handles standard suffixes (city, town, borough) AND
 * consolidated city-county governments (Nashville-Davidson, Louisville/Jefferson).
 */
function matchesCityName(placeName: string, normalizedCity: string, stateName: string): boolean {
  // Standard place suffixes
  if (
    placeName.startsWith(`${normalizedCity} city,`) ||
    placeName.startsWith(`${normalizedCity} town,`) ||
    placeName.startsWith(`${normalizedCity} borough,`) ||
    placeName.startsWith(`${normalizedCity} village,`) ||
    placeName.startsWith(`${normalizedCity} cdp,`) ||
    placeName === `${normalizedCity}, ${stateName.toLowerCase()}`
  ) {
    return true;
  }

  // Consolidated city-county governments (e.g. Nashville-Davidson, Louisville/Jefferson)
  if (
    placeName.startsWith(`${normalizedCity}-`) ||
    placeName.startsWith(`${normalizedCity}/`)
  ) {
    return true;
  }

  return false;
}

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

  // Expand abbreviations: "Ft Lauderdale" → "Fort Lauderdale"
  const expandedCity = expandCityAbbreviations(cityName);
  const normalizedCity = expandedCity.toLowerCase().trim();
  // Also try the original name if different
  const originalNormalized = cityName.toLowerCase().trim();

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

    // Try to find a match using expanded name first, then original
    let match: string[] | undefined;

    for (const row of data.slice(1)) {
      const placeName = row[0].toLowerCase();
      if (matchesCityName(placeName, normalizedCity, stateName)) {
        match = row;
        break;
      }
      // Try original if different from expanded
      if (originalNormalized !== normalizedCity && matchesCityName(placeName, originalNormalized, stateName)) {
        match = row;
        break;
      }
    }

    if (!match) {
      // Fallback: try us-cities.json for population data
      console.warn(`[census] No Census match for "${cityName}" in ${stateAbbr}, trying us-cities.json fallback`);
      return fetchFromUSCitiesJSON(expandedCity, stateAbbr);
    }

    const population = parseInt(match[1], 10);
    const medianIncome = parseInt(match[2], 10);
    const medianAge = parseFloat(match[3]);

    // Validate the numbers
    if (isNaN(population) || population <= 0) return null;

    // Build Census QuickFacts URL
    const encodedCity = encodeURIComponent(`${expandedCity} city, ${stateName}`).replace(/%20/g, '_');
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
    // Try local fallback on API failure too
    return fetchFromUSCitiesJSON(expandedCity, stateAbbr);
  }
}

/**
 * Fallback: look up population from the bundled us-cities.json file.
 * Only returns population (no income/age), but better than nothing.
 */
async function fetchFromUSCitiesJSON(
  cityName: string,
  stateAbbr: string,
): Promise<CensusData | null> {
  try {
    const { readFile } = await import('fs/promises');
    const { join } = await import('path');
    const filePath = join(process.cwd(), 'public', 'data', 'us-cities.json');
    const raw = await readFile(filePath, 'utf-8');
    const cities: { c: string; co: string; s: string; p: number }[] = JSON.parse(raw);

    const normalized = cityName.toLowerCase().trim();
    const stateUpper = stateAbbr.toUpperCase();

    // Find the largest matching city in that state (in case of duplicates)
    let best: (typeof cities)[number] | null = null;
    for (const city of cities) {
      if (city.s === stateUpper && city.c.toLowerCase() === normalized) {
        if (!best || city.p > best.p) {
          best = city;
        }
      }
    }

    if (!best) {
      console.warn(`[census] No us-cities.json match for "${cityName}", ${stateAbbr}`);
      return null;
    }

    console.log(`[census] Fallback: found ${best.c}, ${best.s} with population ${best.p.toLocaleString()} from us-cities.json`);

    return {
      population: best.p,
      median_income: 0, // Not available in this dataset
      median_age: 0,
      source_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(best.c)},_${stateAbbr}`,
      year: 2023,
    };
  } catch (err) {
    console.error(`[census] us-cities.json fallback failed:`, err);
    return null;
  }
}
