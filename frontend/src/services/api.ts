const API_BASE = 'http://localhost:8000/api/v1';

export interface ModelVariable {
  name: string;
  long_name: string;
  units: string;
  dims: string[];
  available: boolean;
}

export interface ModelSlice {
  variable: string;
  depth_m: number;
  depth_index: number;
  time: string;
  time_index: number;
  lats: number[];
  lons: number[];
  nlat: number;
  nlon: number;
  data: number[];
  min_val: number;
  max_val: number;
  units: string;
}

export interface TimeStep {
  index: number;
  label: string;
}

export interface DepthLevel {
  index: number;
  depth_m: number;
}

export interface ArgoFloat {
  float_id: string;
  lat: number;
  lon: number;
  deploy_date: string;
  status: string;
  num_cycles: number;
  latest_cycle: number;
}

export interface ProfileLevel {
  depth_m: number;
  pressure_dbar: number;
  temperature: number;
  salinity: number;
}

export interface ArgoProfile {
  float_id: string;
  cycle_number: number;
  profile_time: string;
  lat: number;
  lon: number;
  levels: ProfileLevel[];
}

export interface ColorPreset {
  id: string;
  name: string;
  description: string;
  colors: string[];
}

/** A single depth level in the model's vertical profile */
export interface ModelProfileLevel {
  depth_m: number;
  depth_index: number;
  temperature: number;
}

/** Model depth profile at a single lat/lon point — all depth levels */
export interface ModelProfile {
  variable: string;
  lat: number;
  lon: number;
  time: string;
  time_index: number;
  levels: ModelProfileLevel[];
}

export interface DataSourceLink {
  name: string;
  url: string;
  description: string;
}

export interface DataSourcesResponse {
  active_model_source: string;
  is_real_data: boolean;
  filename: string;
  links: {
    numerical_ocean_models: DataSourceLink[];
    argo_global_data: DataSourceLink[];
    glider_data: DataSourceLink[];
    in_situ_collections: DataSourceLink[];
  };
}

export interface HealthStatus {
  status: string;
}

// --- API Functions ---

export async function fetchDataSources(): Promise<DataSourcesResponse> {
  const res = await fetch(`${API_BASE}/model/sources`);
  return res.json();
}

export async function checkHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchVariables(): Promise<ModelVariable[]> {
  const res = await fetch(`${API_BASE}/model/variables`);
  const data = await res.json();
  return data.variables;
}

export async function fetchModelData(
  variable: string,
  depthIndex: number,
  timeIndex: number,
  bbox?: string
): Promise<ModelSlice> {
  const params = new URLSearchParams({
    variable,
    depth: depthIndex.toString(),
    time: timeIndex.toString(),
  });
  if (bbox) params.set('bbox', bbox);
  const res = await fetch(`${API_BASE}/model/data?${params}`);
  return res.json();
}

export async function fetchTimesteps(variable: string): Promise<TimeStep[]> {
  const res = await fetch(`${API_BASE}/model/timesteps?variable=${variable}`);
  const data = await res.json();
  return data.timesteps;
}

export async function fetchDepths(): Promise<DepthLevel[]> {
  const res = await fetch(`${API_BASE}/model/depths`);
  const data = await res.json();
  return data.depths;
}

export async function fetchArgoFloats(bbox?: string): Promise<ArgoFloat[]> {
  const params = bbox ? `?bbox=${bbox}` : '';
  const res = await fetch(`${API_BASE}/instruments/argo${params}`);
  const data = await res.json();
  return data.floats;
}

export async function fetchArgoProfile(
  floatId: string,
  cycle: number
): Promise<ArgoProfile> {
  const res = await fetch(
    `${API_BASE}/instruments/argo/${floatId}/profile/${cycle}`
  );
  return res.json();
}

export async function fetchColorPresets(): Promise<ColorPreset[]> {
  const res = await fetch(`${API_BASE}/colorbar/presets`);
  const data = await res.json();
  return data.presets;
}

/**
 * Fetch the model's temperature depth-profile at a specific lat/lon.
 * Returns temperature values at all depth levels for the given time step.
 */
export async function fetchModelProfile(
  lat: number,
  lon: number,
  timeIndex: number,
  variable: string = 'temperature',
): Promise<ModelProfile> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    time: timeIndex.toString(),
    variable,
  });
  const res = await fetch(`${API_BASE}/model/profile?${params}`);
  return res.json();
}
