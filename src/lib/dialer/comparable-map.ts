import { comparableCoordinates } from './comparable-query';

export function comparableMapPoints<T extends { listingKey: string; address: string; latitude?: unknown; longitude?: unknown }>(comps: T[]) {
  return comps.flatMap((comp, index) => {
    const point = comparableCoordinates(comp);
    return point.latitude !== undefined && point.longitude !== undefined
      ? [{ ...point, latitude: point.latitude, longitude: point.longitude, id: comp.listingKey, number: index + 1, address: comp.address }] : [];
  });
}

export function comparableMapBounds(points: { latitude: number; longitude: number }[]): [[number, number], [number, number]] | null {
  if (!points.length) return null;
  return [[Math.min(...points.map(point => point.longitude)), Math.min(...points.map(point => point.latitude))],
    [Math.max(...points.map(point => point.longitude)), Math.max(...points.map(point => point.latitude))]];
}
