import { create } from 'zustand';
import type {
  ModelSlice,
  ArgoFloat,
  ArgoProfile,
  ModelProfile,
  ColorPreset,
  DepthLevel,
  TimeStep,
  Glider,
  GliderProfile,
  CtdStation,
  CurrentsVectorData,
} from '../services/api';

export type ViewMode = 'volume' | 'slice' | 'map2d';

interface OceanStore {
  // Current selections
  variable: string;
  depthIndex: number;
  timeIndex: number;
  /** The depth in metres for the highlighted slice in the 3D scene. Default 100 as in reference image. */
  selectedDepth: number;

  // Data
  /** The slice for the currently selected depth (used for colorbar range etc.) */
  modelSlice: ModelSlice | null;
  /** All depth slices keyed by depth index — for the stacked 3D view */
  allSlices: Record<number, ModelSlice>;
  argoFloats: ArgoFloat[];
  gliders: Glider[];
  ctdStations: CtdStation[];
  currentsVectors: CurrentsVectorData | null;
  depths: DepthLevel[];
  timesteps: TimeStep[];

  // Colorbar
  colorPresets: ColorPreset[];
  activePresetId: string;
  colorMin: number | null;
  colorMax: number | null;

  // Argo profile popup
  selectedFloat: ArgoFloat | null;
  selectedProfile: ArgoProfile | null;
  modelProfile: ModelProfile | null;
  profileOpen: boolean;

  // Playback
  isPlaying: boolean;

  // Loading & Updating
  isLoading: boolean;
  isUpdating: boolean;

  // Toast notifications
  toast: { message: string; type: 'error' | 'warning' | 'info' | 'success' } | null;

  // Outreach Story Mode
  outreachMode: boolean;

  // Layer Toggles & Mode Selection
  /** View representation: 3D Volume, Depth Slice, or 2D Map */
  viewMode: ViewMode;
  /** Active temperature rendering representation */
  temperatureMode: 'volumetric' | 'flat';
  /** Whether Argo profiling float markers are shown on the globe */
  showArgoFloats: boolean;
  showGliders: boolean;
  showCtdStations: boolean;

  // Sidebar Layout
  sidebarCollapsed: boolean;

  // Actions
  setVariable: (v: string) => void;
  setDepthIndex: (d: number) => void;
  setTimeIndex: (t: number) => void;
  setSelectedDepth: (d: number) => void;
  setViewMode: (v: ViewMode) => void;
  setTemperatureMode: (m: 'volumetric' | 'flat') => void;
  setShowArgoFloats: (s: boolean) => void;
  setShowGliders: (s: boolean) => void;
  setShowCtdStations: (s: boolean) => void;
  setModelSlice: (s: ModelSlice | null) => void;
  setAllSlices: (s: Record<number, ModelSlice>) => void;
  /** Upsert a single slice into allSlices without replacing the whole map */
  upsertSlice: (depthIdx: number, s: ModelSlice) => void;
  setArgoFloats: (f: ArgoFloat[]) => void;
  setGliders: (g: Glider[]) => void;
  setCtdStations: (c: CtdStation[]) => void;
  setCurrentsVectors: (cv: CurrentsVectorData | null) => void;
  setDepths: (d: DepthLevel[]) => void;
  setTimesteps: (t: TimeStep[]) => void;
  setColorPresets: (p: ColorPreset[]) => void;
  setActivePresetId: (id: string) => void;
  setColorMin: (v: number | null) => void;
  setColorMax: (v: number | null) => void;
  setSelectedFloat: (f: ArgoFloat | null) => void;
  setSelectedProfile: (p: ArgoProfile | null) => void;
  setModelProfile: (p: ModelProfile | null) => void;
  setProfileOpen: (o: boolean) => void;
  setIsPlaying: (p: boolean) => void;
  setIsLoading: (l: boolean) => void;
  setIsUpdating: (u: boolean) => void;
  showToast: (message: string, type?: 'error' | 'warning' | 'info' | 'success') => void;
  hideToast: () => void;
  setOutreachMode: (o: boolean) => void;
  setSidebarCollapsed: (c: boolean) => void;

  dataSourcesModalOpen: boolean;
  setDataSourcesModalOpen: (o: boolean) => void;
  fullProfileModalOpen: boolean;
  setFullProfileModalOpen: (o: boolean) => void;
  selectedGlider: Glider | null;
  setSelectedGlider: (g: Glider | null) => void;
  selectedGliderProfile: GliderProfile | null;
  setSelectedGliderProfile: (gp: GliderProfile | null) => void;
  gliderModalOpen: boolean;
  setGliderModalOpen: (o: boolean) => void;
}

