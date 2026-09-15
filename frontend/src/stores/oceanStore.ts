import { create } from 'zustand';
import type { ModelSlice, ArgoFloat, ArgoProfile, ModelProfile, ColorPreset, DepthLevel, TimeStep } from '../services/api';

interface OceanStore {
  // Current selections
  variable: string;
  depthIndex: number;
  timeIndex: number;
  /** The depth in metres for the highlighted slice in the 3D scene. Default 0 = surface. */
  selectedDepth: number;

  // Data
  /** The slice for the currently selected depth (used for colorbar range etc.) */
  modelSlice: ModelSlice | null;
  /** All depth slices keyed by depth index — for the stacked 3D view */
  allSlices: Record<number, ModelSlice>;
  argoFloats: ArgoFloat[];
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

  // Sidebar Layout
  sidebarCollapsed: boolean;

  // Actions
  setVariable: (v: string) => void;
  setDepthIndex: (d: number) => void;
  setTimeIndex: (t: number) => void;
  setSelectedDepth: (d: number) => void;
  setModelSlice: (s: ModelSlice | null) => void;
  setAllSlices: (s: Record<number, ModelSlice>) => void;
  /** Upsert a single slice into allSlices without replacing the whole map */
  upsertSlice: (depthIdx: number, s: ModelSlice) => void;
  setArgoFloats: (f: ArgoFloat[]) => void;
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
}

export const useOceanStore = create<OceanStore>((set) => ({
  variable: 'temperature',
  depthIndex: 0,
  timeIndex: 0,
  selectedDepth: 0,

  modelSlice: null,
  allSlices: {},
  argoFloats: [],
  depths: [],
  timesteps: [],

  colorPresets: [],
  activePresetId: 'inferno',
  colorMin: null,
  colorMax: null,

  selectedFloat: null,
  selectedProfile: null,
  modelProfile: null,
  profileOpen: false,

  isPlaying: false,
  isLoading: true,
  isUpdating: false,
  toast: null,
  outreachMode: false,
  sidebarCollapsed: false,

  setVariable: (v) => set({ variable: v }),
  setDepthIndex: (d) => set({ depthIndex: d }),
  setTimeIndex: (t) => set({ timeIndex: t }),
  setSelectedDepth: (d) => set({ selectedDepth: d }),
  setModelSlice: (s) => set({ modelSlice: s }),
  setAllSlices: (s) => set({ allSlices: s }),
  upsertSlice: (depthIdx, s) =>
    set((state) => ({ allSlices: { ...state.allSlices, [depthIdx]: s } })),
  setArgoFloats: (f) => set({ argoFloats: f }),
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
}));


