// ─────────────────────────────────────────────────────────
// Bureau of Economic Analysis (BEA) Data Fetcher
//
// Uses the BEA Regional GDP API to fetch county-level
// GDP data by NAICS industry code, specifically:
//   NAICS 72 = Accommodation & Food Services (tourism proxy)
//   NAICS 71 = Arts, Entertainment, and Recreation
//
// API docs: https://apps.bea.gov/api/_pdf/bea_web_service_api_user_guide.pdf
// Key: free from apps.bea.gov/api/signup
// ─────────────────────────────────────────────────────────

import type { TourismEconomicData, ResearchSource } from './expansion-types';

// State abbreviation → FIPS code
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

export interface BEAResult {
  data: TourismEconomicData;
  sources: ResearchSource[];
}

/**
 * Fetch the FIPS code for a county using Census Bureau's geocoding/FIPS lookup.
 * BEA uses 5-digit county FIPS codes (state FIPS + county FIPS).
 */
async function lookupCountyFips(
  countyName: string,
  stateAbbr: string
): Promise<string | null> {
  const stateFips = STATE_FIPS[stateAbbr.toUpperCase()];
  if (!stateFips) return null;

  try {
    // Use Census Bureau FIPS lookup
    const url = `https://api.census.gov/data/2023/acs/acs5?get=NAME&for=county:*&in=state:${stateFips}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!res.ok) return null;
    const data: string[][] = await res.json();

    // Find matching county (row format: [NAME, state, county])
    const normalizedCounty = countyName.toLowerCase().replace(/\s+county$/i, '').trim();

    for (const row of data.slice(1)) {
      const name = row[0].toLowerCase();
      // Census names look like "Lancaster County, Pennsylvania"
      if (name.startsWith(normalizedCounty + ' county,') || name.startsWith(normalizedCounty + ',')) {
        const stateCode = row[1];
        const countyCode = row[2];
        return `${stateCode}${countyCode}`;
      }
    }

    return null;
  } catch (err) {
    console.error(`[bea] FIPS lookup failed for ${countyName}, ${stateAbbr}:`, err);
    return null;
  }
}

/**
 * Fetch county-level GDP data from the BEA Regional GDP (CAGDP2) table.
 *
 * Returns hospitality (NAICS 72) and arts/entertainment (NAICS 71) GDP,
 * plus the total county GDP for computing the hospitality share.
 */
export async function fetchBEAData(
  countyName: string,
  stateAbbr: string
): Promise<BEAResult | null> {
  const apiKey = process.env.BEA_API_KEY;
  if (!apiKey) {
    console.warn('[bea] No BEA_API_KEY configured, skipping BEA data fetch');
    return null;
  }

  const now = new Date().toISOString();

  try {
    // Step 1: Get county FIPS code
    const fips = await lookupCountyFips(countyName, stateAbbr);
    if (!fips) {
      console.warn(`[bea] Could not find FIPS code for ${countyName}, ${stateAbbr}`);
      return null;
    }

    // Step 2: Fetch CAGDP2 (GDP by industry) for this county
    // Line codes: 1 = All industries total, 70 = NAICS 71, 76 = NAICS 72
    const params = new URLSearchParams({
      UserID: apiKey,
      method: 'GetData',
      datasetname: 'Regional',
      TableName: 'CAGDP2',
      GeoFips: fips,
      LineCode: '1,70,76',
      Year: 'LAST5',
      ResultFormat: 'JSON',
    });

    const url = `https://apps.bea.gov/api/data?${params}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!res.ok) {
      console.warn(`[bea] API returned ${res.status} for ${countyName}, ${stateAbbr}`);
      return null;
    }

    const json = await res.json();
    const results = json?.BEAAPI?.Results?.Data;

    if (!results || !Array.isArray(results)) {
      console.warn(`[bea] No data returned for ${countyName}, ${stateAbbr}`);
      return null;
    }

    // Find the most recent year with data
    // Each result has: { GeoFips, GeoName, TimePeriod, DataValue, LineCode, ... }
    type BEARow = { TimePeriod: string; DataValue: string; LineCode: string };
    const rows = results as BEARow[];

    // Group by year, find latest
    const yearSet = new Set(rows.map((r: BEARow) => r.TimePeriod));
    const years = Array.from(yearSet).sort().reverse();
    const latestYear = years[0];

    if (!latestYear) return null;

    const yearRows = rows.filter((r: BEARow) => r.TimePeriod === latestYear);

    let totalGdp: number | null = null;
    let hospitalityGdp: number | null = null;
    let artsGdp: number | null = null;

    for (const row of yearRows) {
      const value = row.DataValue === '(D)' || row.DataValue === '(NA)'
        ? null
        : parseFloat(row.DataValue.replace(/,/g, ''));

      switch (row.LineCode) {
        case '1':
          totalGdp = value; // All industries (millions of current dollars)
          break;
        case '70':
          artsGdp = value; // NAICS 71: Arts, Entertainment, Recreation
          break;
        case '76':
          hospitalityGdp = value; // NAICS 72: Accommodation & Food Services
          break;
      }
    }

    const hospitalityPct = (totalGdp && hospitalityGdp)
      ? Math.round((hospitalityGdp / totalGdp) * 1000) / 10
      : null;

    const data: TourismEconomicData = {
      hospitality_gdp_millions: hospitalityGdp,
      arts_entertainment_gdp_millions: artsGdp,
      hospitality_pct_of_gdp: hospitalityPct,
      total_county_gdp_millions: totalGdp,
      year: parseInt(latestYear, 10),
    };

    const sources: ResearchSource[] = [{
      name: `Bureau of Economic Analysis CAGDP2 ${latestYear}`,
      url: `https://apps.bea.gov/iTable/?reqid=70&step=1&acrdn=5`,
      data_point: hospitalityGdp
        ? `Hospitality GDP: $${hospitalityGdp.toLocaleString()}M (${hospitalityPct}% of county economy)`
        : `County GDP: $${totalGdp?.toLocaleString() || 'N/A'}M`,
      accessed_at: now,
      source_type: 'verified',
    }];

    console.log(`[bea] ${countyName}, ${stateAbbr}: Hospitality GDP $${hospitalityGdp?.toLocaleString() || 'N/A'}M (${hospitalityPct || 'N/A'}% of $${totalGdp?.toLocaleString() || 'N/A'}M total)`);

    return { data, sources };
  } catch (err) {
    console.error(`[bea] Error fetching data for ${countyName}, ${stateAbbr}:`, err);
    return null;
  }
}
