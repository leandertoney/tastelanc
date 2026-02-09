export interface NeighborhoodBoundary {
  slug: string;
  name: string;
  labelCoordinate: { latitude: number; longitude: number };
  coordinates: { latitude: number; longitude: number }[];
  fillColor: string;
  strokeColor: string;
}

export const NEIGHBORHOOD_BOUNDARIES: NeighborhoodBoundary[] = [
  {
    slug: 'downtown',
    name: 'Downtown',
    labelCoordinate: { latitude: 40.0379, longitude: -76.3055 },
    fillColor: 'rgba(74, 144, 217, 0.12)',
    strokeColor: 'rgba(107, 168, 240, 0.6)',
    coordinates: [
      { latitude: 40.0428, longitude: -76.3105 },
      { latitude: 40.0430, longitude: -76.3078 },
      { latitude: 40.0427, longitude: -76.3046 },
      { latitude: 40.0413, longitude: -76.3040 },
      { latitude: 40.0345, longitude: -76.3028 },
      { latitude: 40.0340, longitude: -76.3055 },
      { latitude: 40.0342, longitude: -76.3103 },
      { latitude: 40.0387, longitude: -76.3108 },
    ],
  },
  {
    slug: 'college-hill',
    name: 'College Hill',
    labelCoordinate: { latitude: 40.0490, longitude: -76.3195 },
    fillColor: 'rgba(217, 123, 74, 0.12)',
    strokeColor: 'rgba(240, 155, 107, 0.6)',
    coordinates: [
      { latitude: 40.0548, longitude: -76.3260 },
      { latitude: 40.0548, longitude: -76.3195 },
      { latitude: 40.0545, longitude: -76.3130 },
      { latitude: 40.0468, longitude: -76.3121 },
      { latitude: 40.0428, longitude: -76.3115 },
      { latitude: 40.0425, longitude: -76.3165 },
      { latitude: 40.0418, longitude: -76.3230 },
      { latitude: 40.0476, longitude: -76.3235 },
    ],
  },
  {
    slug: 'east-king',
    name: 'East King St',
    labelCoordinate: { latitude: 40.0383, longitude: -76.2955 },
    fillColor: 'rgba(139, 92, 246, 0.12)',
    strokeColor: 'rgba(167, 139, 250, 0.6)',
    coordinates: [
      { latitude: 40.0415, longitude: -76.3040 },
      { latitude: 40.0420, longitude: -76.2920 },
      { latitude: 40.0410, longitude: -76.2880 },
      { latitude: 40.0350, longitude: -76.2880 },
      { latitude: 40.0348, longitude: -76.2920 },
      { latitude: 40.0345, longitude: -76.3028 },
    ],
  },
  {
    slug: 'west-end',
    name: 'West End',
    labelCoordinate: { latitude: 40.0385, longitude: -76.3175 },
    fillColor: 'rgba(16, 185, 129, 0.12)',
    strokeColor: 'rgba(52, 211, 153, 0.6)',
    coordinates: [
      { latitude: 40.0430, longitude: -76.3260 },
      { latitude: 40.0428, longitude: -76.3115 },
      { latitude: 40.0387, longitude: -76.3108 },
      { latitude: 40.0350, longitude: -76.3103 },
      { latitude: 40.0342, longitude: -76.3140 },
      { latitude: 40.0335, longitude: -76.3230 },
      { latitude: 40.0380, longitude: -76.3260 },
    ],
  },
  {
    slug: 'lititz-pike',
    name: 'Lititz Pike',
    labelCoordinate: { latitude: 40.0580, longitude: -76.3080 },
    fillColor: 'rgba(245, 158, 11, 0.12)',
    strokeColor: 'rgba(251, 191, 36, 0.6)',
    coordinates: [
      { latitude: 40.0530, longitude: -76.3120 },
      { latitude: 40.0580, longitude: -76.3130 },
      { latitude: 40.0680, longitude: -76.3140 },
      { latitude: 40.0690, longitude: -76.3090 },
      { latitude: 40.0680, longitude: -76.3010 },
      { latitude: 40.0580, longitude: -76.2995 },
      { latitude: 40.0530, longitude: -76.3010 },
    ],
  },
  {
    slug: 'manheim-township',
    name: 'Manheim Twp',
    labelCoordinate: { latitude: 40.0720, longitude: -76.3200 },
    fillColor: 'rgba(239, 68, 68, 0.12)',
    strokeColor: 'rgba(248, 113, 113, 0.6)',
    coordinates: [
      { latitude: 40.0600, longitude: -76.3420 },
      { latitude: 40.0700, longitude: -76.3450 },
      { latitude: 40.0830, longitude: -76.3400 },
      { latitude: 40.0850, longitude: -76.3200 },
      { latitude: 40.0830, longitude: -76.2950 },
      { latitude: 40.0700, longitude: -76.2940 },
      { latitude: 40.0600, longitude: -76.2980 },
      { latitude: 40.0600, longitude: -76.3150 },
    ],
  },
];
