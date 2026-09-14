import { create } from 'zustand';
import type { ModelSlice, ArgoFloat, ArgoProfile, ColorPreset, DepthLevel, TimeStep } from '../services/api';

interface OceanStore {
  // Current selections
  variable: string;
  depthIndex: number;
  timeIndex: number;

  // Data
  modelSlice: ModelSlice | null;
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
  profileOpen: boolean;

  // Playback
  isPlaying: boolean;

  // Loading
  isLoading: boolean;

  // Actions
  setVariable: (v: string) => void;
  setDepthIndex: (d: number) => void;
  setTimeIndex: (t: number) => void;
  setModelSlice: (s: ModelSlice | null) => void;
  setArgoFloats: (f: ArgoFloat[]) => void;
  setDepths: (d: DepthLevel[]) => void;
  setTimesteps: (t: TimeStep[]) => void;
  setColorPresets: (p: ColorPreset[]) => void;
  setActivePresetId: (id: string) => void;
  setColorMin: (v: number | null) => void;
  setColorMax: (v: number | null) => void;
  setSelectedFloat: (f: ArgoFloat | null) => void;
  setSelectedProfile: (p: ArgoProfile | null) => void;
  setProfileOpen: (o: boolean) => void;
  setIsPlaying: (p: boolean) => void;
  setIsLoading: (l: boolean) => void;
}

export const useOceanStore = create<OceanStore>((set) => ({
  variable: 'temperature',
  depthIndex: 0,
  timeIndex: 0,

  modelSlice: null,
  argoFloats: [],
  depths: [],
  timesteps: [],

  colorPresets: [],
  activePresetId: 'jet',
  colorMin: null,
  colorMax: null,

  selectedFloat: null,
  selectedProfile: null,
  profileOpen: false,

  isPlaying: false,
  isLoading: false,

  setVariable: (v) => set({ variable: v }),
  setDepthIndex: (d) => set({ depthIndex: d }),
  setTimeIndex: (t) => set({ timeIndex: t }),
  setModelSlice: (s) => set({ modelSlice: s }),
  setArgoFloats: (f) => set({ argoFloats: f }),
  setDepths: (d) => set({ depths: d }),
  setTimesteps: (t) => set({ timesteps: t }),
  setColorPresets: (p) => set({ colorPresets: p }),
  setActivePresetId: (id) => set({ activePresetId: id }),
  setColorMin: (v) => set({ colorMin: v }),
  setColorMax: (v) => set({ colorMax: v }),
  setSelectedFloat: (f) => set({ selectedFloat: f }),
  setSelectedProfile: (p) => set({ selectedProfile: p }),
  setProfileOpen: (o) => set({ profileOpen: o }),
  setIsPlaying: (p) => set({ isPlaying: p }),
  setIsLoading: (l) => set({ isLoading: l }),
}));
