import { area as turfArea, bbox as turfBbox, centroid as turfCentroid, polygon as turfPolygon } from "@turf/turf";
import type { LatLng } from "./types";

/** Leaflet works in [lat, lng]; GeoJSON/Turf work in [lng, lat]. */
function toGeoJsonRing(boundary: LatLng[]): number[][] {
  const ring = boundary.map(([lat, lng]) => [lng, lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) ring.push([...first]);
  return ring;
}

/**
 * Area of a drawn plot boundary, in hectares. This is the ONLY way plot area
 * is produced in the app — length/width are never multiplied to get an area.
 */
export function hectaresFromBoundary(boundary: LatLng[]): number {
  if (boundary.length < 3) return 0;
  try {
    const feature = turfPolygon([toGeoJsonRing(boundary)]);
    return Number((turfArea(feature) / 10_000).toFixed(4));
  } catch {
    return 0;
  }
}

/**
 * Informational bounding-box dimensions of the drawn shape, in metres.
 * Displayed as derived read-outs — never an input for area.
 */
export function boundingDimensions(boundary: LatLng[]): { lengthM: number; widthM: number } {
  if (boundary.length < 3) return { lengthM: 0, widthM: 0 };
  try {
    const [minLng, minLat, maxLng, maxLat] = turfBbox(turfPolygon([toGeoJsonRing(boundary)]));
    const midLat = (minLat + maxLat) / 2;
    const metresPerDegLat = 110_574;
    const metresPerDegLng = 111_320 * Math.cos((midLat * Math.PI) / 180);
    return {
      lengthM: Math.round((maxLat - minLat) * metresPerDegLat),
      widthM: Math.round((maxLng - minLng) * metresPerDegLng),
    };
  } catch {
    return { lengthM: 0, widthM: 0 };
  }
}

export function boundaryCentroid(boundary: LatLng[]): LatLng | null {
  if (boundary.length < 3) return null;
  try {
    const [lng, lat] = turfCentroid(turfPolygon([toGeoJsonRing(boundary)])).geometry.coordinates;
    return [lat, lng];
  } catch {
    return null;
  }
}

/** Kampong Cham pilot area, on the Mekong — sensible default view before a plot is drawn. */
export const DEFAULT_MAP_CENTER: LatLng = [12.014, 105.382];
export const DEFAULT_MAP_ZOOM = 16;
