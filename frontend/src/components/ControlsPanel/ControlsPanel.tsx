import { useState, useEffect, useRef, useCallback } from 'react';
import { useOceanStore } from '../../stores/oceanStore';
import DataSourcesModal from '../common/DataSourcesModal';
import {
  fetchModelData,
  fetchTimesteps,
  fetchDepths,
  fetchArgoFloats,
  fetchColorPresets,
} from '../../services/api';

/**
 * ControlsPanel — the left-side control panel.
 *
 * Sections (top → bottom):
 *   1. Variable selector dropdown
 *   2. Depth slider — 7 discrete levels (0/25/50/100/200/500/1000 m)
 *   3. Time-step player — play/pause + scrubber across 5 timesteps
 *   4. Colorbar editor — palette grid, min/max range inputs, live preview
 *   5. Footer stats
 *
 * When the time or variable changes, ALL 7 depth slices are re-fetched so
 * the stacked 3D view updates for every depth at once.
 */
export default function ControlsPanel() {
  const {
    variable, setVariable,
    depthIndex, setDepthIndex,
    timeIndex, setTimeIndex,
    depths, setDepths,
    timesteps, setTimesteps,
    setModelSlice,
    setAllSlices,
    setArgoFloats,
    colorPresets, setColorPresets,
    activePresetId, setActivePresetId,
    colorMin, setColorMin,
    colorMax, setColorMax,
    modelSlice,
    isPlaying, setIsPlaying,
    isLoading, setIsLoading,
    setIsUpdating,
    showToast,
    sidebarCollapsed, setSidebarCollapsed,
    setSelectedDepth,
  } = useOceanStore();

  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialLoadedRef = useRef(false);

  // ─── Fetch initial metadata ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
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
      } catch (err) {
        console.error('Initial load failed:', err);
        showToast('Unable to connect to ocean simulation backend at localhost:8000', 'error');
        setIsLoading(false);
      }
    })();
  }, [setTimesteps, setDepths, setColorPresets, setArgoFloats, showToast, setIsLoading]);

  // ─── Fetch ALL depth slices when variable or time change ─────────────
  const loadAllSlices = useCallback(
    async (v: string, t: number) => {
      if (!initialLoadedRef.current) {
        setIsLoading(true);
      } else {
        setIsUpdating(true);
      }

      const depthList = useOceanStore.getState().depths;
      if (depthList.length === 0) {
        setIsLoading(false);
        setIsUpdating(false);
        return;
      }

      try {
        // Fire all depth fetches in parallel
        const promises = depthList.map((dl) => fetchModelData(v, dl.index, t));
        const results = await Promise.all(promises);

        // Build the allSlices map
        const map: Record<number, typeof results[0]> = {};
        results.forEach((slice, idx) => {
          map[depthList[idx].index] = slice;
        });
        setAllSlices(map);

        // Set the "selected" modelSlice to whichever depth is currently chosen
        const currentIdx = useOceanStore.getState().depthIndex;
        if (map[currentIdx]) {
          setModelSlice(map[currentIdx]);
        }
        initialLoadedRef.current = true;
      } catch (err) {
        console.error('Failed to fetch depth slices:', err);
        showToast('Failed to fetch ocean depth slices from model backend', 'error');
      } finally {
        setIsLoading(false);
        setIsUpdating(false);
      }
    },
    [setAllSlices, setModelSlice, setIsLoading, setIsUpdating, showToast],
  );

  // Trigger load when variable, time, or depths list changes
  useEffect(() => {
    if (depths.length > 0) {
      loadAllSlices(variable, timeIndex);
    }
  }, [variable, timeIndex, depths, loadAllSlices]);

  // When depth selection changes, just swap the highlighted modelSlice from cache
  useEffect(() => {
    const allSlices = useOceanStore.getState().allSlices;
    if (allSlices[depthIndex]) {
      setModelSlice(allSlices[depthIndex]);
    }
    const dl = depths[depthIndex];
    if (dl) setSelectedDepth(dl.depth_m);
  }, [depthIndex, depths, setModelSlice, setSelectedDepth]);

  // ─── Playback logic — auto-advance every 1.5 s ──────────────────────
  useEffect(() => {
    if (isPlaying && timesteps.length > 0) {
      playIntervalRef.current = setInterval(() => {
        const state = useOceanStore.getState();
        setTimeIndex(
          state.timeIndex >= timesteps.length - 1 ? 0 : state.timeIndex + 1,
        );
      }, 1500);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, timesteps.length, setTimeIndex]);

  const currentDepth = depths[depthIndex];
  const currentTime  = timesteps[timeIndex];

  // ─── Depth tick labels for the discrete slider ───────────────────────
  const depthTickLabels = depths.map((dl) =>
    dl.depth_m === 0 ? '0' : `${dl.depth_m}`,
  );

  return (
    <div className={`controls-panel ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* ━━━ Header ━━━ */}
      <div className="controls-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
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
          <button
            onClick={() => setSidebarCollapsed(true)}
            title="Collapse controls sidebar"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 6,
              color: '#94a3b8',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 12,
              transition: 'all 0.2s ease',
            }}
          >
            ◀
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 6 }}>
          <span className="controls-subtitle">INCOIS • SIH 26067</span>
          <button
            onClick={() => setIsSourcesOpen(true)}
            id="data-sources-btn"
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 4,
              color: '#38bdf8',
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.2s ease',
            }}
            title="View Real-World Oceanographic Data Sources (INCOIS, Copernicus, Ifremer)"
          >
            <span>🌐</span>
            <span>Real Data</span>
          </button>
        </div>
      </div>


      {/* ━━━ 1. Variable Selector ━━━ */}
      <div className="control-group">
        <label className="control-label">
          <span className="label-icon">🌊</span>
          Variable
        </label>
        <select
          id="variable-selector"
          className="control-select"
          value={variable}
          onChange={(e) => setVariable(e.target.value)}
        >
          <option value="temperature">Sea Water Temperature (°C)</option>
          <option value="salinity" disabled>Salinity (PSU) — coming soon</option>
          <option value="current_u" disabled>Current U (m/s) — coming soon</option>
          <option value="current_v" disabled>Current V (m/s) — coming soon</option>
        </select>
      </div>

      {/* ━━━ 2. Depth Slider — 7 discrete levels ━━━ */}
      <div className="control-group">
        <label className="control-label">
          <span className="label-icon">📏</span>
          Depth
          <span className="control-value">
            {currentDepth ? `${currentDepth.depth_m}m` : '—'}
          </span>
        </label>
        <input
          id="depth-slider"
          type="range"
          className="control-slider"
          min={0}
          max={Math.max(0, depths.length - 1)}
          step={1}
          value={depthIndex}
          onChange={(e) => setDepthIndex(parseInt(e.target.value))}
        />
        {/* Discrete tick labels under the slider */}
        <div className="slider-labels" style={{ justifyContent: 'space-between' }}>
          {depthTickLabels.map((label, i) => (
            <span
              key={i}
              style={{
                opacity: i === depthIndex ? 1 : 0.5,
                color: i === depthIndex ? 'var(--accent-teal)' : undefined,
                fontWeight: i === depthIndex ? 700 : 400,
                fontSize: 9,
                transition: 'all 0.2s ease',
              }}
            >
              {label}m
            </span>
          ))}
        </div>
      </div>

      {/* ━━━ 3. Time-step Player ━━━ */}
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
            id="time-prev"
            className="playback-btn"
            onClick={() => setTimeIndex(Math.max(0, timeIndex - 1))}
            disabled={isPlaying}
            title="Previous"
          >
            ⏮
          </button>
          <button
            id="time-play"
            className={`playback-btn play-btn ${isPlaying ? 'active' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            id="time-next"
            className="playback-btn"
            onClick={() => setTimeIndex(Math.min(timesteps.length - 1, timeIndex + 1))}
            disabled={isPlaying}
            title="Next"
          >
            ⏭
          </button>
        </div>
        <input
          id="time-scrubber"
          type="range"
          className="control-slider"
          min={0}
          max={Math.max(0, timesteps.length - 1)}
          step={1}
          value={timeIndex}
          onChange={(e) => setTimeIndex(parseInt(e.target.value))}
        />
        {/* Time tick labels */}
        <div className="slider-labels" style={{ justifyContent: 'space-between' }}>
          {timesteps.map((ts, i) => (
            <span
              key={i}
              style={{
                opacity: i === timeIndex ? 1 : 0.5,
                color: i === timeIndex ? 'var(--accent-teal)' : undefined,
                fontWeight: i === timeIndex ? 700 : 400,
                fontSize: 9,
                transition: 'all 0.2s ease',
              }}
            >
              {ts.label.slice(5, 10)}
            </span>
          ))}
        </div>
      </div>

      {/* ━━━ 4. Colorbar Editor ━━━ */}
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
              title={preset.description}
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
              id="color-min"
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
              id="color-max"
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

      {/* Colorbar preview strip */}
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
          <span>Loading {depths.length > 0 ? `${depths.length} slices` : 'data'}…</span>
        </div>
      )}

      {/* ━━━ Footer stats ━━━ */}
      <div className="controls-footer">
        <div className="data-info">
          <span>Region: Arabian Sea</span>
          <span>Grid: {modelSlice ? `${modelSlice.nlat}×${modelSlice.nlon}` : '—'}</span>
          <span>Range: {modelSlice ? `${modelSlice.min_val.toFixed(1)}–${modelSlice.max_val.toFixed(1)} °C` : '—'}</span>
          <span>Depth layers: {Object.keys(useOceanStore.getState().allSlices).length} / {depths.length}</span>
        </div>
      </div>

      <DataSourcesModal isOpen={isSourcesOpen} onClose={() => setIsSourcesOpen(false)} />
    </div>
  );
}
