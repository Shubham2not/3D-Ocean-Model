import { useMemo } from 'react';
import { Entity } from 'resium';
import * as Cesium from 'cesium';
import { useOceanStore } from '../../stores/oceanStore';
import { getInterpolator, parseCssRgb } from '../../utils/colorUtils';

/**
 * OceanCutawayBlock — Renders the dramatic 3D volumetric ocean cutaway
 * block cutting into the ocean down to 1000m depth, exactly as shown in
 * the reference image.
 *
 * Features:
 * - Vertical cross-section cut walls showing the temperature/salinity depth profile
 *   from red/orange at the surface through green/cyan to deep navy blue at 1000m.
 * - Glowing cyan boundary wireframe framing the cutaway block.
 * - Top surface slice matching the active variable.
 */
export default function OceanCutawayBlock() {
  const variable = useOceanStore((s) => s.variable);
  const selectedDepth = useOceanStore((s) => s.selectedDepth);
  const activePresetId = useOceanStore((s) => s.activePresetId);
  const colorPresets = useOceanStore((s) => s.colorPresets);
  const viewMode = useOceanStore((s) => s.viewMode);

  const interpolator = useMemo(
    () => getInterpolator(activePresetId, colorPresets),
    [activePresetId, colorPresets]
  );

  // Visual depth scale in Cesium for dramatic planetary cutaway view, responsive to depth slider
  const depthMeters = Math.min(800000, Math.max(300000, (selectedDepth / 1000) * 800000));


  // Geographic footprint of the cutaway block in the Arabian Sea
  // Matching the cutaway position in the reference image (near southwest India / central basin)
  const west = 63.5;
  const east = 73.8;
  const south = 9.2;
  const north = 16.8;

  // Generate depth profile canvas for the vertical cut walls
  const wallMaterial = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Draw vertical depth gradient: top (row 0 in canvas) = surface (warm), bottom = 1000m deep (cold)
    const imgData = ctx.createImageData(128, 256);
    const pixels = imgData.data;

    for (let row = 0; row < 256; row++) {
      // row 0 is top (surface), row 255 is bottom (deep)
      const tDepth = row / 255;
      // Exponential / thermocline decay curve
      const tColor = Math.exp(-tDepth * 2.8);
      const css = interpolator(tColor);
      const [r, g, b] = parseCssRgb(css);

      for (let col = 0; col < 128; col++) {
        const idx = (row * 128 + col) * 4;
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        // Subtle depth shading
        pixels[idx + 3] = Math.round(230 - tDepth * 40);
      }
    }
    ctx.putImageData(imgData, 0, 0);

    return new Cesium.ImageMaterialProperty({
      image: canvas,
      transparent: true,
    });
  }, [interpolator, variable]);

  // Wall positions: Front face (south edge) and Side face (east edge)
  const frontWallPositions = useMemo(() => {
    return Cesium.Cartesian3.fromDegreesArray([
      west, south,
      east, south,
    ]);
  }, [west, east, south]);

  const sideWallPositions = useMemo(() => {
    return Cesium.Cartesian3.fromDegreesArray([
      east, south,
      east, north,
    ]);
  }, [east, south, north]);

  const backWallPositions = useMemo(() => {
    return Cesium.Cartesian3.fromDegreesArray([
      east, north,
      west, north,
      west, south,
    ]);
  }, [west, east, south, north]);

  // Glowing boundary wireframe lines
  const wireframeEdges = useMemo(() => {
    const pTopSW = Cesium.Cartesian3.fromDegrees(west, south, 100);
    const pTopSE = Cesium.Cartesian3.fromDegrees(east, south, 100);
    const pTopNE = Cesium.Cartesian3.fromDegrees(east, north, 100);
    const pTopNW = Cesium.Cartesian3.fromDegrees(west, north, 100);

    const pBotSW = Cesium.Cartesian3.fromDegrees(west, south, -depthMeters);
    const pBotSE = Cesium.Cartesian3.fromDegrees(east, south, -depthMeters);
    const pBotNE = Cesium.Cartesian3.fromDegrees(east, north, -depthMeters);
    const pBotNW = Cesium.Cartesian3.fromDegrees(west, north, -depthMeters);

    return [
      // Top perimeter
      [pTopSW, pTopSE, pTopNE, pTopNW, pTopSW],
      // Bottom perimeter
      [pBotSW, pBotSE, pBotNE, pBotNW, pBotSW],
      // 4 Vertical corner pillars
      [pTopSW, pBotSW],
      [pTopSE, pBotSE],
      [pTopNE, pBotNE],
      [pTopNW, pBotNW],
    ];
  }, [west, east, south, north, depthMeters]);

  if (viewMode === 'map2d') return null;

  return (
    <>
      {/* Front Cut Wall (South facing) */}
      <Entity
        name="Cutaway Front Wall"
        wall={{
          positions: frontWallPositions,
          maximumHeights: [100, 100],
          minimumHeights: [-depthMeters, -depthMeters],
          material: wallMaterial,
        }}
      />

      {/* Side Cut Wall (East facing) */}
      <Entity
        name="Cutaway Side Wall"
        wall={{
          positions: sideWallPositions,
          maximumHeights: [100, 100],
          minimumHeights: [-depthMeters, -depthMeters],
          material: wallMaterial,
        }}
      />

      {/* Back & West interior walls */}
      <Entity
        name="Cutaway Interior Wall"
        wall={{
          positions: backWallPositions,
          maximumHeights: [100, 100, 100],
          minimumHeights: [-depthMeters, -depthMeters, -depthMeters],
          material: wallMaterial,
        }}
      />

      {/* Glowing Cyan Wireframe Edges */}
      {wireframeEdges.map((positions, idx) => (
        <Entity
          key={`wireframe-edge-${idx}`}
          polyline={{
            positions,
            width: 2.2,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.35,
              taperPower: 0.1,
              color: Cesium.Color.fromCssColorString('#38bdf8'),
            }),
            clampToGround: false,
          }}
        />
      ))}
    </>
  );
}

