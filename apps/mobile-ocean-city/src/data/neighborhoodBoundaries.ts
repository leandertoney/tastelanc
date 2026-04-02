import type { NeighborhoodBoundary } from '@tastelanc/mobile-shared/src/data/neighborhoodBoundaries';

// Ocean City, MD neighborhood polygon boundaries.
// Slugs match the areas.slug values in Supabase for this market.
// Colors use Ocean City's brand palette: deep cobalt bg, sunset orange accent, amber CTA.
// Ocean City is a narrow barrier island — ~0.5 mi wide, ~10 mi long.
// Latitude range: 38.31 (south tip) to 38.41 (north/Delaware line)
// Longitude range: -75.06 (ocean side) to -75.12 (bay side)
export const NEIGHBORHOOD_BOUNDARIES: NeighborhoodBoundary[] = [
  {
    // Boardwalk / Downtown — the iconic 3-mile boardwalk, Inlet area south to 27th St
    slug: 'oc-boardwalk',
    name: 'Boardwalk',
    labelCoordinate: { latitude: 38.3365, longitude: -75.0849 },
    fillColor: 'rgba(232, 105, 58, 0.14)',
    strokeColor: 'rgba(232, 105, 58, 0.65)',
    coordinates: [
      { latitude: 38.3500, longitude: -75.0760 },
      { latitude: 38.3505, longitude: -75.0820 },
      { latitude: 38.3490, longitude: -75.0870 },
      { latitude: 38.3420, longitude: -75.0880 },
      { latitude: 38.3300, longitude: -75.0870 },
      { latitude: 38.3220, longitude: -75.0855 },
      { latitude: 38.3180, longitude: -75.0820 },
      { latitude: 38.3185, longitude: -75.0760 },
      { latitude: 38.3260, longitude: -75.0755 },
      { latitude: 38.3420, longitude: -75.0755 },
    ],
  },
  {
    // Midtown — 28th St to 65th St corridor, the commercial/restaurant spine
    slug: 'oc-midtown',
    name: 'Midtown',
    labelCoordinate: { latitude: 38.3600, longitude: -75.0800 },
    fillColor: 'rgba(245, 160, 32, 0.10)',
    strokeColor: 'rgba(245, 160, 32, 0.55)',
    coordinates: [
      { latitude: 38.3720, longitude: -75.0760 },
      { latitude: 38.3725, longitude: -75.0815 },
      { latitude: 38.3710, longitude: -75.0860 },
      { latitude: 38.3640, longitude: -75.0875 },
      { latitude: 38.3540, longitude: -75.0875 },
      { latitude: 38.3500, longitude: -75.0820 },
      { latitude: 38.3500, longitude: -75.0760 },
      { latitude: 38.3560, longitude: -75.0755 },
      { latitude: 38.3660, longitude: -75.0755 },
    ],
  },
  {
    // Uptown — 65th St to 146th St (north end near Delaware line)
    slug: 'oc-uptown',
    name: 'Uptown',
    labelCoordinate: { latitude: 38.3850, longitude: -75.0730 },
    fillColor: 'rgba(247, 201, 75, 0.12)',
    strokeColor: 'rgba(247, 201, 75, 0.60)',
    coordinates: [
      { latitude: 38.4050, longitude: -75.0680 },
      { latitude: 38.4055, longitude: -75.0740 },
      { latitude: 38.4040, longitude: -75.0790 },
      { latitude: 38.3960, longitude: -75.0810 },
      { latitude: 38.3780, longitude: -75.0820 },
      { latitude: 38.3720, longitude: -75.0815 },
      { latitude: 38.3720, longitude: -75.0760 },
      { latitude: 38.3800, longitude: -75.0755 },
      { latitude: 38.3960, longitude: -75.0750 },
    ],
  },
  {
    // West Ocean City — mainland side across the bay bridge, Route 50 corridor
    slug: 'oc-west',
    name: 'West Ocean City',
    labelCoordinate: { latitude: 38.3400, longitude: -75.1200 },
    fillColor: 'rgba(13, 43, 110, 0.20)',
    strokeColor: 'rgba(13, 43, 110, 0.70)',
    coordinates: [
      { latitude: 38.3550, longitude: -75.1380 },
      { latitude: 38.3555, longitude: -75.1150 },
      { latitude: 38.3530, longitude: -75.0980 },
      { latitude: 38.3460, longitude: -75.0940 },
      { latitude: 38.3300, longitude: -75.0950 },
      { latitude: 38.3250, longitude: -75.1050 },
      { latitude: 38.3245, longitude: -75.1260 },
      { latitude: 38.3280, longitude: -75.1400 },
      { latitude: 38.3390, longitude: -75.1450 },
      { latitude: 38.3500, longitude: -75.1420 },
    ],
  },
];
