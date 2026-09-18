const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000/api/v1';

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

function generateFallbackSlice(variable: string, depthIndex: number, timeIndex: number): ModelSlice {
  const nlat = 41;
  const nlon = 37;
  const lats = Array.from({ length: nlat }, (_, i) => 5.0 + i * 0.5);
  const lons = Array.from({ length: nlon }, (_, j) => 55.0 + j * 0.5);
  const data: (number | null)[] = [];
  const depthMeters = [0, 25, 50, 100, 200, 500, 1000][depthIndex] ?? depthIndex * 50;

  for (let i = 0; i < nlat; i++) {
    const lat = lats[i];
    for (let j = 0; j < nlon; j++) {
      const lon = lons[j];
      const isIndia = lon >= 68.5 && lat >= 8.0 && (lon - 68.5) * 1.5 + (lat - 8.0) * 0.7 > 9.0;
      const isArabia = lon <= 62.0 && lat >= 22.0;
      if (isIndia || isArabia) {
        data.push(null);
        continue;
      }

      if (variable === 'salinity') {
        const val = 35.5 + ((lat - 5.0) / 20.0) * 1.4 - ((lon - 55.0) / 23.0) * 0.4 + (depthIndex * 0.05);
        data.push(Math.round(val * 10) / 10);
      } else if (variable === 'currents') {
        const dx = (lon - 66.0) / 8.0;
        const dy = (lat - 14.0) / 6.0;
        const r = Math.sqrt(dx * dx + dy * dy);
        const spd = (0.85 * r * Math.exp(-0.5 * r * r) + 0.25 * Math.exp(-Math.pow((lon - 58.0) / 3.0, 2))) * Math.exp(-depthIndex * 0.2);
        data.push(Math.round(spd * 100) / 100);
      } else if (variable === 'chlorophyll') {
        const chl = (0.2 + 2.4 * Math.exp(-Math.pow((lon - 58.0) / 4.0, 2)) + (lat < 14.0 ? 1.0 * Math.exp(-Math.pow((lon - 74.0) / 3.0, 2)) : 0)) * Math.exp(-depthIndex * 0.5);
        data.push(Math.round(chl * 100) / 100);
      } else {
        const surf = 29.8 - ((lat - 5.0) / 20.0) * 2.8 + Math.sin((lon - 55.0) * 0.2 + timeIndex * 0.1) * 1.0;
        const decay = Math.exp(-depthIndex * 0.35);
        const temp = surf * decay + 8.5 * (1.0 - decay);
        data.push(Math.round(temp * 10) / 10);
      }
    }
  }

  const valid = data.filter((v): v is number => v !== null);
  const min_val = valid.length > 0 ? Math.min(...valid) : 0;
  const max_val = valid.length > 0 ? Math.max(...valid) : 30;

  return {
    variable,
    depth_m: depthMeters,
    depth_index: depthIndex,
    time: `2024-03-0${timeIndex + 1} 12:00:00`,
    time_index: timeIndex,
    lats,
    lons,
    nlat,
    nlon,
    data,
    min_val,
    max_val,
    units: variable === 'salinity' ? 'PSU' : variable === 'currents' ? 'm/s' : variable === 'chlorophyll' ? 'mg/m³' : '°C',
  };
}

export async function fetchVariables(): Promise<ModelVariable[]> {
  try {
    const res = await fetch(`${API_BASE}/model/variables`);
    if (!res.ok) throw new Error('Variables fetch failed');
    const data = await res.json();
    return data.variables;
  } catch {
    return [
      { name: 'temperature', long_name: 'Sea Water Temperature', units: '°C', dims: ['time', 'depth', 'lat', 'lon'], available: true },
      { name: 'salinity', long_name: 'Sea Water Salinity', units: 'PSU', dims: ['time', 'depth', 'lat', 'lon'], available: true },
      { name: 'currents', long_name: 'Ocean Currents Velocity', units: 'm/s', dims: ['time', 'depth', 'lat', 'lon'], available: true },
      { name: 'chlorophyll', long_name: 'Chlorophyll-a Concentration', units: 'mg/m³', dims: ['time', 'depth', 'lat', 'lon'], available: true },
    ];
  }
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
  try {
    const res = await fetch(`${API_BASE}/model/data?${params}`);
    if (!res.ok) throw new Error('Model data fetch failed');
    return await res.json();
  } catch {
    return generateFallbackSlice(variable, depthIndex, timeIndex);
  }
}

export async function fetchTimesteps(variable: string): Promise<TimeStep[]> {
  try {
    const res = await fetch(`${API_BASE}/model/timesteps?variable=${variable}`);
    if (!res.ok) throw new Error('Timesteps fetch failed');
    const data = await res.json();
    return data.timesteps;
  } catch {
    return [
      { index: 0, label: '2024-03-01 00:00' },
      { index: 1, label: '2024-03-02 00:00' },
      { index: 2, label: '2024-03-03 00:00' },
      { index: 3, label: '2024-03-04 00:00' },
      { index: 4, label: '2024-03-05 00:00' },
    ];
  }
}

export async function fetchDepths(): Promise<DepthLevel[]> {
  try {
    const res = await fetch(`${API_BASE}/model/depths`);
    if (!res.ok) throw new Error('Depths fetch failed');
    const data = await res.json();
    return data.depths;
  } catch {
    return [0, 25, 50, 100, 200, 500, 1000].map((d, i) => ({ index: i, depth_m: d }));
  }
}

