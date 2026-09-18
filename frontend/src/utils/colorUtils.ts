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

const D3_INTERPOLATORS: Record<string, Interpolator> = {
  inferno:  interpolateInferno,
  viridis:  interpolateViridis,
  plasma:   interpolatePlasma,
  turbo:    interpolateTurbo,
  rdbu:     interpolateRdBu,
  cool:     interpolateCool,
};

export function getInterpolator(
  presetId: string,
  presets: ColorPreset[],
): Interpolator {

  if (D3_INTERPOLATORS[presetId]) return D3_INTERPOLATORS[presetId];

  const preset = presets.find((p) => p.id === presetId);
  if (preset && preset.colors.length >= 2) {
    const scale = chroma.scale(preset.colors).mode('lab');
    return (t: number) => scale(t).css();
  }

  return interpolateInferno;
}

export function parseCssRgb(css: string): [number, number, number] {

  if (css.startsWith('#')) {
    const c = chroma(css).rgb();
    return [c[0], c[1], c[2]];
  }
  const m = css.match(/\d+/g);
  if (!m || m.length < 3) return [0, 0, 0];
  return [parseInt(m[0]), parseInt(m[1]), parseInt(m[2])];
}
