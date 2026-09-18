import { useState } from 'react';
import { useOceanStore } from '../../stores/oceanStore';

export default function GoogleApiKeyModal() {
  const {
    googleModalOpen,
    setGoogleModalOpen,
    googleApiKey,
    setGoogleApiKey,
    selectedBasemap,
    setSelectedBasemap,
  } = useOceanStore();

  const [inputKey, setInputKey] = useState(googleApiKey);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!googleModalOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleApiKey(inputKey.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setGoogleModalOpen(false);
    }, 1200);
  };

  const handleClear = () => {
    setInputKey('');
    setGoogleApiKey('');
  };

  const basemaps = [
    { id: 'google-hybrid', label: 'Google Earth Hybrid', desc: 'Satellite with boundaries & place names', icon: '🛰️' },
    { id: 'google-satellite', label: 'Google Earth Satellite', desc: 'Pure high-res photographic satellite imagery', icon: '🌍' },
    { id: 'google-terrain', label: 'Google Earth Terrain', desc: 'Topographic relief & elevation contours', icon: '🏔️' },
    { id: 'dark-matter', label: 'Dark Ocean (CartoDB)', desc: 'High-contrast dark canvas for neon data', icon: '🌑' },
    { id: 'esri-ocean', label: 'Esri World Ocean', desc: 'Detailed marine bathymetric contours', icon: '🌊' },
  ];

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in"
      onClick={() => setGoogleModalOpen(false)}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-slate-950/95 border border-slate-700/80 shadow-2xl p-6 text-slate-100 overflow-hidden"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >

        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">🌍</span>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Google Earth & Basemap Settings
              </h2>
              <p className="text-xs text-slate-400">
                Configure Google Earth API Key for 2D map satellite imagery
              </p>
            </div>
          </div>
          <button
            onClick={() => setGoogleModalOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-5">

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Google Maps / Earth API Key
              </label>
              {googleApiKey ? (
                <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  Key Active
                </span>
              ) : (
                <span className="text-[10px] text-amber-400 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                  Optional (Public Tiles Active)
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy... (leave blank to use standard Google tiles)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-xs font-mono text-slate-100 placeholder-slate-500 transition-all"
              />
              {inputKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800"
                >
                  Clear
                </button>
              )}
            </div>

            <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
              Obtain your API Key from the{' '}
              <a
                href="https://console.cloud.google.com/google/maps-apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline"
              >
                Google Cloud Console
              </a>{' '}
              with the <i>Maps Tiles API</i> or <i>Maps JavaScript API</i> enabled. Keys can also be defined via{' '}
              <code className="text-cyan-300 font-mono text-[10px]">VITE_GOOGLE_EARTH_API_KEY</code> in{' '}
              <code className="text-slate-300 font-mono text-[10px]">frontend/.env</code>.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-2">
              Select 2D Map Basemap
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {basemaps.map((b) => {
                const isSelected = selectedBasemap === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBasemap(b.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="text-lg">{b.icon}</span>
                      <div>
                        <div className="text-xs font-semibold flex items-center gap-1.5">
                          <span>{b.label}</span>
                          {b.id.startsWith('google') && (
                            <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/30">
                              Google
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{b.desc}</div>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                        isSelected ? 'border-cyan-400 bg-cyan-400 text-slate-950 font-bold' : 'border-slate-600'
                      }`}
                    >
                      {isSelected && '✓'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            {savedSuccess ? (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span>✓</span> Key & Basemap saved!
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Persists in browser storage</span>
            )}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setGoogleModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-500/20"
              >
                Apply & Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
