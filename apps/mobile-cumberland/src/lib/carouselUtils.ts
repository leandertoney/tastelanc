import type { Restaurant, FeaturedAd } from '../types/database';

export type CarouselItemType = 'restaurant' | 'ad';

export interface CarouselItem {
  type: CarouselItemType;
  data: Restaurant | FeaturedAd;
  key: string;
}

/**
 * Injects ad cards into a restaurant list at regular intervals.
 * Ads cycle through the available ads array with modulo.
 * If no ads, returns plain restaurant items (carousel unchanged).
 *
 * @param restaurants - The original restaurant array
 * @param ads - Active ads to inject
 * @param interval - Insert an ad after every N restaurants (default: 3)
 */
export function injectAdsIntoCarousel(
  restaurants: Restaurant[],
  ads: FeaturedAd[],
  interval: number = 3,
): CarouselItem[] {
  if (ads.length === 0) {
    return restaurants.map((r) => ({
      type: 'restaurant' as const,
      data: r,
      key: `r-${r.id}`,
    }));
  }

  const result: CarouselItem[] = [];
  let adIndex = 0;

  for (let i = 0; i < restaurants.length; i++) {
    result.push({
      type: 'restaurant' as const,
      data: restaurants[i],
      key: `r-${restaurants[i].id}`,
    });

    if ((i + 1) % interval === 0) {
      const ad = ads[adIndex % ads.length];
      result.push({
        type: 'ad' as const,
        data: ad,
        key: `ad-${ad.id}-${adIndex}`,
      });
      adIndex++;
    }
  }

  return result;
}
