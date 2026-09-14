import { useEffect, useRef, useCallback } from 'react';
import { useOceanStore } from '../../stores/oceanStore';
import {
  fetchModelData,
  fetchTimesteps,
  fetchDepths,
  fetchArgoFloats,
  fetchColorPresets,
} from '../../services/api';

/**
 * ControlsPanel — the left-side control panel with variable selector,
 * depth slider, time-step playback, and colorbar editor.
 */
export default function ControlsPanel() {
  const {
    variable, setVariable,
    depthIndex, setDepthIndex,
    timeIndex, setTimeIndex,
    depths, setDepths,
    timesteps, setTimesteps,
    setModelSlice,
    setArgoFloats,
    colorPresets, setColorPresets,
    activePresetId, setActivePresetId,
    colorMin, setColorMin,
    colorMax, setColorMax,
    modelSlice,
    isPlaying, setIsPlaying,
    isLoading, setIsLoading,
  } = useOceanStore();

  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch initial metadata
  useEffect(() => {
    (async () => {
      const [ts, dp, presets] = await Promise.all([
        fetchTimesteps('temperature'),
        fetchDepths(),
        fetchColorPresets(),
      ]);
      setTimesteps(ts);
      setDepths(dp);
      setColorPresets(presets);

      const floats = await fetchArgoFloats();
      setArgoFloats(floats);
    })();
  }, []);

  // Fetch model data when selections change
  const loadSlice = useCallback(async (v: string, d: number, t: number) => {
    setIsLoading(true);
    try {
      const slice = await fetchModelData(v, d, t);
      setModelSlice(slice);
    } catch (err) {
      console.error('Failed to fetch model data:', err);
    }
    setIsLoading(false);
  }, [setModelSlice, setIsLoading]);

  useEffect(() => {
    loadSlice(variable, depthIndex, timeIndex);
  }, [variable, depthIndex, timeIndex, loadSlice]);

  // Playback logic
  useEffect(() => {
    if (isPlaying && timesteps.length > 0) {
      playIntervalRef.current = setInterval(() => {
        setTimeIndex(useOceanStore.getState().timeIndex >= timesteps.length - 1
          ? 0
          : useOceanStore.getState().timeIndex + 1
        );
      }, 1200);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, timesteps.length, setTimeIndex]);

  const currentDepth = depths[depthIndex];
  const currentTime = timesteps[timeIndex];

  return (
    <div className="controls-panel">
      {/* Header */}
      <div className="controls-header">
        <div className="controls-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="url(#logo-grad)" strokeWidth="2" />
            <path d="M7 18 Q14 8 21 18" stroke="url(#logo-grad)" strokeWidth="2" fill="none" />
            <path d="M7 14 Q14 4 21 14" stroke="url(#logo-grad)" strokeWidth="1.5" fill="none" opacity="0.5" />
            <defs>
              <linearGradient id="logo-grad" x1="0" y1="0" x2="28" y2="28">
                <stop stopColor="#4ecdc4" />
                <stop offset="1" stopColor="#44a8f7" />
              </linearGradient>
            </defs>
          </svg>
          <span className="controls-title">Ocean3D</span>
        </div>
        <span className="controls-subtitle">INCOIS • SIH 26067</span>
      </div>

      {/* Variable Selector */}
      <div className="control-group">
        <label className="control-label">
          <span className="label-icon">🌊</span>
          Variable
        </label>
        <select
          className="control-select"
          value={variable}
          onChange={(e) => setVariable(e.target.value)}
        >
          <option value="temperature">Sea Water Temperature (°C)</option>
          <option value="salinity" disabled>Salinity (PSU) — coming soon</option>
          <option value="current_u" disabled>Current U (m/s) — coming soon</option>
        </select>
      </div>

      {/* Depth Slider */}
      <div className="control-group">
        <label className="control-label">
          <span className="label-icon">📏</span>
          Depth
          <span className="control-value">
            {currentDepth ? `${currentDepth.depth_m}m` : '—'}
          </span>
        </label>
        <input
          type="range"
          className="control-slider"
          min={0}
          max={Math.max(0, depths.length - 1)}
          step={1}
          value={depthIndex}
          onChange={(e) => setDepthIndex(parseInt(e.target.value))}
        />
        <div className="slider-labels">
          <span>Surface</span>
          <span>2000m</span>
        </div>
      </div>

      {/* Time Step */}
      <div className="control-group">
        <label className="control-label">
          <span className="label-icon">⏱️</span>
          Time Step
          <span className="control-value">
            {currentTime ? currentTime.label.split('T')[0] : '—'}
          </span>
        </label>
        <div className="playback-controls">
          <button
            className="playback-btn"
            onClick={() => setTimeIndex(Math.max(0, timeIndex - 1))}
            disabled={isPlaying}
            title="Previous"
          >
            ⏮
          </button>
          <button
            className={`playback-btn play-btn ${isPlaying ? 'active' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="playback-btn"
            onClick={() => setTimeIndex(Math.min(timesteps.length - 1, timeIndex + 1))}
            disabled={isPlaying}
            title="Next"
          >
            ⏭
          </button>
        </div>
        <input
          type="range"
          className="control-slider"
          min={0}
          max={Math.max(0, timesteps.length - 1)}
          step={1}
          value={timeIndex}
          onChange={(e) => setTimeIndex(parseInt(e.target.value))}
        />
      </div>

      {/* Colorbar Editor */}
      <div className="control-group">
        <label className="control-label">
          <span className="label-icon">🎨</span>
          Color Palette
        </label>
        <div className="palette-grid">
          {colorPresets.map((preset) => (
            <button
              key={preset.id}
              className={`palette-btn ${activePresetId === preset.id ? 'active' : ''}`}
              onClick={() => setActivePresetId(preset.id)}
              title={preset.name}
            >
              <div
                className="palette-preview"
                style={{
                  background: `linear-gradient(90deg, ${preset.colors.join(', ')})`,
                }}
              />
              <span className="palette-name">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Range */}
      <div className="control-group">
        <label className="control-label">
          <span className="label-icon">📊</span>
          Color Range (°C)
        </label>
        <div className="range-inputs">
          <div className="range-input-group">
            <label>Min</label>
            <input
              type="number"
              className="range-input"
              value={colorMin ?? modelSlice?.min_val ?? ''}
              onChange={(e) =>
                setColorMin(e.target.value === '' ? null : parseFloat(e.target.value))
              }
              step={0.5}
            />
          </div>
          <div className="range-input-group">
            <label>Max</label>
            <input
              type="number"
              className="range-input"
              value={colorMax ?? modelSlice?.max_val ?? ''}
              onChange={(e) =>
                setColorMax(e.target.value === '' ? null : parseFloat(e.target.value))
              }
              step={0.5}
            />
          </div>
          <button
            className="reset-btn"
            onClick={() => { setColorMin(null); setColorMax(null); }}
            title="Auto range"
          >
            ↺
          </button>
        </div>
      </div>

      {/* Colorbar preview */}
      {colorPresets.length > 0 && (
        <div className="control-group">
          <div className="colorbar-preview">
            <div
              className="colorbar-gradient"
              style={{
                background: `linear-gradient(90deg, ${(colorPresets.find(p => p.id === activePresetId)?.colors || []).join(', ')})`,
              }}
            />
            <div className="colorbar-labels">
              <span>{(colorMin ?? modelSlice?.min_val ?? 0).toFixed(1)}</span>
              <span>{variable === 'temperature' ? '°C' : ''}</span>
              <span>{(colorMax ?? modelSlice?.max_val ?? 30).toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="loading-indicator">
          <div className="loading-spinner" />
          <span>Loading data...</span>
        </div>
      )}

      {/* Info */}
      <div className="controls-footer">
        <div className="data-info">
          <span>Region: Arabian Sea</span>
          <span>Grid: {modelSlice ? `${modelSlice.nlat}×${modelSlice.nlon}` : '—'}</span>
          <span>Range: {modelSlice ? `${modelSlice.min_val.toFixed(1)}–${modelSlice.max_val.toFixed(1)} °C` : '—'}</span>
        </div>
      </div>
    </div>
  );
}
