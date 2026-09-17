/**
 * regions.ts — Water-body region definitions for labeled data coverage areas.
 *
 * Only regions backed by real API data coverage should be listed here.
 * The label is rendered on the Cesium globe at the anchor (lat, lon) and
 * fades in/out based on camera distance using the displayRange.
 *
 * Structure is extensible — add more entries as data coverage grows
 * (e.g. Bay of Bengal, Red Sea, Persian Gulf).
 */

export interface OceanRegion {
  /** Human-readable region name rendered as an atlas-style label */
  name: string;
  /** Anchor latitude (°N) for label placement */
  lat: number;
  /** Anchor longitude (°E) for label placement */
  lon: number;
  /** Bounding box [west, south, east, north] defining data coverage extent */
  bbox: [number, number, number, number];
  /** Optional subtitle (e.g. data source note) */
  subtitle?: string;
}

/**
 * Curated list of water bodies where the demo has real data coverage.
 * DO NOT add regions that lack backend data — labels should be honest.
 */
export const OCEAN_REGIONS: OceanRegion[] = [
  {
    name: 'Arabian Sea',
    lat: 15.0,
    lon: 67.0,
    bbox: [58, 3, 80, 27],
    subtitle: 'INCOIS · Copernicus',
  },
  // ── Future regions (uncomment when data is available) ──
  // {
  //   name: 'Bay of Bengal',
  //   lat: 14.0,
  //   lon: 88.0,
  //   bbox: [80, 5, 100, 23],
  // },
  // {
  //   name: 'Red Sea',
  //   lat: 20.5,
  //   lon: 38.5,
  //   bbox: [32, 12, 44, 30],
  // },
];
