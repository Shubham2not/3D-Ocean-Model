import { useMemo, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useOceanStore } from '../../stores/oceanStore';
import { getInterpolator, parseCssRgb } from '../../utils/colorUtils';
import type { ModelSlice } from '../../services/api';
import type { Interpolator } from '../../utils/colorUtils';

// ─── constants ──────────────────────────────────────────────────────────
// 1 scene-Y unit = 500 m real depth  →  surface=0, 1000 m = -2
const VERTICAL_SCALE = 1 / 500;
/** Opacity of unselected depth slices (translucent ghost layers) */
const GHOST_OPACITY = 0.22;
/** Opacity of the selected depth slice */
const SELECTED_OPACITY = 1.0;

// ─── texture builder ────────────────────────────────────────────────────
function buildTextureCanvas(
  data: number[],
  nlat: number,
  nlon: number,
  minVal: number,
  maxVal: number,
  interpolator: Interpolator,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = nlon;
  canvas.height = nlat;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(nlon, nlat);
  const pixels = imgData.data;
  const range = maxVal - minVal || 1;

  for (let i = 0; i < nlat; i++) {
    for (let j = 0; j < nlon; j++) {
      const val = data[i * nlon + j];
      const t = Math.max(0, Math.min(1, (val - minVal) / range));
      const css = interpolator(t);
      const [r, g, b] = parseCssRgb(css);
      // Flip row: API row 0 = southernmost → canvas top = northernmost
      const destRow = nlat - 1 - i;
      const idx = (destRow * nlon + j) * 4;
      pixels[idx]     = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// ─── individual slice mesh ──────────────────────────────────────────────
interface SlicePlaneProps {
  slice: ModelSlice;
  isSelected: boolean;
  interpolator: Interpolator;
  colorMin: number | null;
  colorMax: number | null;
  /** Reference lat/lon span from the surface slice, to keep all planes the same size */
  sceneSize: { planeW: number; planeH: number };
}

function SlicePlane({ slice, isSelected, interpolator, colorMin, colorMax, sceneSize }: SlicePlaneProps) {
  const { invalidate } = useThree();
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const texture = useMemo(() => {
    if (!slice || slice.data.length === 0) return null;
    const { data, nlat, nlon, min_val, max_val } = slice;
    const effectiveMin = colorMin ?? min_val;
    const effectiveMax = colorMax ?? max_val;
    const canvas = buildTextureCanvas(data, nlat, nlon, effectiveMin, effectiveMax, interpolator);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [slice, colorMin, colorMax, interpolator]);

  useEffect(() => {
    const prev = textureRef.current;
    textureRef.current = texture;
    if (prev && prev !== texture) prev.dispose();
    invalidate();
  }, [texture, invalidate]);

  if (!texture) return null;

  const depthY = -(slice.depth_m * VERTICAL_SCALE);
  const opacity = isSelected ? SELECTED_OPACITY : GHOST_OPACITY;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, depthY, 0]}>
      <planeGeometry args={[sceneSize.planeW, sceneSize.planeH, 1, 1]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        transparent={!isSelected}
        opacity={opacity}
        toneMapped={false}
        depthWrite={isSelected}
      />
    </mesh>
  );
}

// ─── stacked depth slices ───────────────────────────────────────────────
/**
 * DepthSliceStack — renders ALL fetched depth slices as stacked horizontal planes.
 * The currently-selected depth is drawn at full opacity; the rest are translucent
 * ghost layers giving a 3D sense of the ocean column.
 */
export default function DepthSliceStack() {
  const allSlices      = useOceanStore((s) => s.allSlices);
  const selectedDepth  = useOceanStore((s) => s.selectedDepth);
  const colorMin       = useOceanStore((s) => s.colorMin);
  const colorMax       = useOceanStore((s) => s.colorMax);
  const activePresetId = useOceanStore((s) => s.activePresetId);
  const colorPresets   = useOceanStore((s) => s.colorPresets);

  const interpolator = useMemo(
    () => getInterpolator(activePresetId, colorPresets),
    [activePresetId, colorPresets],
  );

  // Compute scene size from the first available slice (all slices share the same lat/lon grid)
  const sceneSize = useMemo(() => {
    const entries = Object.values(allSlices);
    if (entries.length === 0) return null;
    const ref = entries[0];
    const { lats, lons } = ref;
    const latSpan = Math.abs(lats[lats.length - 1] - lats[0]);
    const lonSpan = Math.abs(lons[lons.length - 1] - lons[0]);
    const scaleFactor = 10 / Math.max(latSpan, lonSpan);
    return {
      planeW: lonSpan * scaleFactor,
      planeH: latSpan * scaleFactor,
    };
  }, [allSlices]);

  if (!sceneSize || Object.keys(allSlices).length === 0) return null;

  // Sort by depth index so render order is deterministic
  const sortedEntries = Object.entries(allSlices)
    .map(([idxStr, slice]) => ({ depthIdx: parseInt(idxStr), slice }))
    .sort((a, b) => a.depthIdx - b.depthIdx);

  return (
    <group>
      {sortedEntries.map(({ depthIdx, slice }) => (
        <SlicePlane
          key={depthIdx}
          slice={slice}
          isSelected={slice.depth_m === selectedDepth}
          interpolator={interpolator}
          colorMin={colorMin}
          colorMax={colorMax}
          sceneSize={sceneSize}
        />
      ))}
    </group>
  );
}
