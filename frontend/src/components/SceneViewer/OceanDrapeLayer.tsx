import { useEffect, useRef, useMemo } from 'react';
import { useCesium } from 'resium';
import * as Cesium from 'cesium';
import { useOceanStore } from '../../stores/oceanStore';
import { getInterpolator, parseCssRgb, type Interpolator } from '../../utils/colorUtils';
import type { ModelSlice } from '../../services/api';

const ARABIAN_SEA_RECTANGLE = Cesium.Rectangle.fromDegrees(60.0, 5.0, 78.0, 25.0);

function buildDrapeCanvas(
  slice: ModelSlice,
  minVal: number,
  maxVal: number,
  interpolator: Interpolator,
): HTMLCanvasElement {
  const { data, coastline_alpha, nlat, nlon } = slice;
  const canvas = document.createElement('canvas');
  canvas.width = nlon;
  canvas.height = nlat;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(nlon, nlat);
  const pixels = imgData.data;
  const range = maxVal - minVal || 1;

  for (let i = 0; i < nlat; i++) {
    for (let j = 0; j < nlon; j++) {
      const srcIdx = i * nlon + j;
      const val = data[srcIdx];

      const destRow = nlat - 1 - i;
      const idx = (destRow * nlon + j) * 4;

      if (val === null || val === undefined || isNaN(val)) {

        pixels[idx]     = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      } else {
        const t = Math.max(0, Math.min(1, (val - minVal) / range));
        const css = interpolator(t);
        const [r, g, b] = parseCssRgb(css);

        const coastFactor = coastline_alpha ? coastline_alpha[srcIdx] : 1.0;
        const alpha = Math.round(235 * Math.max(0, Math.min(1, coastFactor)));

        pixels[idx]     = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = alpha;
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const smoothCanvas = document.createElement('canvas');
  smoothCanvas.width = 256;
  smoothCanvas.height = 256;
  const smoothCtx = smoothCanvas.getContext('2d')!;
  smoothCtx.imageSmoothingEnabled = true;
  smoothCtx.imageSmoothingQuality = 'high';
  smoothCtx.drawImage(canvas, 0, 0, 256, 256);

  return smoothCanvas;
}

function getFallbackSlice(variable: string, depthIdx: number): ModelSlice {
  const nlat = 41;
  const nlon = 37;
  const lats = Array.from({ length: nlat }, (_, i) => 5.0 + i * 0.5);
  const lons = Array.from({ length: nlon }, (_, j) => 60.0 + j * 0.5);
  const data: (number | null)[] = [];

  for (let i = 0; i < nlat; i++) {
    const lat = lats[i];
    for (let j = 0; j < nlon; j++) {
      const lon = lons[j];

      const isIndia = lon >= 68.5 && lat >= 8.0 && (lon - 68.5) * 1.5 + (lat - 8.0) * 0.7 > 9.0;
      const isArabia = lon <= 62.0 && lat >= 20.0;
      if (isIndia || isArabia) {
        data.push(null);
        continue;
      }

      if (variable === 'salinity') {
        const val = 35.2 + ((lat - 5.0) / 20.0) * 1.6 - ((lon - 60.0) / 18.0) * 0.4;
        data.push(Math.round(val * 10) / 10);
      } else if (variable === 'currents') {
        const dx = (lon - 67.0) / 8.0;
        const dy = (lat - 14.0) / 6.0;
        const r = Math.sqrt(dx * dx + dy * dy);
        const spd = 0.9 * r * Math.exp(-0.5 * r * r) + 0.3 * Math.exp(-Math.pow((lon - 60.0) / 3.0, 2));
        data.push(Math.round(spd * 100) / 100);
      } else if (variable === 'chlorophyll') {
        const chl = 0.2 + 2.2 * Math.exp(-Math.pow((lon - 60.0) / 4.0, 2)) + (lat < 14.0 ? 1.0 * Math.exp(-Math.pow((lon - 74.0) / 3.0, 2)) : 0);
        data.push(Math.round(chl * 100) / 100);
      } else {

        const surf = 29.5 - ((lat - 5.0) / 20.0) * 2.5 + Math.sin((lon - 60.0) * 0.2) * 1.2;
        const decay = Math.exp(-depthIdx * 0.35);
        const temp = surf * decay + 10.0 * (1.0 - decay);
        data.push(Math.round(temp * 10) / 10);
      }
    }
  }

  const valid = data.filter((v): v is number => v !== null);
  const min_val = valid.length > 0 ? Math.min(...valid) : 0;
  const max_val = valid.length > 0 ? Math.max(...valid) : 30;

  return {
    variable,
    depth_m: depthIdx * 50,
    depth_index: depthIdx,
    time: '2024-09-15T12:00:00Z',
    time_index: 0,
    lats,
    lons,
    nlat,
    nlon,
    data,
    min_val,
    max_val,
    units: variable === 'salinity' ? 'PSU' : variable === 'currents' ? 'm/s' : variable === 'chlorophyll' ? 'mg/m³' : '°C',
  };
}

export default function OceanDrapeLayer() {
  const { viewer } = useCesium();
  const currentLayerRef = useRef<Cesium.ImageryLayer | null>(null);

  const allSlices = useOceanStore((s) => s.allSlices);
  const depthIndex = useOceanStore((s) => s.depthIndex);
  const modelSlice = useOceanStore((s) => s.modelSlice);
  const variable = useOceanStore((s) => s.variable);
  const colorMin = useOceanStore((s) => s.colorMin);
  const colorMax = useOceanStore((s) => s.colorMax);
  const activePresetId = useOceanStore((s) => s.activePresetId);
  const colorPresets = useOceanStore((s) => s.colorPresets);

  const activeSlice = useMemo(() => {
    return allSlices[depthIndex] ?? modelSlice ?? getFallbackSlice(variable, depthIndex);
  }, [allSlices, depthIndex, modelSlice, variable]);

  const interpolator = useMemo(
    () => getInterpolator(activePresetId, colorPresets),
    [activePresetId, colorPresets],
  );

  const effectiveMin = colorMin ?? activeSlice?.min_val ?? 0;
  const effectiveMax = colorMax ?? activeSlice?.max_val ?? 30;

  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !activeSlice || activeSlice.data.length === 0) {
      return;
    }

    let isCancelled = false;

    const updateDrapeLayer = async () => {
      try {
        const canvas = buildDrapeCanvas(activeSlice, effectiveMin, effectiveMax, interpolator);
        const dataUrl = canvas.toDataURL('image/png');

        if (isCancelled || viewer.isDestroyed()) return;

        const provider = await Cesium.SingleTileImageryProvider.fromUrl(dataUrl, {
          rectangle: ARABIAN_SEA_RECTANGLE,
        });

        if (isCancelled || viewer.isDestroyed()) return;

        const newLayer = new Cesium.ImageryLayer(provider, {
          alpha: 0.88,
          rectangle: ARABIAN_SEA_RECTANGLE,
        });

        if (currentLayerRef.current && !viewer.isDestroyed()) {
          viewer.imageryLayers.remove(currentLayerRef.current, true);
          currentLayerRef.current = null;
        }

        viewer.imageryLayers.add(newLayer);
        currentLayerRef.current = newLayer;
        viewer.scene.requestRender();
      } catch (err) {
        console.error('Failed to create OceanDrapeLayer SingleTileImageryProvider:', err);
      }
    };

    updateDrapeLayer();

    return () => {
      isCancelled = true;
    };
  }, [viewer, activeSlice, effectiveMin, effectiveMax, interpolator]);

  useEffect(() => {
    return () => {
      if (viewer && !viewer.isDestroyed() && currentLayerRef.current) {
        viewer.imageryLayers.remove(currentLayerRef.current, true);
        currentLayerRef.current = null;
        viewer.scene.requestRender();
      }
    };
  }, [viewer]);

  return null;
}
