/**
 * Convert a hex color to rgba with the given alpha.
 * Supports 3-char (#RGB) and 6-char (#RRGGBB) hex.
 */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.length === 3 ? h[0] + h[0] : h.substring(0, 2), 16);
  const g = parseInt(h.length === 3 ? h[1] + h[1] : h.substring(2, 4), 16);
  const b = parseInt(h.length === 3 ? h[2] + h[2] : h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
