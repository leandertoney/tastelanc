export type ListItemType = 'item' | 'promo';

export interface ListItem<T> {
  type: ListItemType;
  data: T | null;
  key: string;
}

/**
 * Injects a promo card into a list of items at a specified position.
 * Only injects if the list has enough items and showPromo is true.
 *
 * @param items - The original array of items
 * @param showPromo - Whether the promo should be shown
 * @param insertAt - Position to insert the promo (default: 3, meaning after the 3rd item)
 * @param getItemKey - Function to extract a unique key from each item (default: uses 'id' property)
 * @returns Array of wrapped items with type discriminator and keys for FlatList
 */
export function injectPromoIntoList<T extends { id: string }>(
  items: T[],
  showPromo: boolean,
  insertAt: number = 3,
  getItemKey?: (item: T) => string
): ListItem<T>[] {
  const keyExtractor = getItemKey || ((item: T) => item.id);

  // Wrap all items
  const result: ListItem<T>[] = items.map((item) => ({
    type: 'item' as const,
    data: item,
    key: keyExtractor(item),
  }));

  // Only inject promo if:
  // 1. showPromo is true
  // 2. List has enough items (at least insertAt + 1 items)
  if (showPromo && items.length >= insertAt + 1) {
    result.splice(insertAt, 0, {
      type: 'promo' as const,
      data: null,
      key: 'promo-card',
    });
  }

  return result;
}

/**
 * Type guard to check if a list item is a promo
 */
export function isPromoItem<T>(item: ListItem<T>): item is ListItem<T> & { type: 'promo' } {
  return item.type === 'promo';
}

/**
 * Type guard to check if a list item is a regular item
 */
export function isRegularItem<T>(item: ListItem<T>): item is ListItem<T> & { type: 'item'; data: T } {
  return item.type === 'item' && item.data !== null;
}
