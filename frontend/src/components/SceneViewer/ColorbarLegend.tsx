import { useRef, useEffect, useMemo } from 'react';
import { useOceanStore } from '../../stores/oceanStore';
import { getInterpolator, parseCssRgb } from '../../utils/colorUtils';

/**
 * ColorbarLegend — a fixed HTML overlay in the bottom-right corner.
 *
 * Renders a vertical gradient strip (painted on a <canvas>) representing
 * the color scale from min → max temperature, with annotated tick labels.
 * Uses the shared getInterpolator so it matches DepthSliceStack exactly.
 */
export default function ColorbarLegend() {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const modelSlice     = useOceanStore((s) => s.modelSlice);
  const colorMin       = useOceanStore((s) => s.colorMin);
  const colorMax       = useOceanStore((s) => s.colorMax);
  const activePresetId = useOceanStore((s) => s.activePresetId);
  const colorPresets   = useOceanStore((s) => s.colorPresets);
  const selectedDepth  = useOceanStore((s) => s.selectedDepth);
  const variable       = useOceanStore((s) => s.variable);

  const interpolator = useMemo(
    () => getInterpolator(activePresetId, colorPresets),
    [activePresetId, colorPresets],
  );

  const minVal = colorMin ?? modelSlice?.min_val ?? 0;
  const maxVal = colorMax ?? modelSlice?.max_val ?? 30;
  const depthLabel = selectedDepth === 0 ? 'Surface' : `${selectedDepth} m`;
  const unitLabel = variable === 'temperature' ? '°C' : variable === 'salinity' ? 'PSU' : '';

  // Paint the gradient on the canvas whenever colormap changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    for (let row = 0; row < height; row++) {
      const t = 1 - row / (height - 1);
      const css = interpolator(t);
      const [r, g, b] = parseCssRgb(css);
      for (let col = 0; col < width; col++) {
        const idx = (row * width + col) * 4;
        pixels[idx]     = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [interpolator]);

  if (!modelSlice) return null;

  // 5 evenly-spaced tick labels
  const ticks = Array.from({ length: 5 }, (_, i) => {
    const t = i / 4;
    const val = minVal + t * (maxVal - minVal);
    const topPct = (1 - t) * 100;
    return { val, topPct };
  });

  return (
    <div
      id="colorbar-legend"
      style={{
        position: 'absolute',
        bottom: 32,
        right: 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        zIndex: 10,
        pointerEvents: 'none',
        animation: 'fadeSlideIn 0.5s ease-out',
      }}
    >
      {/* Title */}
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        textAlign: 'right',
        marginBottom: 4,
      }}>
        {variable === 'temperature' ? 'Sea Temp' : variable} · {unitLabel}
        <div style={{
          fontSize: 10,
          color: 'var(--accent-teal)',
          fontFamily: 'JetBrains Mono, monospace',
          marginTop: 2,
        }}>
          {depthLabel}
        </div>
      </div>

      {/* Gradient bar + tick labels */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
        {/* Tick labels column */}
        <div style={{ position: 'relative', width: 36, height: 200 }}>
          {ticks.map(({ val, topPct }) => (
            <span
              key={topPct}
              style={{
                position: 'absolute',
                right: 0,
                top: `${topPct}%`,
                transform: 'translateY(-50%)',
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              {val.toFixed(1)}
            </span>
          ))}
        </div>

        {/* Gradient canvas bar */}
        <div style={{
          width: 18,
          height: 200,
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          <canvas
            ref={canvasRef}
            width={18}
            height={200}
            style={{ display: 'block', width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {/* Glass panel background */}
      <style>{`
        #colorbar-legend {
          background: rgba(10, 14, 26, 0.72);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(78, 205, 196, 0.15);
          border-radius: 12px;
          padding: 14px 14px 12px 10px;
        }
      `}</style>
    </div>
  );
}
