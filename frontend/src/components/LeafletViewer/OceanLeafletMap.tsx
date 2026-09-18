import { useEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import { useOceanStore } from '../../stores/oceanStore';
import { fetchPointData, type ArgoFloat } from '../../services/api';
import { getInterpolator, parseCssRgb } from '../../utils/colorUtils';

const MODEL_BBOX: L.LatLngBoundsLiteral = [
  [5.0, 50.0],
  [25.0, 78.0],
];

export default function OceanLeafletMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayLayerRef = useRef<L.ImageOverlay | null>(null);
  const floatMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const inspectionMarkerRef = useRef<L.Marker | null>(null);
  const inspectionPopupRef = useRef<L.Popup | null>(null);

  const [basemapDropdownOpen, setBasemapDropdownOpen] = useState(false);

  const {
    variable,
    setVariable,
    depthIndex,
    timeIndex,
    modelSlice,
    argoFloats,
    showArgoFloats,
    setShowArgoFloats,
    setInspectedPoint,
    setIsInspecting,
    interpolationMethod,
    setSelectedFloat,
    setProfileOpen,
    activePresetId,
    colorPresets,
    selectedBasemap,
    setSelectedBasemap,
    googleApiKey,
    layerOpacity,
    setLayerOpacity,
    setGoogleModalOpen,
  } = useOceanStore();

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [15.0, 66.5],
      zoom: 5,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.control
      .attribution({ position: 'bottomright', prefix: 'Ocean3D' })
      .addTo(map);

    const floatsGroup = L.layerGroup().addTo(map);
    floatMarkersLayerRef.current = floatsGroup;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    let url = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    let subdomains: string[] | string = ['0', '1', '2', '3'];
    let maxZoom = 21;
    let attribution = '&copy; Google Earth / Google Maps Platform';

    if (selectedBasemap === 'google-satellite') {
      url = `https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}${googleApiKey ? `&key=${googleApiKey}` : ''}`;
      attribution = '&copy; Google Earth Photographic Satellite';
    } else if (selectedBasemap === 'google-terrain') {
      url = `https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}${googleApiKey ? `&key=${googleApiKey}` : ''}`;
      attribution = '&copy; Google Maps Shaded Relief & Terrain';
    } else if (selectedBasemap === 'google-hybrid') {
      url = `https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}${googleApiKey ? `&key=${googleApiKey}` : ''}`;
      attribution = '&copy; Google Earth Hybrid Satellite';
    } else if (selectedBasemap === 'esri-ocean') {
      url = 'https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}';
      subdomains = 'abc';
      maxZoom = 16;
      attribution = '&copy; Esri &copy; GEBCO & NOAA';
    } else {

      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      subdomains = 'abcd';
      maxZoom = 19;
      attribution = '&copy; CARTO &copy; OpenStreetMap';
    }

    const tileLayer = L.tileLayer(url, {
      maxZoom,
      subdomains,
      attribution,
    }).addTo(map);

    tileLayer.bringToBack();
    baseTileLayerRef.current = tileLayer;
  }, [selectedBasemap, googleApiKey]);

  const handleMapClick = useCallback(
    async (e: L.LeafletMouseEvent) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const { lat, lng } = e.latlng;
      const normLon = ((((lng + 180) % 360) + 360) % 360) - 180;
      const normLat = Math.max(-90, Math.min(90, lat));

      const targetIcon = L.divIcon({
        className: 'ocean-inspect-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-7 h-7 rounded-full bg-cyan-400/40 animate-ping"></span>
            <span class="relative w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_12px_#22d3ee]"></span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (!inspectionMarkerRef.current) {
        inspectionMarkerRef.current = L.marker([normLat, normLon], { icon: targetIcon, zIndexOffset: 1000 }).addTo(map);
      } else {
        inspectionMarkerRef.current.setLatLng([normLat, normLon]);
      }

      const loadingPopup = L.popup({
        offset: [0, -14],
        closeButton: true,
        className: 'ocean-glass-popup',
      })
        .setLatLng([normLat, normLon])
        .setContent(`
          <div style="padding: 6px 10px; font-family: sans-serif; color: #f1f5f9; min-width: 170px;">
            <div style="font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 4px;">
              Querying Point Data...
            </div>
            <div style="font-size: 11px; color: #38bdf8;">
              Lat: ${normLat.toFixed(4)}°, Lon: ${normLon.toFixed(4)}°
            </div>
          </div>
        `)
        .openOn(map);

      inspectionPopupRef.current = loadingPopup;
      setIsInspecting(true);

      try {
        const pointData = await fetchPointData(
          normLat,
          normLon,
          variable,
          depthIndex,
          timeIndex,
          interpolationMethod
        );

        setInspectedPoint(pointData);

        let valDisplay = pointData.value !== null ? `${pointData.value.toFixed(2)} ${pointData.units}` : 'Land / Masked';
        if (pointData.current_details) {
          valDisplay = `${pointData.current_details.speed} m/s (${pointData.current_details.compass_bearing} ${pointData.current_details.direction_deg}°)`;
        }

        const nearbyHtml = pointData.nearby_argo
          ? `
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: #a5b4fc;">
            <div style="font-weight: 600; display: flex; justify-content: space-between;">
              <span>Nearby Float #${pointData.nearby_argo.wmo_id}</span>
              <span style="color: #c7d2fe;">${pointData.nearby_argo.distance_km} km</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 2px; color: #cbd5e1; font-size: 10px;">
              <span>Observed: <b>${pointData.nearby_argo.observed_value ?? 'N/A'} ${pointData.units}</b></span>
              <span>Bias: <b style="color: ${Number(pointData.nearby_argo.model_bias_delta) > 0 ? '#f43f5e' : '#2dd4bf'};">${pointData.nearby_argo.model_bias_delta !== null ? (pointData.nearby_argo.model_bias_delta > 0 ? '+' : '') + pointData.nearby_argo.model_bias_delta : 'N/A'}</b></span>
            </div>
          </div>
        `
          : '';

        const content = `
          <div style="padding: 8px 12px; font-family: sans-serif; color: #f8fafc; min-width: 220px; line-height: 1.4;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8; background: rgba(56,189,248,0.15); padding: 2px 6px; border-radius: 4px;">
                ${pointData.variable.toUpperCase()}
              </span>
              <span style="font-size: 10px; color: #94a3b8;">${pointData.interpolation_method}</span>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 4px 0;">
              ${valDisplay}
            </div>
            <div style="font-size: 11px; color: #94a3b8;">
              <span>Coords: <b>${pointData.query_lat.toFixed(4)}°N, ${pointData.query_lon.toFixed(4)}°E</b></span>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
              <span>Source: ${pointData.source}</span>
            </div>
            ${nearbyHtml}
          </div>
        `;

        loadingPopup.setContent(content);
      } catch (err) {
        console.error('Error during click inspection:', err);
        loadingPopup.setContent(`
          <div style="padding: 8px; color: #f87171; font-size: 11px;">
            Failed to interpolate point value. Please try again.
          </div>
        `);
      } finally {
        setIsInspecting(false);
      }
    },
    [variable, depthIndex, timeIndex, interpolationMethod, setInspectedPoint, setIsInspecting]
  );

  // Wire Map Click Listener
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [handleMapClick]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !modelSlice) return;

    const { data, coastline_alpha, nlat, nlon, min_val, max_val } = modelSlice;
    if (!data || data.length === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = nlon;
    canvas.height = nlat;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(nlon, nlat);
    const pixels = imgData.data;
    const range = max_val - min_val || 1.0;

    const interpolator = getInterpolator(activePresetId, colorPresets);

    for (let i = 0; i < nlat; i++) {
      for (let j = 0; j < nlon; j++) {
        const srcIdx = i * nlon + j;
        const val = data[srcIdx];

        const destRow = nlat - 1 - i;
        const pIdx = (destRow * nlon + j) * 4;

        if (val === null || val === undefined || isNaN(val)) {

          pixels[pIdx] = 0;
          pixels[pIdx + 1] = 0;
          pixels[pIdx + 2] = 0;
          pixels[pIdx + 3] = 0;
        } else {
          const t = Math.max(0, Math.min(1, (val - min_val) / range));
          const css = interpolator(t);
          const [r, g, b] = parseCssRgb(css);

          const coastFactor = coastline_alpha ? coastline_alpha[srcIdx] : 1.0;
          const alpha = Math.round(230 * Math.max(0, Math.min(1, coastFactor)));

          pixels[pIdx] = r;
          pixels[pIdx + 1] = g;
          pixels[pIdx + 2] = b;
          pixels[pIdx + 3] = alpha;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');

    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current);
    }

    const overlay = L.imageOverlay(dataUrl, MODEL_BBOX, {
      opacity: layerOpacity,
      interactive: false,
    }).addTo(map);

    overlayLayerRef.current = overlay;
  }, [modelSlice, activePresetId, colorPresets, layerOpacity]);

  useEffect(() => {
    if (overlayLayerRef.current) {
      overlayLayerRef.current.setOpacity(layerOpacity);
    }
  }, [layerOpacity]);

  useEffect(() => {
    const group = floatMarkersLayerRef.current;
    if (!group) return;

    group.clearLayers();

    if (!showArgoFloats || !argoFloats || argoFloats.length === 0) return;

    argoFloats.forEach((float: ArgoFloat) => {
      const icon = L.divIcon({
        className: 'argo-leaflet-marker',
        html: `
          <div class="relative group cursor-pointer" style="transform: translate(-50%, -50%);">
            <div class="w-4 h-4 rounded-full bg-cyan-400/30 animate-ping absolute inset-0"></div>
            <div class="w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_8px_#22d3ee] flex items-center justify-center relative">
              <div class="w-1.5 h-1.5 rounded-full bg-slate-950"></div>
            </div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([float.lat, float.lon], { icon });

      marker.bindTooltip(
        `
        <div style="font-family: sans-serif; font-size: 11px; padding: 2px 4px; color: #f8fafc;">
          <b style="color: #38bdf8;">Argo Float #${float.float_id}</b><br/>
          <span>Lat: ${float.lat.toFixed(2)}°, Lon: ${float.lon.toFixed(2)}°</span><br/>
          <span>Cycles: ${float.latest_cycle}</span>
        </div>
      `,
        { direction: 'top', offset: [0, -10], className: 'ocean-glass-tooltip' }
      );

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedFloat(float);
        setProfileOpen(true);
      });

      group.addLayer(marker);
    });
  }, [showArgoFloats, argoFloats, setSelectedFloat, setProfileOpen]);

  const variablesList = [
    { id: 'temperature', label: 'Temperature', unit: '°C', icon: '🌡️', color: 'from-orange-500 to-rose-500' },
    { id: 'salinity', label: 'Salinity', unit: 'PSU', icon: '🧂', color: 'from-teal-500 to-cyan-500' },
    { id: 'currents', label: 'Currents', unit: 'm/s', icon: '🌊', color: 'from-sky-500 to-blue-600' },
    { id: 'chlorophyll', label: 'Chlorophyll-a', unit: 'mg/m³', icon: '🌱', color: 'from-emerald-500 to-green-600' },
  ];

  const basemapsList = [
    { id: 'google-hybrid', label: 'Google Earth Hybrid', icon: '🛰️' },
    { id: 'google-satellite', label: 'Google Earth Satellite', icon: '🌍' },
    { id: 'google-terrain', label: 'Google Earth Terrain', icon: '🏔️' },
    { id: 'dark-matter', label: 'Dark Ocean', icon: '🌑' },
    { id: 'esri-ocean', label: 'Esri Bathymetry', icon: '🌊' },
  ];

  const currentBasemap = basemapsList.find((b) => b.id === selectedBasemap) || basemapsList[0];

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950">

      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-slate-700/60 shadow-2xl">

        <div className="flex items-center gap-1">
          {variablesList.map((v) => {
            const isActive = variable.toLowerCase() === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setVariable(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-r ${v.color} text-white shadow-lg shadow-black/50 scale-105`
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{v.icon}</span>
                <span>{v.label}</span>
                <span className="text-[10px] opacity-80 font-normal">({v.unit})</span>
              </button>
            );
          })}
        </div>

        <div className="w-px h-5 bg-slate-700/60 mx-1" />

        <button
          onClick={() => setShowArgoFloats(!showArgoFloats)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            showArgoFloats
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
              : 'text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
          title="Toggle Argo Float Positions Layer"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Argo Floats</span>
        </button>
      </div>

      <div className="absolute top-20 left-7 z-[500] flex flex-col gap-2">

        <div className="relative">
          <button
            onClick={() => setBasemapDropdownOpen(!basemapDropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/85 backdrop-blur-xl border border-slate-700/80 text-xs font-semibold text-slate-100 hover:border-cyan-400 shadow-xl transition-all"
            title="Switch 2D Map Basemap"
          >
            <span>{currentBasemap.icon}</span>
            <span>{currentBasemap.label}</span>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {basemapDropdownOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 w-52 rounded-xl bg-slate-950/95 backdrop-blur-2xl border border-slate-700/80 shadow-2xl p-1.5 z-[600] space-y-1 animate-in fade-in"
              onMouseLeave={() => setBasemapDropdownOpen(false)}
            >
              {basemapsList.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBasemap(b.id);
                    setBasemapDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    selectedBasemap === b.id
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{b.icon}</span>
                    <span>{b.label}</span>
                  </div>
                  {selectedBasemap === b.id && <span className="text-cyan-400 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setGoogleModalOpen(true)}
          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-xl border border-slate-700/70 text-[11px] font-medium text-slate-200 hover:border-cyan-400/80 hover:text-white shadow-lg transition-all"
          title="Configure Google Earth API Key"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs">🔑</span>
            <span>Google Earth Key</span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              googleApiKey ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-cyan-400'
            }`}
          />
        </button>

        <div className="px-3 py-2 rounded-xl bg-slate-950/85 backdrop-blur-xl border border-slate-700/70 shadow-lg text-[11px] text-slate-300 space-y-1">
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>Overlay Opacity</span>
            <span className="text-cyan-300 font-semibold">{Math.round(layerOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            value={layerOpacity}
            onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
        <div className="px-4 py-2 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs text-slate-300 shadow-xl flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Click anywhere on the ocean map to inspect interpolated point data</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 text-[11px]">Method: <b className="text-cyan-300">{interpolationMethod}</b></span>
        </div>
      </div>
    </div>
  );
}