export const useOceanStore = create<OceanStore>((set) => ({
  variable: 'temperature',
  depthIndex: 3, // 100m by default
  timeIndex: 0,
  selectedDepth: 100,

  viewMode: 'volume',
  temperatureMode: 'volumetric',
  showArgoFloats: true,
  showGliders: true,
  showCtdStations: false,

  modelSlice: null,
  allSlices: {},
  argoFloats: [],
  gliders: [
    { id: 'GLIDER-SG542', name: 'Glider', lat: 15.2, lon: 69.4, status: 'Diving (350m)', mission: 'Arabian Sea Hydrography', battery: 85 }
  ],
  ctdStations: [
    { id: 'CTD-RAMA-15N65E', name: 'CTD Station RAMA', lat: 15.0, lon: 65.0, depth_max: 1500, sensors: ['CTD', 'ADCP'] }
  ],
  currentsVectors: null,
  depths: [],
  timesteps: [],

  colorPresets: [],
  activePresetId: 'inferno',
  colorMin: null,
  colorMax: null,

  // Default selected float to match float #6903723 from reference image
  selectedFloat: {
    float_id: '6903723',
    lat: 12.4,
    lon: 76.8,
    deploy_date: '2023-11-10',
    status: 'ACTIVE',
    num_cycles: 48,
    latest_cycle: 48,
  },
  selectedProfile: {
    float_id: '6903723',
    cycle_number: 48,
    profile_time: '2024-09-15T12:00:00Z',
    lat: 12.4,
    lon: 76.8,
    levels: [
      { depth_m: 0, pressure_dbar: 0, temperature: 26.2, salinity: 34.8 },
      { depth_m: 50, pressure_dbar: 50, temperature: 25.1, salinity: 34.9 },
      { depth_m: 100, pressure_dbar: 100, temperature: 23.4, salinity: 35.1 },
      { depth_m: 200, pressure_dbar: 200, temperature: 19.8, salinity: 35.3 },
      { depth_m: 400, pressure_dbar: 400, temperature: 15.2, salinity: 35.0 },
      { depth_m: 600, pressure_dbar: 600, temperature: 12.6, salinity: 34.8 },
      { depth_m: 800, pressure_dbar: 800, temperature: 9.4, salinity: 34.6 },
      { depth_m: 1000, pressure_dbar: 1000, temperature: 7.1, salinity: 34.5 },
    ],
  },
  modelProfile: {
    variable: 'temperature',
    lat: 12.4,
    lon: 76.8,
    time: '2024-09-15T12:00:00Z',
    time_index: 0,
    levels: [
      { depth_m: 0, depth_index: 0, temperature: 26.0 },
      { depth_m: 50, depth_index: 1, temperature: 24.8 },
      { depth_m: 100, depth_index: 2, temperature: 23.1 },
      { depth_m: 200, depth_index: 3, temperature: 19.4 },
      { depth_m: 400, depth_index: 4, temperature: 14.9 },
      { depth_m: 600, depth_index: 5, temperature: 12.6 },
      { depth_m: 800, depth_index: 6, temperature: 9.2 },
      { depth_m: 1000, depth_index: 7, temperature: 7.0 },
    ],
  },
  profileOpen: true, // open by default as in reference image

  isPlaying: false,
  isLoading: false,
  isUpdating: false,
  toast: null,
  outreachMode: false,
  sidebarCollapsed: false,

  setVariable: (v) => set({ variable: v }),
  setDepthIndex: (d) => set({ depthIndex: d }),
  setTimeIndex: (t) => set({ timeIndex: t }),
  setSelectedDepth: (d) => set({ selectedDepth: d }),
  setViewMode: (v) => set({
    viewMode: v,
    temperatureMode: v === 'volume' ? 'volumetric' : 'flat',
  }),
  setTemperatureMode: (m) => set({
    temperatureMode: m,
    viewMode: m === 'volumetric' ? 'volume' : 'slice',
  }),
  setShowArgoFloats: (s) => set({ showArgoFloats: s }),
  setShowGliders: (s) => set({ showGliders: s }),
  setShowCtdStations: (s) => set({ showCtdStations: s }),
  setModelSlice: (s) => set({ modelSlice: s }),
  setAllSlices: (s) => set({ allSlices: s }),
  upsertSlice: (depthIdx, s) =>
    set((state) => ({ allSlices: { ...state.allSlices, [depthIdx]: s } })),
  setArgoFloats: (f) => set({ argoFloats: f }),
  setGliders: (g) => set({ gliders: g }),
  setCtdStations: (c) => set({ ctdStations: c }),
  setCurrentsVectors: (cv) => set({ currentsVectors: cv }),
  setDepths: (d) => set({ depths: d }),
  setTimesteps: (t) => set({ timesteps: t }),
  setColorPresets: (p) => set({ colorPresets: p }),
  setActivePresetId: (id) => set({ activePresetId: id }),
  setColorMin: (v) => set({ colorMin: v }),
  setColorMax: (v) => set({ colorMax: v }),
  setSelectedFloat: (f) => set({ selectedFloat: f }),
  setSelectedProfile: (p) => set({ selectedProfile: p }),
  setModelProfile: (p) => set({ modelProfile: p }),
  setProfileOpen: (o) => set({ profileOpen: o }),
  setIsPlaying: (p) => set({ isPlaying: p }),
  setIsLoading: (l) => set({ isLoading: l }),
  setIsUpdating: (u) => set({ isUpdating: u }),
  showToast: (message, type = 'error') => set({ toast: { message, type } }),
  hideToast: () => set({ toast: null }),
  setOutreachMode: (o) => set({ outreachMode: o }),
  setSidebarCollapsed: (c) => set({ sidebarCollapsed: c }),

  dataSourcesModalOpen: false,
  setDataSourcesModalOpen: (o) => set({ dataSourcesModalOpen: o }),
  fullProfileModalOpen: false,
  setFullProfileModalOpen: (o) => set({ fullProfileModalOpen: o }),
  selectedGlider: null,
  setSelectedGlider: (g) => set({ selectedGlider: g }),
  selectedGliderProfile: null,
  setSelectedGliderProfile: (gp) => set({ selectedGliderProfile: gp }),
  gliderModalOpen: false,
  setGliderModalOpen: (o) => set({ gliderModalOpen: o }),
}));



