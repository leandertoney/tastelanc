'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AutocompleteOption } from '@/components/ui/AutocompleteInput';

interface CityEntry {
  c: string;   // city name
  co: string;  // county name
  s: string;   // state abbreviation
  p: number;   // population
}

interface CountyEntry {
  co: string;  // county name
  s: string;   // state abbreviation
  p: number;   // population
}

// Module-level cache — persists across modal open/close without re-fetching
let citiesCache: CityEntry[] | null = null;
let countiesCache: CountyEntry[] | null = null;
let loadPromise: Promise<void> | null = null;

function loadData(): Promise<void> {
  if (citiesCache && countiesCache) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = Promise.all([
    fetch('/data/us-cities.json').then((r) => r.json()),
    fetch('/data/us-counties.json').then((r) => r.json()),
  ]).then(([cities, counties]) => {
    citiesCache = cities;
    countiesCache = counties;
  });

  return loadPromise;
}

function filterCities(query: string): AutocompleteOption[] {
  if (!citiesCache || query.length < 2) return [];

  const parts = query.split(',').map((s) => s.trim().toLowerCase());
  const cityQuery = parts[0];
  const stateQuery = parts[1] || '';

  let matches = citiesCache.filter((city) => {
    const nameMatch = city.c.toLowerCase().startsWith(cityQuery);
    if (!nameMatch) return false;
    if (stateQuery) {
      return city.s.toLowerCase().startsWith(stateQuery);
    }
    return true;
  });

  // Sort: exact name match first, then by population
  matches.sort((a, b) => {
    const aExact = a.c.toLowerCase() === cityQuery ? 1 : 0;
    const bExact = b.c.toLowerCase() === cityQuery ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    return b.p - a.p;
  });

  return matches.slice(0, 10).map((city) => ({
    label: `${city.c}, ${city.s}`,
    sublabel: `${city.co} · Pop. ${city.p.toLocaleString()}`,
    value: city,
  }));
}

function filterCounties(query: string): AutocompleteOption[] {
  if (!countiesCache || query.length < 2) return [];

  const parts = query.split(',').map((s) => s.trim().toLowerCase());
  const countyQuery = parts[0];
  const stateQuery = parts[1] || '';

  let matches = countiesCache.filter((county) => {
    const nameMatch = county.co.toLowerCase().startsWith(countyQuery);
    if (!nameMatch) return false;
    if (stateQuery) {
      return county.s.toLowerCase().startsWith(stateQuery);
    }
    return true;
  });

  matches.sort((a, b) => {
    const aExact = a.co.toLowerCase() === countyQuery ? 1 : 0;
    const bExact = b.co.toLowerCase() === countyQuery ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    return b.p - a.p;
  });

  return matches.slice(0, 10).map((county) => ({
    label: `${county.co}, ${county.s}`,
    sublabel: `Pop. ${county.p.toLocaleString()}`,
    value: county,
  }));
}

export function useUSCitySearch() {
  const [isLoaded, setIsLoaded] = useState(!!citiesCache);
  const [cityOptions, setCityOptions] = useState<AutocompleteOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<AutocompleteOption[]>([]);

  // Load data on mount
  useEffect(() => {
    if (citiesCache && countiesCache) {
      setIsLoaded(true);
      return;
    }
    loadData().then(() => setIsLoaded(true));
  }, []);

  const searchCities = useCallback(
    (query: string) => {
      if (!isLoaded) return;
      setCityOptions(filterCities(query));
    },
    [isLoaded],
  );

  const searchCounties = useCallback(
    (query: string) => {
      if (!isLoaded) return;
      setCountyOptions(filterCounties(query));
    },
    [isLoaded],
  );

  const findCity = useCallback(
    (name: string, stateAbbr?: string): CityEntry | null => {
      if (!citiesCache) return null;
      const normalized = name.toLowerCase().trim();
      const stateUpper = stateAbbr?.toUpperCase();
      let best: CityEntry | null = null;
      for (const city of citiesCache) {
        if (city.c.toLowerCase() !== normalized) continue;
        if (stateUpper && city.s !== stateUpper) continue;
        if (!best || city.p > best.p) best = city;
      }
      return best;
    },
    [isLoaded],
  );

  return { cityOptions, countyOptions, searchCities, searchCounties, findCity, isLoaded };
}
