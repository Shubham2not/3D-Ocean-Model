import { useRef, useEffect, useMemo } from 'react';
import { useOceanStore } from '../../stores/oceanStore';
import { getInterpolator, parseCssRgb } from '../../utils/colorUtils';

export default function HorizontalColorbar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelSlice = useOceanStore((s) => s.modelSlice);
  const colorMin = useOceanStore((s) => s.colorMin);
  const colorMax = useOceanStore((s) => s.colorMax);
  const activePresetId = useOceanStore((s) => s.activePresetId);
  const colorPresets = useOceanStore((s) => s.colorPresets);
  const variable = useOceanStore((s) => s.variable);

  const interpolator = useMemo(
    () => getInterpolator(activePresetId, colorPresets),
    [activePresetId, colorPresets]
  );

  const { minVal, maxVal, label } = useMemo(() => {
    if (variable === 'salinity') {
      return {
        minVal: colorMin ?? 34.0,
        maxVal: colorMax ?? 37.0,
        label: 'Salinity (PSU)',
      };
    }
    if (variable === 'currents' || variable === 'current') {
      return {
        minVal: colorMin ?? 0.0,
        maxVal: colorMax ?? 1.5,
        label: 'Currents (m/s)',
      };
    }
    if (variable === 'chlorophyll') {
      return {
        minVal: colorMin ?? 0.0,
        maxVal: colorMax ?? 3.0,
        label: 'Chlorophyll (mg/m³)',
      };
    }

    return {
      minVal: colorMin ?? 5.0,
      maxVal: colorMax ?? 30.0,
      label: 'Temperature (°C)',
    };
  }, [variable, colorMin, colorMax, modelSlice]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    for (let col = 0; col < width; col++) {
      const t = col / (width - 1);
      const css = interpolator(t);
      const [r, g, b] = parseCssRgb(css);
      for (let row = 0; row < height; row++) {
        const idx = (row * width + col) * 4;
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [interpolator]);

  const ticks = useMemo(() => {
    const count = 6;
    return Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1);
      const val = minVal + t * (maxVal - minVal);
      return Number.isInteger(val) ? val.toString() : val.toFixed(1);
    });
  }, [minVal, maxVal]);

  return (
    <div
      id="horizontal-colorbar-legend"
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        zIndex: 25,
        pointerEvents: 'none',
        padding: '8px 16px',
        borderRadius: 12,
        background: 'rgba(10, 18, 36, 0.65)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(56, 189, 248, 0.15)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
        userSelect: 'none',
        animation: 'fadeSlideIn 0.5s ease-out',
      }}
    >

      <div
        style={{
          width: 240,
          height: 10,
          borderRadius: 5,
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={240}
          height={10}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: 240,
          padding: '0 2px',
        }}
      >
        {ticks.map((val, idx) => (
          <span
            key={idx}
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#94a3b8',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {val}
          </span>
        ))}
      </div>

      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#e2e8f0',
          letterSpacing: '0.3px',
          marginTop: -2,
        }}
      >
        {label}
      </div>
    </div>
  );
}
