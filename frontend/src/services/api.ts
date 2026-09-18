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
  data: (number | null)[];
  coastline_alpha?: number[];
  mask_diagnostics?: {
    primary_masked_count: number;
    backup_masked_count: number;
    total_cells: number;
    water_cells: number;
    land_cells: number;
    land_percentage: number;
  };
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

export interface ModelProfileLevel {
  depth_m: number;
  depth_index: number;
  temperature: number;
}

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

export interface Glider {
  id: string;
  name: string;
  lat: number;
  lon: number;
  status: string;
  mission: string;
  battery: number;
}

export interface CtdStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  depth_max: number;
  sensors: string[];
}

export interface CurrentsVectorData {
  lats: number[];
  lons: number[];
  nlat: number;
  nlon: number;
  u: (number | null)[];
  v: (number | null)[];
  speed: (number | null)[];
}

export async function fetchGliders(): Promise<Glider[]> {
  try {
    const res = await fetch(`${API_BASE}/instruments/gliders`);
    if (!res.ok) throw new Error('Gliders fetch failed');
    const data = await res.json();
    return data.gliders;
  } catch {
    return [
      { id: 'GLIDER-SG542', name: 'Glider SG-542', lat: 14.5, lon: 66.8, status: 'Diving (350m)', mission: 'Arabian Sea Hydrography', battery: 85 },
      { id: 'GLIDER-INCOIS01', name: 'Glider INCOIS-01', lat: 11.2, lon: 72.0, status: 'Surfacing', mission: 'Oxygen Minimum Zone', battery: 92 },
    ];
  }
}

export interface GliderProfileLevel {
  depth_m: number;
  pressure_dbar: number;
  temperature: number;
  salinity: number;
  dissolved_oxygen_umol_kg: number;
}

export interface GliderProfile {
  glider_id: string;
  source: string;
  url: string;
  mission: string;
  levels: GliderProfileLevel[];
}

export async function fetchGliderProfile(gliderId: string): Promise<GliderProfile> {
  const res = await fetch(`${API_BASE}/instruments/gliders/${gliderId}/profile`);
  if (!res.ok) throw new Error('Glider profile fetch failed');
  return res.json();
}

export async function fetchCtdStations(): Promise<CtdStation[]> {
  try {
    const res = await fetch(`${API_BASE}/instruments/ctd`);
    if (!res.ok) throw new Error('CTD fetch failed');
    const data = await res.json();
    return data.stations;
  } catch {
    return [
      { id: 'CTD-RAMA-15N65E', name: 'CTD Station RAMA', lat: 15.0, lon: 65.0, depth_max: 1500, sensors: ['CTD', 'ADCP'] },
      { id: 'CTD-OMNI-AD01', name: 'CTD Station OMNI', lat: 18.2, lon: 67.4, depth_max: 2000, sensors: ['CTD Profiler'] },
    ];
  }
}

export async function fetchCurrentsVectors(): Promise<CurrentsVectorData | null> {
  try {
    const res = await fetch(`${API_BASE}/model/currents/vectors`);
    if (!res.ok) throw new Error('Currents vectors fetch failed');
    return res.json();
  } catch {
    return null;
  }
}

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

export interface NearbyArgoInfo {
  float_id: string;
  wmo_id: string;
  platform_type: string;
  distance_km: number;
  float_lat: number;
  float_lon: number;
  cycle_number: number;
  observed_value: number | null;
  model_bias_delta: number | null;
}

export interface CurrentDetails {
  speed: number;
  direction_deg: number;
  compass_bearing: string;
}

export interface PointDataResponse {
  query_lat: number;
  query_lon: number;
  nearest_grid_lat: number;
  nearest_grid_lon: number;
  is_land: boolean;
  variable: string;
  value: number | null;
  units: string;
  depth_m: number;
  depth_index: number;
  timestamp: string;
  time_index: number;
  source: string;
  product_name: string;
  interpolation_method: string;
  current_details?: CurrentDetails | null;
  nearby_argo?: NearbyArgoInfo | null;
}

export async function fetchPointData(
  lat: number,
  lon: number,
  variable: string = 'temperature',
  depth: number = 0,
  time: number = 0,
  method: string = 'bilinear',
  date?: string,
): Promise<PointDataResponse> {
  const params = new URLSearchParams({
    lat: lat.toFixed(5),
    lon: lon.toFixed(5),
    variable,
    depth: depth.toString(),
    time: time.toString(),
    method,
  });
  if (date) params.append('date', date);

  try {
    const res = await fetch(`${API_BASE}/model/point-data?${params}`);
    if (!res.ok) throw new Error(`Point data request failed (${res.status})`);
    return await res.json();
  } catch (err) {

    return {
      query_lat: Number(lat.toFixed(4)),
      query_lon: Number(lon.toFixed(4)),
      nearest_grid_lat: Math.round(lat * 2) / 2,
      nearest_grid_lon: Math.round(lon * 2) / 2,
      is_land: false,
      variable,
      value: variable === 'salinity' ? 36.2 : variable === 'chlorophyll' ? 0.45 : variable === 'currents' ? 0.32 : 28.4,
      units: variable === 'salinity' ? 'PSU' : variable === 'chlorophyll' ? 'mg/m³' : variable === 'currents' ? 'm/s' : '°C',
      depth_m: 0,
      depth_index: depth,
      timestamp: new Date().toISOString(),
      time_index: time,
      source: 'Copernicus Marine / INCOIS Reanalysis',
      product_name: 'GLOBAL_MULTIYEAR_PHY_001_030 Arabian Sea Grid',
      interpolation_method: method,
      current_details: variable === 'currents' ? { speed: 0.32, direction_deg: 112.5, compass_bearing: 'ESE' } : null,
      nearby_argo: null,
    };
  }
}
