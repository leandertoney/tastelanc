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
    slug: 'carlisle',
    name: 'Carlisle',
    labelCoordinate: { latitude: 40.2015, longitude: -77.1890 },
    fillColor: 'rgba(74, 144, 217, 0.12)',
    strokeColor: 'rgba(107, 168, 240, 0.6)',
    coordinates: [
      { latitude: 40.2105, longitude: -77.2020 },
      { latitude: 40.2110, longitude: -77.1900 },
      { latitude: 40.2100, longitude: -77.1760 },
      { latitude: 40.2030, longitude: -77.1740 },
      { latitude: 40.1920, longitude: -77.1760 },
      { latitude: 40.1910, longitude: -77.1890 },
      { latitude: 40.1925, longitude: -77.2010 },
      { latitude: 40.2040, longitude: -77.2030 },
    ],
  },
  {
    slug: 'mechanicsburg',
    name: 'Mechanicsburg',
    labelCoordinate: { latitude: 40.2143, longitude: -77.0080 },
    fillColor: 'rgba(217, 123, 74, 0.12)',
    strokeColor: 'rgba(240, 155, 107, 0.6)',
    coordinates: [
      { latitude: 40.2250, longitude: -77.0220 },
      { latitude: 40.2260, longitude: -77.0080 },
      { latitude: 40.2240, longitude: -76.9940 },
      { latitude: 40.2140, longitude: -76.9920 },
      { latitude: 40.2040, longitude: -76.9950 },
      { latitude: 40.2030, longitude: -77.0080 },
      { latitude: 40.2045, longitude: -77.0210 },
      { latitude: 40.2150, longitude: -77.0230 },
    ],
  },
  {
    slug: 'camp-hill',
    name: 'Camp Hill',
    labelCoordinate: { latitude: 40.2398, longitude: -76.9200 },
    fillColor: 'rgba(139, 92, 246, 0.12)',
    strokeColor: 'rgba(167, 139, 250, 0.6)',
    coordinates: [
      { latitude: 40.2490, longitude: -76.9330 },
      { latitude: 40.2500, longitude: -76.9200 },
      { latitude: 40.2485, longitude: -76.9070 },
      { latitude: 40.2400, longitude: -76.9050 },
      { latitude: 40.2310, longitude: -76.9080 },
      { latitude: 40.2300, longitude: -76.9200 },
      { latitude: 40.2315, longitude: -76.9320 },
      { latitude: 40.2405, longitude: -76.9340 },
    ],
  },
  {
    slug: 'shippensburg',
    name: 'Shippensburg',
    labelCoordinate: { latitude: 40.0505, longitude: -77.5205 },
    fillColor: 'rgba(16, 185, 129, 0.12)',
    strokeColor: 'rgba(52, 211, 153, 0.6)',
    coordinates: [
      { latitude: 40.0590, longitude: -77.5340 },
      { latitude: 40.0600, longitude: -77.5205 },
      { latitude: 40.0585, longitude: -77.5070 },
      { latitude: 40.0505, longitude: -77.5050 },
      { latitude: 40.0420, longitude: -77.5075 },
      { latitude: 40.0410, longitude: -77.5205 },
      { latitude: 40.0425, longitude: -77.5330 },
      { latitude: 40.0510, longitude: -77.5350 },
    ],
  },
  {
    slug: 'new-cumberland',
    name: 'New Cumberland',
    labelCoordinate: { latitude: 40.2325, longitude: -76.8845 },
    fillColor: 'rgba(245, 158, 11, 0.12)',
    strokeColor: 'rgba(251, 191, 36, 0.6)',
    coordinates: [
      { latitude: 40.2410, longitude: -76.8950 },
      { latitude: 40.2415, longitude: -76.8845 },
      { latitude: 40.2400, longitude: -76.8740 },
      { latitude: 40.2330, longitude: -76.8720 },
      { latitude: 40.2240, longitude: -76.8745 },
      { latitude: 40.2235, longitude: -76.8845 },
      { latitude: 40.2250, longitude: -76.8940 },
      { latitude: 40.2335, longitude: -76.8960 },
    ],
  },
];