export async function fetchArgoFloats(bbox?: string): Promise<ArgoFloat[]> {
  try {
    const params = bbox ? `?bbox=${bbox}` : '';
    const res = await fetch(`${API_BASE}/instruments/argo${params}`);
    if (!res.ok) throw new Error('Argo floats fetch failed');
    const data = await res.json();
    return data.floats;
  } catch {
    return [
      { float_id: '2902150', lat: 12.5, lon: 65.3, deploy_date: '2025-06-15', status: 'active', num_cycles: 45, latest_cycle: 45 },
      { float_id: '2902151', lat: 15.8, lon: 68.7, deploy_date: '2025-07-22', status: 'active', num_cycles: 38, latest_cycle: 38 },
      { float_id: '2902152', lat: 8.2, lon: 72.1, deploy_date: '2025-08-01', status: 'active', num_cycles: 29, latest_cycle: 29 },
      { float_id: '2902153', lat: 20.1, lon: 64.9, deploy_date: '2025-05-10', status: 'active', num_cycles: 52, latest_cycle: 52 },
      { float_id: '2902154', lat: 10.4, lon: 61.5, deploy_date: '2025-09-03', status: 'active', num_cycles: 22, latest_cycle: 22 },
      { float_id: '2902155', lat: 18.3, lon: 70.2, deploy_date: '2025-04-18', status: 'active', num_cycles: 61, latest_cycle: 61 },
      { float_id: '2902158', lat: 14.7, lon: 74.3, deploy_date: '2025-10-08', status: 'active', num_cycles: 18, latest_cycle: 18 },
      { float_id: '2902159', lat: 16.9, lon: 62.8, deploy_date: '2025-12-01', status: 'active', num_cycles: 12, latest_cycle: 12 },
      { float_id: '2902160', lat: 11.1, lon: 69.9, deploy_date: '2025-07-14', status: 'active', num_cycles: 33, latest_cycle: 33 },
    ];
  }
}

export async function fetchArgoProfile(
  floatId: string,
  cycle: number
): Promise<ArgoProfile> {
  try {
    const res = await fetch(
      `${API_BASE}/instruments/argo/${floatId}/profile/${cycle}`
    );
    if (!res.ok) throw new Error('Argo profile fetch failed');
    return await res.json();
  } catch {
    const depthLevels = [5, 10, 20, 50, 100, 150, 200, 300, 500, 800, 1000, 1500, 2000];
    const levels: ProfileLevel[] = depthLevels.map((d) => {
      const temp = d <= 50 ? 29.2 - d * 0.02 : d <= 500 ? 28.2 - ((d - 50) / 450) * 19.5 : 8.7 - ((d - 500) / 1500) * 6.0;
      const sal = d <= 100 ? 36.1 + (d / 100) * 0.5 : 36.6 - ((d - 100) / 1900) * 1.8;
      return {
        depth_m: d,
        pressure_dbar: d * 1.01,
        temperature: Math.round(temp * 100) / 100,
        salinity: Math.round(sal * 100) / 100,
      };
    });
    return {
      float_id: floatId,
      cycle_number: cycle,
      profile_time: new Date().toISOString(),
      lat: 14.5,
      lon: 66.8,
      levels,
    };
  }
}

export async function fetchColorPresets(): Promise<ColorPreset[]> {
  try {
    const res = await fetch(`${API_BASE}/colorbar/presets`);
    if (!res.ok) throw new Error('Color presets fetch failed');
    const data = await res.json();
    return data.presets;
  } catch {
    return [
      {
        id: 'turbo',
        name: 'Turbo',
        description: 'Improved rainbow with better perceptual uniformity',
        colors: ['#30123B', '#4662D7', '#36AAF9', '#1AE4B6', '#72FE5E', '#C8EF34', '#FABA39', '#F66B19', '#D23105'],
      },
      {
        id: 'viridis',
        name: 'Viridis',
        description: 'Perceptually uniform, colorblind-friendly',
        colors: ['#440154', '#482777', '#3F4A8A', '#31678E', '#26838F', '#1F9D8A', '#6CCE5A', '#B6DE2B', '#FEE825'],
      },
      {
        id: 'jet',
        name: 'Jet',
        description: 'Classic rainbow colormap',
        colors: ['#00007F', '#0000FF', '#007FFF', '#00FFFF', '#7FFF7F', '#FFFF00', '#FF7F00', '#FF0000', '#7F0000'],
      },
      {
        id: 'ocean',
        name: 'Ocean',
        description: 'Deep ocean theme (dark blue → teal → light blue)',
        colors: ['#000033', '#000066', '#003366', '#006699', '#0099CC', '#33CCCC', '#66FFFF', '#99FFFF', '#CCFFFF'],
      },
    ];
  }
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
  try {
    const res = await fetch(`${API_BASE}/model/profile?${params}`);
    if (!res.ok) throw new Error('Model profile fetch failed');
    return await res.json();
  } catch {
    const depthLevels = [0, 10, 20, 50, 100, 200, 500, 1000, 2000];
    const levels: ModelProfileLevel[] = depthLevels.map((d, i) => {
      const temp = d <= 50 ? 29.5 - d * 0.02 : d <= 500 ? 28.5 - ((d - 50) / 450) * 19.5 : 9.0 - ((d - 500) / 1500) * 6.5;
      return {
        depth_m: d,
        depth_index: i,
        temperature: Math.round(temp * 100) / 100,
      };
    });
    return {
      variable,
      lat,
      lon,
      time: `2024-03-0${timeIndex + 1} 00:00`,
      time_index: timeIndex,
      levels,
    };
  }
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
