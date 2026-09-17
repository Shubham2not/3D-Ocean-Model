import { useState, useEffect } from 'react';
import { useOceanStore, type ViewMode } from '../../stores/oceanStore';
import {
  fetchModelData,
  fetchTimesteps,
  fetchDepths,
  fetchArgoFloats,
  fetchGliders,
  fetchCtdStations,
  fetchCurrentsVectors,
  fetchColorPresets,
} from '../../services/api';

/**
 * LayersPanel — Floating left-hand control panel redesigned strictly
 * according to the reference image.
 */
export default function LayersPanel() {
  const {
    variable, setVariable,
    depthIndex, setDepthIndex,
    timeIndex, setTimeIndex,
    depths, setDepths,
    timesteps, setTimesteps,
    setModelSlice,
    setAllSlices,
    setArgoFloats,
    setGliders,
    setCtdStations,
    setCurrentsVectors,
    setColorPresets,
    isPlaying, setIsPlaying,
    setSelectedDepth,
    selectedDepth,
    viewMode, setViewMode,
    showArgoFloats, setShowArgoFloats,
    showGliders, setShowGliders,
    showCtdStations, setShowCtdStations,
    setDataSourcesModalOpen,
  } = useOceanStore();


  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [obsDropdownOpen, setObsDropdownOpen] = useState(true);

  // Discrete depth values mapping: 0, 25, 50, 100, 200, 500, 1000
  const depthValues = [0, 25, 50, 100, 200, 500, 1000];

  // Fetch initial instruments and metadata
  useEffect(() => {
    (async () => {
      try {
        const [ts, dp, presets, floats, gliders, ctds, currents] = await Promise.all([
          fetchTimesteps('temperature'),
          fetchDepths(),
          fetchColorPresets(),
          fetchArgoFloats(),
          fetchGliders(),
          fetchCtdStations(),
          fetchCurrentsVectors(),
        ]);
        setTimesteps(ts);
        setDepths(dp);
        setColorPresets(presets);
        setArgoFloats(floats);
        setGliders(gliders);
        setCtdStations(ctds);
        if (currents) setCurrentsVectors(currents);
      } catch (err) {
        console.warn('Initial fetch error, fallback data active:', err);
      }
    })();
  }, [setTimesteps, setDepths, setColorPresets, setArgoFloats, setGliders, setCtdStations, setCurrentsVectors]);

  // Fetch slice data whenever variable, depth, or time changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const slice = await fetchModelData(variable, depthIndex, timeIndex);
        if (!cancelled && slice) {
          setModelSlice(slice);
          // Also pre-fetch all depth slices for true 3D volume stack
          const dCount = depths.length > 0 ? depths.length : 7;
          const slicePromises = Array.from({ length: dCount }, (_, i) =>
            fetchModelData(variable, i, timeIndex).catch(() => null)
          );
          const allRes = await Promise.all(slicePromises);
          if (!cancelled) {
            const map: Record<number, any> = {};
            allRes.forEach((s, idx) => {
              if (s) map[idx] = s;
            });
            setAllSlices(map);
          }
        }
      } catch (err) {
        console.error('Error fetching model slice:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [variable, depthIndex, timeIndex, depths.length, setModelSlice, setAllSlices]);

  // Handle Depth Slider changes
  const handleDepthSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = parseInt(e.target.value, 10);
    // Find closest discrete depth level
    let closestIdx = 0;
    let minDiff = Infinity;
    depthValues.forEach((d, idx) => {
      const diff = Math.abs(d - rawVal);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    setSelectedDepth(depthValues[closestIdx]);
    setDepthIndex(closestIdx);
  };

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const maxT = timesteps.length > 0 ? timesteps.length - 1 : 4;
      setTimeIndex((timeIndex + 1) % (maxT + 1));
    }, 2000);
    return () => clearInterval(interval);
  }, [isPlaying, timeIndex, timesteps.length, setTimeIndex]);

  // Current timestamp string formatted nicely
  const formattedTime = timesteps[timeIndex]?.label
    ? timesteps[timeIndex].label.replace('T', ' ').slice(0, 16)
    : '2024-09-15 12:00';

  return (
    <div
      id="layers-control-container"
      style={{
        position: 'absolute',
        top: 24,
        left: 24,
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        userSelect: 'none',
      }}
    >
      {/* ━━━ Brand Header ━━━ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* 3 Wave cyan logo */}
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.8"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.5))' }}
        >
          <path d="M2 6c3-3 5-3 8 0s5 3 8 0 5-3 8 0" />
          <path d="M2 12c3-3 5-3 8 0s5 3 8 0 5-3 8 0" />
          <path d="M2 18c3-3 5-3 8 0s5 3 8 0 5-3 8 0" />
        </svg>
        <div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.4px',
              lineHeight: 1.1,
            }}
          >
            Ocean3D
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#94a3b8',
              letterSpacing: '0.4px',
              marginTop: 2,
            }}
          >
            Explore. Analyse. Protect.
          </div>
        </div>
      </div>

      {/* ━━━ Floating Layers Card ━━━ */}
      <div
        id="layers-card"
        style={{
          width: 260,
          background: 'rgba(10, 18, 36, 0.82)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(56, 189, 248, 0.22)',
          borderRadius: 14,
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65)',
          padding: '16px 18px',
          color: '#f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Card Header: Layers + Real Data Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
            Layers
          </div>
          <button
            id="open-data-sources-btn"
            onClick={() => setDataSourcesModalOpen(true)}
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 12,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 700,
              color: '#34d399',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.2s',
            }}
            title="Click to view real INCOIS LAS, Ifremer Argo GDAC & SeaNoe data sources"
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
            Real Data Active
          </button>
        </div>

        {/* Ocean Model Dropdown */}
        <div>
          <div
            id="ocean-model-dropdown"
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 6,
              padding: '7px 10px',
              fontSize: 12,
              color: '#cbd5e1',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            <span>Ocean Model (INCOIS LAS)</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              {modelDropdownOpen ? '▲' : '▼'}
            </span>
          </div>

          {modelDropdownOpen && (
            <div
              style={{
                marginTop: 4,
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: 6,
                padding: '4px 0',
                fontSize: 11,
              }}
            >
              <div
                style={{
                  padding: '6px 10px',
                  color: '#38bdf8',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'rgba(56, 189, 248, 0.1)',
                }}
                onClick={() => {
                  setModelDropdownOpen(false);
                  setDataSourcesModalOpen(true);
                }}
              >
                ✓ INCOIS LAS id-d272905813 (Real NetCDF)
              </div>
              <div
                style={{
                  padding: '6px 10px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setModelDropdownOpen(false);
                  setDataSourcesModalOpen(true);
                }}
              >
                🌐 View All 3 Real Data Sources...
              </div>
            </div>
          )}
        </div>

        {/* ── Variables Checkbox List ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Temperature */}
          <div
            onClick={() => setVariable('temperature')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: variable === 'temperature' ? '1.5px solid #38bdf8' : '1.5px solid #64748b',
                  background: variable === 'temperature' ? '#0284c7' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  color: '#ffffff',
                }}
              >
                {variable === 'temperature' && '✓'}
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: variable === 'temperature' ? '#ffffff' : '#cbd5e1',
                  fontWeight: variable === 'temperature' ? 600 : 400,
                }}
              >
                Temperature (°C)
              </span>
            </div>
            {/* Color gradient preview icon */}
            <div
              style={{
                width: 28,
                height: 10,
                borderRadius: 2,
                background: 'linear-gradient(90deg, #1e40af, #06b6d4, #10b981, #eab308, #ef4444)',
                boxShadow: '0 0 6px rgba(0,0,0,0.5)',
              }}
            />
          </div>

          {/* Salinity */}
          <div
            onClick={() => setVariable('salinity')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: variable === 'salinity' ? '1.5px solid #38bdf8' : '1.5px solid #64748b',
                  background: variable === 'salinity' ? '#0284c7' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  color: '#ffffff',
                }}
              >
                {variable === 'salinity' && '✓'}
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: variable === 'salinity' ? '#ffffff' : '#cbd5e1',
                  fontWeight: variable === 'salinity' ? 600 : 400,
                }}
              >
                Salinity (PSU)
              </span>
            </div>
            {/* Salinity streamline icon */}
            <svg width="24" height="12" viewBox="0 0 24 12" fill="none" stroke="#38bdf8" strokeWidth="2">
              <path d="M1 6 Q 6 1, 12 6 T 23 6" />
              <polyline points="19 3 23 6 19 9" />
            </svg>
          </div>

          {/* Currents */}
          <div
            onClick={() => setVariable('currents')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: variable === 'currents' ? '1.5px solid #38bdf8' : '1.5px solid #64748b',
                  background: variable === 'currents' ? '#0284c7' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  color: '#ffffff',
                }}
              >
                {variable === 'currents' && '✓'}
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: variable === 'currents' ? '#ffffff' : '#cbd5e1',
                  fontWeight: variable === 'currents' ? 600 : 400,
                }}
              >
                Currents
              </span>
            </div>
            {/* Horizontal flow arrow */}
            <svg width="24" height="12" viewBox="0 0 24 12" fill="none" stroke="#38bdf8" strokeWidth="2">
              <line x1="2" y1="6" x2="20" y2="6" />
              <polyline points="16 2 21 6 16 10" />
            </svg>
          </div>

          {/* Chlorophyll */}
          <div
            onClick={() => setVariable('chlorophyll')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: variable === 'chlorophyll' ? '1.5px solid #38bdf8' : '1.5px solid #64748b',
                  background: variable === 'chlorophyll' ? '#0284c7' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  color: '#ffffff',
                }}
              >
                {variable === 'chlorophyll' && '✓'}
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: variable === 'chlorophyll' ? '#ffffff' : '#cbd5e1',
                  fontWeight: variable === 'chlorophyll' ? 600 : 400,
                }}
              >
                Chlorophyll (mg/m³)
              </span>
            </div>
            {/* Marine whale tail / leaf icon */}
            <svg width="22" height="14" viewBox="0 0 24 16" fill="none" stroke="#38bdf8" strokeWidth="2">
              <path d="M12 14 C12 7, 2 3, 2 3 C6 7, 10 9, 12 14 Z" fill="rgba(56, 189, 248, 0.4)" />
              <path d="M12 14 C12 7, 22 3, 22 3 C18 7, 14 9, 12 14 Z" fill="rgba(56, 189, 248, 0.4)" />
            </svg>
          </div>
        </div>

        {/* ── Observations Dropdown ── */}
        <div>
          <div
            onClick={() => setObsDropdownOpen(!obsDropdownOpen)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              marginBottom: obsDropdownOpen ? 10 : 0,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>Observations</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              {obsDropdownOpen ? '▲' : '▼'}
            </span>
          </div>

          {obsDropdownOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 2 }}>
              {/* Argo Floats */}
              <div
                onClick={() => setShowArgoFloats(!showArgoFloats)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      border: showArgoFloats ? '1.5px solid #38bdf8' : '1.5px solid #64748b',
                      background: showArgoFloats ? '#0284c7' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: '#ffffff',
                    }}
                  >
                    {showArgoFloats && '✓'}
                  </div>
                  <span style={{ fontSize: 13, color: '#cbd5e1' }}>Argo Floats</span>
                </div>
                {/* Yellow circle */}
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: '#facc15',
                    boxShadow: '0 0 6px #facc15',
                    display: 'inline-block',
                  }}
                />
              </div>

              {/* Gliders */}
              <div
                onClick={() => setShowGliders(!showGliders)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      border: showGliders ? '1.5px solid #38bdf8' : '1.5px solid #64748b',
                      background: showGliders ? '#0284c7' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: '#ffffff',
                    }}
                  >
                    {showGliders && '✓'}
                  </div>
                  <span style={{ fontSize: 13, color: '#cbd5e1' }}>Gliders</span>
                </div>
                {/* White/cyan triangle */}
                <span
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderBottom: '9px solid #e0f2fe',
                    display: 'inline-block',
                    filter: 'drop-shadow(0 0 4px #38bdf8)',
                  }}
                />
              </div>

              {/* CTD Stations */}
              <div
                onClick={() => setShowCtdStations(!showCtdStations)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      border: showCtdStations ? '1.5px solid #38bdf8' : '1.5px solid #64748b',
                      background: showCtdStations ? '#0284c7' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: '#ffffff',
                    }}
                  >
                    {showCtdStations && '✓'}
                  </div>
                  <span style={{ fontSize: 13, color: '#cbd5e1' }}>CTD Stations</span>
                </div>
                {/* Cyan diamond */}
                <span
                  style={{
                    width: 8,
                    height: 8,
                    background: '#38bdf8',
                    transform: 'rotate(45deg)',
                    boxShadow: '0 0 6px #38bdf8',
                    display: 'inline-block',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── View Section (Radio Buttons) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>View</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 2 }}>
            {(['volume', 'slice', 'map2d'] as ViewMode[]).map((mode) => {
              const labels: Record<ViewMode, string> = {
                volume: '3D Volume',
                slice: 'Depth Slice',
                map2d: '2D Map',
              };
              const isSelected = viewMode === mode;
              return (
                <div
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: isSelected ? '1.5px solid #38bdf8' : '1.5px solid #64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#38bdf8',
                        }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {labels[mode]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Depth (m) Slider ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>Depth (m)</span>
            {/* Value Badge e.g. 100 */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                padding: '2px 10px',
                fontSize: 12,
                fontWeight: 600,
                color: '#f8fafc',
              }}
            >
              {selectedDepth}
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            step={25}
            value={selectedDepth}
            onChange={handleDepthSliderChange}
            style={{
              width: '100%',
              accentColor: '#38bdf8',
              height: 4,
              cursor: 'pointer',
            }}
          />
        </div>

        {/* ── Time Section ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>Time</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Play Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: isPlaying ? '#38bdf8' : '#cbd5e1',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={isPlaying ? 'Pause simulation' : 'Play simulation'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            {/* Next Step Button */}
            <button
              onClick={() => {
                const maxT = timesteps.length > 0 ? timesteps.length - 1 : 4;
                setTimeIndex((timeIndex + 1) % (maxT + 1));
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Next timestep"
            >
              ▶|
            </button>

            {/* Timestamp text pill */}
            <div
              style={{
                flex: 1,
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 11,
                color: '#cbd5e1',
                textAlign: 'center',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {formattedTime}
            </div>
          </div>

          {/* Time Scrubber Slider */}
          <input
            type="range"
            min={0}
            max={Math.max(0, timesteps.length - 1)}
            value={timeIndex}
            onChange={(e) => setTimeIndex(parseInt(e.target.value, 10))}
            style={{
              width: '100%',
              accentColor: '#38bdf8',
              height: 4,
              cursor: 'pointer',
            }}
          />
        </div>
      </div>
    </div>
  );
}
