// ─────────────────────────────────────────────────────────
// OpenStreetMap Overpass API Data Fetcher
//
// Queries the Overpass API for venue counts by type and
// cuisine distribution within a bounding box around a city.
//
// API: https://overpass-api.de/api/interpreter
// No API key required. Includes 2-second politeness delay.
// ─────────────────────────────────────────────────────────

import type { VenueBreakdown, CuisineEntry, ResearchSource } from './expansion-types';

export interface OverpassResult {
  venue_breakdown: VenueBreakdown;
  cuisine_distribution: CuisineEntry[];
  sources: ResearchSource[];
}

/**
 * Convert center lat/lng + radius (miles) to a bounding box.
 * Returns [south, west, north, east].
 */
function toBoundingBox(
  lat: number,
  lng: number,
  radiusMiles: number
): [number, number, number, number] {
  const latDeg = radiusMiles / 69.0; // ~69 miles per degree of latitude
  const lngDeg = radiusMiles / (69.0 * Math.cos(lat * (Math.PI / 180)));
  return [
    lat - latDeg, // south
    lng - lngDeg, // west
    lat + latDeg, // north
    lng + lngDeg, // east
  ];
}

/**
 * Query the Overpass API for amenity counts within a bounding box.
 */
async function queryOverpassCount(
  bbox: [number, number, number, number],
  amenityType: string
): Promise<number> {
  const [south, west, north, east] = bbox;
  const query = `[out:json][timeout:25];node["amenity"="${amenityType}"](${south},${west},${north},${east});out count;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    console.warn(`[overpass] Count query failed (${res.status}) for amenity=${amenityType}`);
    return 0;
  }

  const data = await res.json();
  return data.elements?.[0]?.tags?.total ? parseInt(data.elements[0].tags.total, 10) : 0;
}

/**
 * Query the Overpass API for restaurant cuisine tags within a bounding box.
 * Returns raw cuisine tag strings.
 */
async function queryOverpassCuisines(
  bbox: [number, number, number, number]
): Promise<string[]> {
  const [south, west, north, east] = bbox;
  // Fetch restaurants with cuisine tags
  const query = `[out:json][timeout:30];node["amenity"="restaurant"]["cuisine"](${south},${west},${north},${east});out tags;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(35000),
  });

  if (!res.ok) {
    console.warn(`[overpass] Cuisine query failed (${res.status})`);
    return [];
  }

  const data = await res.json();
  const cuisines: string[] = [];

  for (const element of data.elements || []) {
    const cuisine = element.tags?.cuisine;
    if (cuisine) {
      // Cuisine tags can be semicolon-separated: "italian;pizza"
      for (const c of cuisine.split(';')) {
        const normalized = c.trim().toLowerCase().replace(/_/g, ' ');
        if (normalized) cuisines.push(normalized);
      }
    }
  }

  return cuisines;
}

/**
 * Fetch venue breakdown and cuisine distribution from OpenStreetMap.
 *
 * Builds a bounding box from lat/lng + radius, then queries
 * Overpass for each amenity type and cuisine tags.
 */
export async function fetchOverpassData(
  latitude: number,
  longitude: number,
  radiusMiles: number = 15
): Promise<OverpassResult | null> {
  const now = new Date().toISOString();

  try {
    const bbox = toBoundingBox(latitude, longitude, radiusMiles);

    // Politeness delay — Overpass API asks for rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fetch all amenity types in parallel
    const [restaurants, bars, cafes, pubs, fastFood, nightclubs, cuisines] = await Promise.all([
      queryOverpassCount(bbox, 'restaurant'),
      queryOverpassCount(bbox, 'bar'),
      queryOverpassCount(bbox, 'cafe'),
      queryOverpassCount(bbox, 'pub'),
      queryOverpassCount(bbox, 'fast_food'),
      queryOverpassCount(bbox, 'nightclub'),
      queryOverpassCuisines(bbox),
    ]);

    const totalDining = restaurants + bars + cafes + pubs + fastFood + nightclubs;

    const venueBreakdown: VenueBreakdown = {
      restaurants,
      bars,
      cafes,
      pubs,
      fast_food: fastFood,
      nightclubs,
      total_dining: totalDining,
    };

    // Aggregate cuisine counts
    const cuisineCounts = new Map<string, number>();
    for (const c of cuisines) {
      cuisineCounts.set(c, (cuisineCounts.get(c) || 0) + 1);
    }

    // Sort by count descending, take top 15
    const cuisineDistribution: CuisineEntry[] = Array.from(cuisineCounts.entries())
      .map(([cuisine, count]) => ({ cuisine, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const sources: ResearchSource[] = [{
      name: 'OpenStreetMap (Overpass API)',
      url: `https://www.openstreetmap.org/#map=11/${latitude}/${longitude}`,
      data_point: `${totalDining} total venues (${restaurants} restaurants, ${bars} bars, ${cafes} cafes)`,
      accessed_at: now,
      source_type: 'verified',
    }];

    console.log(`[overpass] ${latitude},${longitude}: ${restaurants} restaurants, ${bars} bars, ${cafes} cafes, ${pubs} pubs, ${fastFood} fast food, ${nightclubs} nightclubs`);

    return { venue_breakdown: venueBreakdown, cuisine_distribution: cuisineDistribution, sources };
  } catch (err) {
    console.error(`[overpass] Error fetching data:`, err);
    return null;
  }
}
