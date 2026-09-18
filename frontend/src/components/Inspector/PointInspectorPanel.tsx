import { useOceanStore } from '../../stores/oceanStore';
import { fetchPointData } from '../../services/api';

export default function PointInspectorPanel() {
  const {
    inspectedPoint,
    setInspectedPoint,
    isInspecting,
    setIsInspecting,
    interpolationMethod,
    setInterpolationMethod,
    clearInspectedPoint,
    variable,
    depthIndex,
    timeIndex,
    setSelectedFloat,
    setFullProfileModalOpen,
    argoFloats,
  } = useOceanStore();

  if (!inspectedPoint && !isInspecting) return null;

  const handleMethodChange = async (method: 'bilinear' | 'nearest') => {
    if (!inspectedPoint) return;
    setInterpolationMethod(method);
    setIsInspecting(true);
    try {
      const updated = await fetchPointData(
        inspectedPoint.query_lat,
        inspectedPoint.query_lon,
        variable,
        depthIndex,
        timeIndex,
        method
      );
      setInspectedPoint(updated);
    } catch (err) {
      console.error('Failed to re-fetch point data with method:', method, err);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleOpenNearbyArgo = () => {
    if (!inspectedPoint?.nearby_argo) return;
    const targetWmo = inspectedPoint.nearby_argo.wmo_id;
    const float = argoFloats.find(
      (f) => String(f.float_id) === targetWmo || String((f as { wmo_id?: string }).wmo_id) === targetWmo
    );
    if (float) {
      setSelectedFloat(float);
      setFullProfileModalOpen(true);
    }
  };

  const getVariableAccent = (v: string) => {
    switch (v.toLowerCase()) {
      case 'temperature':
        return {
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          text: 'text-rose-400',
          glow: 'shadow-[0_0_20px_rgba(244,63,94,0.25)]',
          border: 'border-rose-500/30',
        };
      case 'salinity':
        return {
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          text: 'text-cyan-400',
          glow: 'shadow-[0_0_20px_rgba(6,182,212,0.25)]',
          border: 'border-cyan-500/30',
        };
      case 'currents':
        return {
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          text: 'text-sky-400',
          glow: 'shadow-[0_0_20px_rgba(14,165,233,0.25)]',
          border: 'border-sky-500/30',
        };
      case 'chlorophyll':
        return {
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          text: 'text-emerald-400',
          glow: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
          border: 'border-emerald-500/30',
        };
      default:
        return {
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          text: 'text-blue-400',
          glow: 'shadow-[0_0_20px_rgba(59,130,246,0.25)]',
          border: 'border-blue-500/30',
        };
    }
  };

  const accent = getVariableAccent(inspectedPoint?.variable || variable);

  return (
    <aside
      aria-label="Oceanographic Point Inspector"
      className="fixed top-20 right-5 z-[1000] w-[370px] max-w-[calc(100vw-2.5rem)] rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-slate-700/60 shadow-2xl text-slate-100 flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-right-4"
      style={{
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(255, 255, 255, 0.1)',
      }}
    >

      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Point Data Inspector
          </h2>
        </div>
        <button
          onClick={clearInspectedPoint}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors text-sm"
          title="Close Inspector"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <span className="text-slate-400 font-mono text-[11px]">LAT:</span>
            <span className="font-semibold text-white">
              {inspectedPoint?.query_lat.toFixed(4)}° N
            </span>
          </div>
          <div className="w-px h-3.5 bg-slate-700/60" />
          <div className="flex items-center space-x-1.5 text-slate-300">
            <span className="text-slate-400 font-mono text-[11px]">LON:</span>
            <span className="font-semibold text-white">
              {inspectedPoint?.query_lon.toFixed(4)}° E
            </span>
          </div>
          <div className="w-px h-3.5 bg-slate-700/60" />
          <span className="text-[10px] text-cyan-400/90 font-medium tracking-tight">
            Arabian Sea
          </span>
        </div>

        <div
          className={`p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border ${accent.border} ${accent.glow} relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${accent.badge}`}
            >
              {inspectedPoint?.variable || variable}
            </span>
            <span className="text-[11px] text-slate-400 flex items-center space-x-1">
              <span>Depth:</span>
              <span className="text-slate-200 font-medium">
                {inspectedPoint?.depth_m ?? 0}m
              </span>
            </span>
          </div>

          {isInspecting ? (
            <div className="py-5 flex items-center justify-center space-x-2 text-slate-400">
              <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Interpolating grid nodes...</span>
            </div>
          ) : inspectedPoint?.is_land ? (
            <div className="py-4 text-center">
              <span className="text-amber-400 text-sm font-semibold">
                Land / Coastal Boundary Node
              </span>
              <p className="text-xs text-slate-400 mt-1">
                No oceanographic model data over continental landmass.
              </p>
            </div>
          ) : (
            <div className="flex items-baseline space-x-2 my-1">
              <span className={`text-4xl font-black tracking-tight ${accent.text}`}>
                {inspectedPoint?.value !== null && inspectedPoint?.value !== undefined
                  ? inspectedPoint.value.toFixed(2)
                  : '--'}
              </span>
              <span className="text-lg font-medium text-slate-300">
                {inspectedPoint?.units || ''}
              </span>
            </div>
          )}

          {inspectedPoint?.current_details && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-800/40 rounded-lg p-1.5">
                <span className="text-[10px] text-slate-400 block">Speed</span>
                <span className="text-xs font-bold text-sky-300">
                  {inspectedPoint.current_details.speed} m/s
                </span>
              </div>
              <div className="bg-slate-800/40 rounded-lg p-1.5">
                <span className="text-[10px] text-slate-400 block">Direction</span>
                <span className="text-xs font-bold text-sky-300">
                  {inspectedPoint.current_details.direction_deg}°
                </span>
              </div>
              <div className="bg-slate-800/40 rounded-lg p-1.5">
                <span className="text-[10px] text-slate-400 block">Heading</span>
                <span className="text-xs font-bold text-sky-300">
                  {inspectedPoint.current_details.compass_bearing}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center space-x-1.5">
              <span>📐 Spatial Interpolation</span>
            </span>
            <span className="text-[10px] text-slate-400">
              Active: <span className="text-cyan-300 font-semibold">{interpolationMethod}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <button
              onClick={() => handleMethodChange('bilinear')}
              className={`py-1.5 px-2 rounded-md text-[11px] font-medium transition-all ${
                interpolationMethod === 'bilinear'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Bilinear (Sub-Grid)
            </button>
            <button
              onClick={() => handleMethodChange('nearest')}
              className={`py-1.5 px-2 rounded-md text-[11px] font-medium transition-all ${
                interpolationMethod === 'nearest'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Nearest-Neighbor
            </button>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            {interpolationMethod === 'bilinear'
              ? 'Bilinear interpolates continuously across 4 surrounding grid nodes with shoreline boundary masking.'
              : 'Nearest-neighbor samples the exact value of the closest model grid cell center.'}
          </p>
        </div>

        {inspectedPoint?.nearby_argo && (
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-indigo-950/40 to-slate-900/80 border border-indigo-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-300 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>Nearby Argo Float Comparison</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {inspectedPoint.nearby_argo.distance_km} km away
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Platform ID:</span>
                <span className="font-semibold text-white">
                  WMO #{inspectedPoint.nearby_argo.wmo_id}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">In-Situ Observed:</span>
                <span className="font-semibold text-cyan-300">
                  {inspectedPoint.nearby_argo.observed_value !== null
                    ? `${inspectedPoint.nearby_argo.observed_value} ${inspectedPoint.units}`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Model Bias (Δ):</span>
                <span
                  className={`font-semibold ${
                    inspectedPoint.nearby_argo.model_bias_delta !== null
                      ? inspectedPoint.nearby_argo.model_bias_delta > 0
                        ? 'text-rose-400'
                        : 'text-teal-400'
                      : 'text-slate-400'
                  }`}
                >
                  {inspectedPoint.nearby_argo.model_bias_delta !== null
                    ? `${inspectedPoint.nearby_argo.model_bias_delta > 0 ? '+' : ''}${
                        inspectedPoint.nearby_argo.model_bias_delta
                      } ${inspectedPoint.units}`
                    : 'N/A'}
                </span>
              </div>
            </div>

            <button
              onClick={handleOpenNearbyArgo}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition-colors flex items-center justify-center space-x-1"
            >
              <span>Inspect Float Full Profile ↗</span>
            </button>
          </div>
        )}

        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] space-y-1.5 text-slate-400">
          <div className="flex justify-between">
            <span>Timestamp:</span>
            <span className="text-slate-200 font-mono text-[10px]">
              {inspectedPoint?.timestamp ? new Date(inspectedPoint.timestamp).toUTCString() : 'Real-time'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Product:</span>
            <span className="text-slate-200 text-right truncate max-w-[200px]" title={inspectedPoint?.product_name}>
              {inspectedPoint?.product_name || 'Reanalysis'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Source:</span>
            <span className="text-cyan-300 font-medium">
              {inspectedPoint?.source || 'CMEMS / INCOIS'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
