/**
 * Ray-casting algorithm to determine if a point lies inside a polygon.
 */
export function pointInPolygon(
  point: { latitude: number; longitude: number },
  polygon: { latitude: number; longitude: number }[]
): boolean {
  let inside = false;
  const { latitude: x, longitude: y } = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].latitude;
    const yi = polygon[i].longitude;
    const xj = polygon[j].latitude;
    const yj = polygon[j].longitude;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}
