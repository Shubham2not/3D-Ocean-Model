/**
 * OceanVolumeTexture.ts — WebGL2 3D texture utilities for volumetric ocean rendering.
 *
 * Packs the 7 depth-level grids from allSlices into a TEXTURE_3D with trilinear
 * filtering so the GPU smoothly interpolates between depth levels, and builds a
 * 1D colormap LUT texture from the active palette interpolator.
 */

import type { ModelSlice } from '../services/api';
import type { Interpolator } from './colorUtils';
import { parseCssRgb } from './colorUtils';

// ─── 3D Volume Texture ──────────────────────────────────────────────────────

export interface VolumeTextureInfo {
  texture: WebGLTexture;
  /** Actual texture dimensions [nlon, nlat, nDepthLevels] */
  dims: [number, number, number];
  /** Geographic bounds [west, south, east, north] in degrees */
  geoBounds: [number, number, number, number];
  /** Depth values in metres for each z-slice (ascending, surface first) */
  depthLevels: number[];
  /** Max depth in metres */
  maxDepth: number;
}

/**
 * Build a WebGL2 3D texture from the allSlices map.
 *
 * Data is packed as single-channel float (R32F):
 *   - x axis = longitude
 *   - y axis = latitude (south → north, matching the API row order flipped)
 *   - z axis = depth (surface at z=0, deepest at z=nDepth-1)
 *
 * Values are normalized to [0, 1] using the provided min/max range.
 * GPU trilinear filtering (`GL_LINEAR`) handles smooth interpolation
 * across all three axes.
 */
// ─── Resolution Caps ────────────────────────────────────────────────────────
// Keep 3D texture lightweight for browser performance (< 64x64x16)
export const MAX_VOLUME_DIMS: [number, number, number] = [64, 64, 16];

/**
 * Safely dispose a WebGL 3D volume texture to prevent GPU memory leaks.
 */
export function disposeVolumeTexture(
  gl: WebGL2RenderingContext | null | undefined,
  info: VolumeTextureInfo | null | undefined,
) {
  if (gl && info?.texture) {
    try {
      gl.deleteTexture(info.texture);
    } catch (e) {
      console.warn('Error disposing 3D volume texture:', e);
    }
  }
}

/**
 * Build a WebGL2 3D texture from the allSlices map.
 *
 * Data is packed as single-channel float (R32F):
 *   - x axis = longitude
 *   - y axis = latitude (south → north, matching the API row order flipped)
 *   - z axis = depth (surface at z=0, deepest at z=nDepth-1)
 *
 * Values are normalized to [0, 1] using the provided min/max range.
 * GPU trilinear filtering (`GL_LINEAR`) handles smooth interpolation
 * across all three axes.
 *
 * Resolution is strictly capped to MAX_VOLUME_DIMS ([64, 64, 16]) to ensure
 * minimal GPU memory and fast cache-friendly texture fetches.
 */
export function buildVolumeTexture(
  gl: WebGL2RenderingContext,
  allSlices: Record<number, ModelSlice>,
  depthIndices: number[],
  colorMin: number,
  colorMax: number,
): VolumeTextureInfo | null {
  // Sort depth indices by actual depth_m (ascending: surface first)
  let sorted = [...depthIndices]
    .filter((idx) => allSlices[idx] != null)
    .sort((a, b) => (allSlices[a].depth_m) - (allSlices[b].depth_m));

  if (sorted.length === 0) return null;

  // Cap depth slices to MAX_VOLUME_DIMS[2] (16 levels)
  if (sorted.length > MAX_VOLUME_DIMS[2]) {
    const step = sorted.length / MAX_VOLUME_DIMS[2];
    const cappedSorted: number[] = [];
    for (let i = 0; i < MAX_VOLUME_DIMS[2]; i++) {
      cappedSorted.push(sorted[Math.min(sorted.length - 1, Math.floor(i * step))]);
    }
    sorted = cappedSorted;
  }

  const refSlice = allSlices[sorted[0]];
  const origNlon = refSlice.nlon;
  const origNlat = refSlice.nlat;
  const nDepth = sorted.length;
  const range = colorMax - colorMin || 1;

  // Enforce resolution capping on lat/lon
  const targetNlon = Math.min(origNlon, MAX_VOLUME_DIMS[0]);
  const targetNlat = Math.min(origNlat, MAX_VOLUME_DIMS[1]);
  const shouldDownsample = targetNlon < origNlon || targetNlat < origNlat;

  // Pack into a flat Float32Array [x varies fastest, then y, then z]
  const volumeData = new Float32Array(targetNlon * targetNlat * nDepth);

  for (let z = 0; z < nDepth; z++) {
    const slice = allSlices[sorted[z]];
    for (let latIdx = 0; latIdx < targetNlat; latIdx++) {
      const srcLatIdx = shouldDownsample
        ? Math.min(origNlat - 1, Math.floor((latIdx / (targetNlat - 1 || 1)) * (origNlat - 1)))
        : latIdx;

      for (let lonIdx = 0; lonIdx < targetNlon; lonIdx++) {
        const srcLonIdx = shouldDownsample
          ? Math.min(origNlon - 1, Math.floor((lonIdx / (targetNlon - 1 || 1)) * (origNlon - 1)))
          : lonIdx;

        const srcIdx = srcLatIdx * origNlon + srcLonIdx;
        const val = slice.data[srcIdx];
        let normalized = -1.0; // Masked land cell
        if (val !== null && val !== undefined && !isNaN(val)) {
          normalized = Math.max(0, Math.min(1, (val - colorMin) / range));
        }
        // texImage3D expects: x + y*width + z*width*height
        const dstIdx = lonIdx + latIdx * targetNlon + z * targetNlon * targetNlat;
        volumeData[dstIdx] = normalized;
      }
    }
  }

  // Create the 3D texture
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_3D, tex);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

  gl.texImage3D(
    gl.TEXTURE_3D,
    0,             // mip level
    gl.R32F,       // internal format (single-channel float)
    targetNlon,    // width (longitude)
    targetNlat,    // height (latitude)
    nDepth,        // depth (depth levels)
    0,             // border
    gl.RED,        // format
    gl.FLOAT,      // type
    volumeData,
  );

  gl.bindTexture(gl.TEXTURE_3D, null);

  const lats = refSlice.lats;
  const lons = refSlice.lons;
  const depthLevels = sorted.map((idx) => allSlices[idx].depth_m);

  return {
    texture: tex,
    dims: [targetNlon, targetNlat, nDepth],
    geoBounds: [
      lons[0],                   // west
      lats[0],                   // south
      lons[lons.length - 1],     // east
      lats[lats.length - 1],     // north
    ],
    depthLevels,
    maxDepth: depthLevels[depthLevels.length - 1],
  };
}


// ─── 1D Colormap LUT Texture ────────────────────────────────────────────────

export const COLORMAP_LUT_SIZE = 256;

/**
 * Build a 256×1 RGBA8 texture that maps normalized temperature [0,1]
 * to the active palette colors. The ray-march shader samples this
 * to convert scalar temperature → display color.
 */
export function buildColormapTexture(
  gl: WebGL2RenderingContext,
  interpolator: Interpolator,
): WebGLTexture {
  const data = new Uint8Array(COLORMAP_LUT_SIZE * 4);

  for (let i = 0; i < COLORMAP_LUT_SIZE; i++) {
    const t = i / (COLORMAP_LUT_SIZE - 1);
    const css = interpolator(t);
    const [r, g, b] = parseCssRgb(css);
    const idx = i * 4;
    data[idx]     = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = 255;
  }

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    COLORMAP_LUT_SIZE,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    data,
  );

  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}
