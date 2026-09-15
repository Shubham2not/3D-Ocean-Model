/**
 * colorUtils.ts — shared color interpolation helpers.
 *
 * Centralises the palette-id → interpolator mapping so DepthSlice,
 * DepthSliceStack, and ColorbarLegend always stay in sync.
 */
import {
  interpolateInferno,
  interpolateViridis,
  interpolatePlasma,
  interpolateTurbo,
  interpolateRdBu,
  interpolateCool,
} from 'd3-scale-chromatic';
import chroma from 'chroma-js';
import type { ColorPreset } from '../services/api';

export type Interpolator = (t: number) => string;

// ─── d3-scale-chromatic built-in interpolators ──────────────────────────
const D3_INTERPOLATORS: Record<string, Interpolator> = {
  inferno:  interpolateInferno,
  viridis:  interpolateViridis,
  plasma:   interpolatePlasma,
  turbo:    interpolateTurbo,
  rdbu:     interpolateRdBu,
  cool:     interpolateCool,
};

/**
 * Returns a (t: 0..1) → CSS-colour-string interpolator for the given
 * palette id.  d3 palettes are used when available; everything else is
 * built on-the-fly from the backend `ColorPreset.colors` list via chroma-js.
 */
export function getInterpolator(
  presetId: string,
  presets: ColorPreset[],
): Interpolator {
  // 1) Check d3 builtins first
  if (D3_INTERPOLATORS[presetId]) return D3_INTERPOLATORS[presetId];

  // 2) Build from the backend preset colour stops via chroma-js
  const preset = presets.find((p) => p.id === presetId);
  if (preset && preset.colors.length >= 2) {
    const scale = chroma.scale(preset.colors).mode('lab');
    return (t: number) => scale(t).css();
  }

  // 3) Fallback: inferno
  return interpolateInferno;
}

/**
 * Parse a CSS rgb()/rgba() string to [r, g, b] in 0-255 range.
 * Also handles hex strings (#rrggbb).
 */
export function parseCssRgb(css: string): [number, number, number] {
  // hex shortcut
  if (css.startsWith('#')) {
    const c = chroma(css).rgb();
    return [c[0], c[1], c[2]];
  }
  const m = css.match(/\d+/g);
  if (!m || m.length < 3) return [0, 0, 0];
  return [parseInt(m[0]), parseInt(m[1]), parseInt(m[2])];
}
