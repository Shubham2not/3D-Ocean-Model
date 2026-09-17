import { Entity } from 'resium';
import * as Cesium from 'cesium';
import { OCEAN_REGIONS } from '../../config/regions';

/**
 * WaterBodyLabels — renders atlas-style italic labels on the Cesium globe
 * for water bodies that have real data coverage.
 *
 * Behaviour:
 * - Labels are anchored at each region's (lat, lon) just above the surface.
 * - They fade IN as the camera approaches (below ~5 000 km) and fade OUT
 *   at whole-Earth zoom (above ~8 000 km), keeping the global view clean.
 * - Styled with italic serif font, soft glow outline for legibility over
 *   both dark ocean tiles and lighter land areas.
 * - Subtitle (data source) shown in smaller text below the main name.
 */
export default function WaterBodyLabels() {
  return (
    <>
      {OCEAN_REGIONS.map((region) => {
        // Place the label slightly above the ellipsoid so it doesn't z-fight
        const position = Cesium.Cartesian3.fromDegrees(region.lon, region.lat, 200);

        return (
          <Entity
            key={region.name}
            id={`region-label-${region.name.replace(/\s+/g, '-').toLowerCase()}`}
            name={region.name}
            position={position}
            label={{
              text: region.subtitle
                ? `${region.name}\n${region.subtitle}`
                : region.name,
              font: 'italic 500 22px "Georgia", "Times New Roman", serif',
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,

              // Soft white-on-dark fill for atlas-style readability
              fillColor: Cesium.Color.fromCssColorString('rgba(200, 220, 240, 0.85)'),
              outlineColor: Cesium.Color.fromCssColorString('rgba(5, 15, 35, 0.7)'),
              outlineWidth: 3,

              // Subtle background panel for extra legibility
              showBackground: true,
              backgroundColor: Cesium.Color.fromCssColorString('rgba(8, 16, 32, 0.25)'),
              backgroundPadding: new Cesium.Cartesian2(14, 8),

              // Horizontal centering
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,

              // Always rendered on top of terrain/tiles
              disableDepthTestDistance: Number.POSITIVE_INFINITY,

              // ── Distance-based fade ──
              // Fully visible at 1 500 km altitude, fully transparent at 8 000 km.
              // This makes the label fade in as you zoom into the region and
              // disappear at whole-Earth scale.
              translucencyByDistance: new Cesium.NearFarScalar(
                1_500_000,   // near distance (m): fully opaque below this
                1.0,         // near alpha
                8_000_000,   // far distance (m): fully transparent above this
                0.0          // far alpha
              ),

              // Scale shrinks slightly when far away to avoid dominating
              scaleByDistance: new Cesium.NearFarScalar(
                1_000_000,   // near: full scale
                1.0,
                6_000_000,   // far: shrink to 60%
                0.6
              ),

              // Don't show at extreme zoom distances (beyond 10 000 km)
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10_000_000),
            }}
          />
        );
      })}
    </>
  );
}
