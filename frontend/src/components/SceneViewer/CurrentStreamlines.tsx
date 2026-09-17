import { useMemo } from 'react';
import { Entity } from 'resium';
import * as Cesium from 'cesium';
import { useOceanStore } from '../../stores/oceanStore';

/**
 * CurrentStreamlines — Renders ocean current flow streamlines across the
 * Arabian Sea and Indian Ocean, matching the swirling white/cyan current vectors
 * seen in the reference image.
 *
 * Streamlines follow the anticyclonic gyre centered near 67°E, 14°N and the
 * coastal western boundary current (Somali / Oman jet).
 */
export default function CurrentStreamlines() {
  const variable = useOceanStore((s) => s.variable);


  // Generate realistic curved streamline paths across Arabian Sea
  const streamlinePaths = useMemo(() => {
    const paths: Cesium.Cartesian3[][] = [];
    const centerLon = 67.0;
    const centerLat = 13.5;

    // 1. Gyre elliptical streamlines (rings with outward spiral & noise)
    const ringRadii = [2.2, 3.6, 5.0, 6.5, 8.0, 9.5];
    ringRadii.forEach((r, rIdx) => {
      const numSegments = 40 + rIdx * 8;
      const points: Cesium.Cartesian3[] = [];
      const startAngle = (rIdx * 0.45);
      const sweep = Math.PI * 1.85;

      for (let i = 0; i <= numSegments; i++) {
        const theta = startAngle + (i / numSegments) * sweep;
        // Elliptical shape matching Arabian Sea basin
        const lon = centerLon + r * 1.25 * Math.cos(theta) - 0.2 * Math.sin(2 * theta);
        const lat = centerLat + r * 0.9 * Math.sin(theta);

        // Keep within ocean bounds
        if (lon >= 58 && lon <= 75.5 && lat >= 5.5 && lat <= 24.5) {
          // Subtle height above ellipsoid so it sits cleanly on water surface
          points.push(Cesium.Cartesian3.fromDegrees(lon, lat, 150));
        }
      }
      if (points.length > 5) {
        paths.push(points);
      }
    });

    // 2. Somali / Western boundary northward coastal jet streamlines
    for (let offset = 0; offset < 5; offset++) {
      const jetPoints: Cesium.Cartesian3[] = [];
      const baseLon = 59.5 + offset * 0.8;
      for (let lat = 6.0; lat <= 22.0; lat += 0.6) {
        const lon = baseLon + Math.sin((lat - 6.0) * 0.25) * 1.5 + (offset * 0.4);
        if (lon >= 58.0 && lon <= 74.0) {
          jetPoints.push(Cesium.Cartesian3.fromDegrees(lon, lat, 150));
        }
      }
      if (jetPoints.length > 5) {
        paths.push(jetPoints);
      }
    }

    // 3. Southwest Monsoon Drift eastward streamlines across southern basin
    for (let row = 0; row < 4; row++) {
      const driftPoints: Cesium.Cartesian3[] = [];
      const baseLat = 6.5 + row * 1.8;
      for (let lon = 58.0; lon <= 76.0; lon += 0.8) {
        const lat = baseLat + Math.sin((lon - 58.0) * 0.2) * 1.0;
        driftPoints.push(Cesium.Cartesian3.fromDegrees(lon, lat, 150));
      }
      if (driftPoints.length > 5) {
        paths.push(driftPoints);
      }
    }

    return paths;
  }, []);

  // Show streamlines in all modes or emphasize when Currents is selected
  const isCurrentsActive = variable === 'currents';
  const alpha = isCurrentsActive ? 0.95 : 0.65;
  const width = isCurrentsActive ? 2.8 : 1.8;

  return (
    <>
      {streamlinePaths.map((positions, idx) => (
        <Entity
          key={`streamline-${idx}`}
          polyline={{
            positions,
            width: width,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.25,
              taperPower: 0.4,
              color: Cesium.Color.fromCssColorString(
                idx % 2 === 0
                  ? `rgba(224, 242, 254, ${alpha})` // luminous cyan-white
                  : `rgba(56, 189, 248, ${alpha})`  // sky blue
              ),
            }),
            clampToGround: false,
          }}
        />
      ))}
    </>
  );
}
