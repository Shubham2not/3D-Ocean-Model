# Ocean3D — 3D Ocean Data Visualization Platform
### INCOIS Digital Twin | Smart India Hackathon (SIH) Problem Statement 26067

**Ocean3D** is an interactive, web-based 3D digital twin platform developed for the **Indian National Centre for Ocean Information Services (INCOIS)**, Ministry of Earth Sciences (MoES), addressing **SIH Problem Statement 26067**. It visualizes multi-dimensional oceanographic numerical model forecasts (temperature, circulation, and vertical depth slices) across the Arabian Sea stacked in 3D space, seamlessly integrated with real-time in-situ observation instruments (autonomous Argo profiling floats). By enabling simultaneous cross-sectional slicing, temporal animation, and automated Model-vs-Observation depth comparison, Ocean3D bridges the gap between high-performance ocean forecasting, marine research validation, and public scientific outreach.

---

## Architecture Overview

```
ocean3d/
├── backend/                  FastAPI RESTful microservice (Python 3.10+)
│   ├── app/
│   │   ├── main.py           API server & CORS setup
│   │   ├── routers/
│   │   │   ├── model_data.py Slices, timesteps, depths & point profile API
│   │   │   ├── argo.py       Argo float markers & profile data
│   │   │   └── colorbar.py   Scientific palette presets
│   │   └── data/             Oceanographic data generator & ROMS grid engine
│   └── requirements.txt
├── frontend/                 Interactive 3D Web App (React 18 + Vite + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── SceneViewer/  Three.js Canvas, OrbitControls, StackedPlanes, ArgoMarkers
│   │   │   ├── ControlsPanel/Depth slider, Time player, Palette selector, Range editor
│   │   │   ├── ProfileChart/ Dual-line Model vs. Argo comparison chart (react-chartjs-2)
│   │   │   └── common/       Loading splash, Error toasts, Guided Outreach mode
│   │   ├── stores/           Zustand central state store
│   │   └── services/         Typed API client
│   └── package.json
└── README.md
```

---

## Local Quickstart Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**

### 1. Backend Service (FastAPI)

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend API server on port 8000
uvicorn app.main:app --reload --port 8000
```

- **Swagger Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check Endpoint**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 2. Frontend Application (React + Vite + Three.js)

```bash
cd frontend

# Install packages
npm install

# Run Vite dev server
npm run dev
# (Or on Windows PowerShell if execution policies restrict npm scripts: npm.cmd run dev)
```

- **Web Application**: [http://localhost:5173](http://localhost:5173)

---

## Key Features

1. **Stacked 3D Ocean Slices**:
   - Renders 7 discrete depth layers (0m, 25m, 50m, 100m, 200m, 500m, 1000m) simultaneously in 3D space with continuous OrbitControls camera navigation.
   - Selected depth layer is highlighted at 100% opacity; non-selected layers display as translucent ghost slices providing spatial depth perception.
2. **Scientific Colorbar Engine**:
   - Scientific palettes powered by `d3-scale-chromatic` (Thermal, Viridis, Inferno, Turbo, Blue-Red, and Ocean).
   - Real-time user-configurable min/max value clipping with live texture regeneration.
3. **Temporal Playback**:
   - 5-timestep temporal scrubber with play/pause automation updating all 7 depth slices dynamically.
4. **Argo In-Situ Instrument Layer**:
   - Real-world autonomous Argo floats rendered as 3D pins hovering above the surface with deep-sea profiling tethers and pulsing beacons.
5. **Model-vs-Observation Comparison (SIH Brief Section 14)**:
   - Clicking any float marker opens an inverted depth-vs-temperature profile chart (`react-chartjs-2`).
   - Overlays **Argo Observed** (in-situ CTD physical measurements) against **Model** (numerical simulation prediction at that exact coordinate), calculating surface temperature bias $\Delta T$.
6. **Guided Outreach Mode**:
   - One-click tour mode for non-technical audiences, judges, and students explaining the thermocline barrier, Arabian Sea dynamics, and digital twin validation.
7. **Responsive & Projector Ready**:
   - Collapsible sidebar with smooth hardware-accelerated transitions to maximize the 3D viewport on presentation displays (1280x720 and projectors).

---

## Real-World Data Architecture & Links

Ocean3D natively supports **real NetCDF model files** and **real Ifremer GDAC Argo profiles**, with automatic fallback to synthetic physics when offline:

```
backend/data/
├── netcdf/           Place real model NetCDF files here (*.nc, *.nc4)
│   └── arabian_sea_copernicus_extract.nc (Active Copernicus Marine sample)
└── argo/             Place real Argo NetCDF (*_prof.nc) or ASCII profile files here
    ├── 2902150_prof.nc
    ├── 2902156_prof.nc
    └── ...
```

### Official Real-World Data Portals

1. **Numerical Ocean Model Outputs**:
   - **INCOIS Live Access Server (LAS)**: [https://las.incois.gov.in/](https://las.incois.gov.in/) — High-resolution operational ocean forecasting system (ROMS / GODAS).
   - **Copernicus Marine Physics Reanalysis (`GLOBAL_MULTIYEAR_PHY_001_030`)**: [https://data.marine.copernicus.eu/product/GLOBAL_MULTIYEAR_PHY_001_030/description](https://data.marine.copernicus.eu/product/GLOBAL_MULTIYEAR_PHY_001_030/description) — 1/12° physical ocean reanalysis with 50 vertical depth levels.
2. **Argo Global Observational Data**:
   - **Ifremer GDAC FTP**: `ftp://ftp.ifremer.fr/ifremer/argo`
   - **Ifremer GDAC HTTP Mirror**: [https://data-argo.ifremer.fr/](https://data-argo.ifremer.fr/) — Official global repository for real-time and delayed-mode Argo profiling float NetCDF files.
3. **Deep-Sea Glider Data**:
   - **Ifremer Glider FTP**: `ftp://ftp.ifremer.fr/ifremer/glider/v2/` — Autonomous underwater glider transect data.
4. **Collection of In-Situ Data**:
   - **INCOIS In-Situ Observation Portal**: [https://incois.gov.in/portal/datainfo/insitu.jsp](https://incois.gov.in/portal/datainfo/insitu.jsp) — Indian Ocean moored buoys, wave rider buoys, drifters, and coastal ADCPs.
   - **OceanOPS / WMO-IOC Global Ocean Observing System**: [https://www.ocean-ops.org/](https://www.ocean-ops.org/) — Real-time tracking of in-situ marine meteorological and oceanographic platforms.

---

## Data Status: Real vs. Synthetic Fallback

| Component | Status | Details |
| :--- | :--- | :--- |
| **Model Loader (`netcdf_loader.py`)** | **Real NetCDF Active** | Uses `xarray` & `netCDF4` to ingest real NetCDF files from `backend/data/netcdf/`. Auto-converts Kelvin to Celsius ($T - 273.15$), handles land masks, and standardizes dimensions (`time`, `depth`, `lat`, `lon`). |
| **Argo Parser (`argo_parser.py`)** | **Real GDAC NetCDF Active** | Parses authentic Ifremer GDAC Argo 3.1 NetCDF files (`PRES`, `TEMP`, `PSAL`, `LATITUDE`, `LONGITUDE`, `CYCLE_NUMBER`). |
| **Geographic Grid** | **Real** | Exact Arabian Sea coordinate boundary (5.0°N to 25.0°N, 50.0°E to 78.0°E) mapped with physical aspect ratio. |
| **Automatic Fallback** | **Zero-Downtime Guard** | If a judge or reviewer deletes or corrupts the NetCDF file, the backend automatically engages the procedural thermodynamic physics generator so the live demo never fails. |

---

## Interactive 4-Variable Oceanographic Layer & Click-to-Inspect

Ocean3D provides an interactive multi-variable layer featuring both a **2D Leaflet Map** and a **3D Cesium Earth Globe** with high-resolution gridded overlays and click-to-inspect point data analysis.

### 1. Variables & Supported Data Products

| Variable | Units | Visualization Type | Default Public Dataset / Product |
| :--- | :--- | :--- | :--- |
| **Temperature** | `°C` | Continuous thermal colormap raster | Copernicus Marine Service (**CMEMS**) `GLOBAL_MULTIYEAR_PHY_001_030` / INCOIS LAS |
| **Salinity** | `PSU` | Haline colormap raster | Copernicus Marine Service (**CMEMS**) Physical Ocean Reanalysis |
| **Currents** | `m/s` (+ heading) | Flow velocity speed overlay + directional vectors | NOAA Ocean Surface Current Analyses Real-time (**OSCAR**) / CMEMS Surface Velocity |
| **Chlorophyll-a** | `mg/m³` | Satellite ocean color algae colormap | NASA Ocean Color (**MODIS-Aqua**) L3 Mapped 4km / GlobColour |

---

### Google Earth Basemap Integration (2D Map)

The 2D Leaflet map supports high-resolution photographic satellite imagery and terrain directly from **Google Earth & Google Maps Platform**:

- **Basemaps Included**:
  - **Google Earth Hybrid**: Satellite imagery with international borders, coastlines, and place names.
  - **Google Earth Satellite**: High-resolution photographic satellite imagery.
  - **Google Earth Terrain**: Topographic elevation contours and shaded relief.
  - **Dark Ocean (CartoDB)**: Sleek dark canvas for high-contrast neon ocean data overlays.
  - **Esri World Ocean**: Bathymetric depth contours and seabed geology.
- **Configuring Your Google API Key**:
  - **Via UI**: Click the **🔑 Google Earth Key** button directly on the 2D map to open the settings modal, paste your API key, and select your preferred basemap. The key persists in your browser storage.
  - **Via `.env`**: Set `VITE_GOOGLE_EARTH_API_KEY="AIzaSy..."` in `frontend/.env`.
- **Dynamic Opacity Control**: Use the floating opacity slider on the 2D map to blend between the oceanographic data layer and the underlying Google Earth photographic satellite basemap.

---

### 2. Click-to-Inspect API Endpoint

The backend exposes a high-performance spatial interpolation endpoint:

```http
GET /point-data?lat=15.2&lon=65.4&variable=temperature&depth=0&time=0&method=bilinear
```
*(Also aliased at `/api/v1/model/point-data`)*

#### Query Parameters:
- `lat` *(float, required)*: Query latitude (e.g. `15.2`)
- `lon` *(float, required)*: Query longitude (e.g. `65.4`)
- `variable` *(string, default: `temperature`)*: `temperature`, `salinity`, `currents`, or `chlorophyll`
- `depth` *(int, default: `0`)*: Depth level index (`0` = surface)
- `time` *(int, default: `0`)*: Timestep index
- `date` *(string, optional)*: ISO date string to query specific date (e.g. `2024-09-15`)
- `method` *(string, default: `bilinear`)*: `bilinear` (smooth sub-grid) or `nearest` (grid cell center)

#### Sample Response Payload:
```json
{
  "query_lat": 15.2,
  "query_lon": 65.4,
  "nearest_grid_lat": 15.0,
  "nearest_grid_lon": 65.5,
  "is_land": false,
  "variable": "temperature",
  "value": 28.37,
  "units": "°C",
  "depth_m": 0,
  "depth_index": 0,
  "timestamp": "2024-09-15T12:00:00Z",
  "time_index": 0,
  "source": "INCOIS LAS / Copernicus Marine Service (CMEMS)",
  "product_name": "CMEMS Physical Ocean Temperature Analysis (GLOBAL_MULTIYEAR_PHY_001_030)",
  "interpolation_method": "bilinear",
  "current_details": null,
  "nearby_argo": {
    "float_id": "2902150",
    "wmo_id": "2902150",
    "platform_type": "PROVOR / APEX Profiling Float",
    "distance_km": 15.5,
    "float_lat": 12.5,
    "float_lon": 65.3,
    "cycle_number": 3,
    "observed_value": 28.595,
    "model_bias_delta": 0.395
  }
}
```

---

### 3. How the Spatial Interpolation Engine Works

The underlying oceanographic model outputs are stored on regular or curvilinear grids (e.g., $0.5^\circ$ or $1/12^\circ$ resolution). The spatial interpolation engine (`backend/app/data/interpolation.py`) handles continuous coordinate lookups:

1. **Bilinear Sub-Grid Interpolation (`method=bilinear`)**:
   - For a clicked target coordinate $(x, y) = (\text{lon}, \text{lat})$, the engine identifies the 4 enclosing grid bounding nodes:
     $$Q_{11} = (x_1, y_1),\quad Q_{12} = (x_1, y_2),\quad Q_{21} = (x_2, y_1),\quad Q_{22} = (x_2, y_2)$$
   - Computes normalized fractional distances:
     $$\Delta x = \frac{x - x_1}{x_2 - x_1},\quad \Delta y = \frac{y - y_1}{y_2 - y_1}$$
   - **Land-Mask Boundary Protection**: If some nodes lie on land (represented as `NaN` or masked cells in xarray), the algorithm dynamically renormalizes weights across the remaining valid ocean nodes:
     $$V(x, y) = \frac{\sum w_k \cdot V_k}{\sum w_k}$$
     This prevents valid coastal ocean points from returning `null` merely because a neighboring node touches continental land. If all 4 bounding nodes are land, it cleanly classifies the point as `is_land: true`.

2. **Nearest-Neighbor Lookup (`method=nearest`)**:
   - Computes Euclidean distance across 1D coordinate vectors:
     $$\text{idx}_{\text{lat}} = \arg\min |\text{lats} - \text{lat}|,\quad \text{idx}_{\text{lon}} = \arg\min |\text{lons} - \text{lon}|$$
   - Returns the exact value of the closest model grid cell.

3. **Currents Vector Transformation**:
   - Eastward ($u$) and Northward ($v$) velocity components are converted into oceanographic speed and flow direction:
     $$\text{Speed} = \sqrt{u^2 + v^2}\quad (\text{m/s})$$
     $$\theta = \left(\text{atan2}(u, v) \cdot \frac{180}{\pi} + 360\right) \pmod{360}$$
   - Mapped to 16-point cardinal compass bearings (e.g. `N`, `NNE`, `NE`, `ENE`, `E`, `ESE`, etc.).

4. **In-Situ Argo Float Proximity Comparison**:
   - Computes great-circle distances to all active profiling floats via the **Haversine formula**:
     $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1\cos\phi_2\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
   - If the nearest float is within $150\text{ km}$, retrieves the float's most recent surface observation and calculates the model bias delta:
     $$\Delta_{\text{bias}} = V_{\text{model}} - V_{\text{in-situ}}$$

---

### 4. How to Plug In Real Data Sources

To connect your own real-world data sources or custom NetCDF files:

1. Copy the environment configuration template:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Configure credentials or local file paths in `backend/.env`:
   - **Copernicus Marine Service (CMEMS)**:
     Register for free at [marine.copernicus.eu](https://marine.copernicus.eu/) and set `CMEMS_USERNAME` and `CMEMS_PASSWORD`. Or place your downloaded `.nc` file in `backend/data/netcdf/`.
   - **NOAA OSCAR Currents**:
     Connects automatically via open NOAA ERDDAP (`https://coastwatch.pfeg.noaa.gov/erddap/griddap/oscar_currents_interim_2019.json`). Or place local current NetCDF files in `backend/data/netcdf/`.
   - **NASA Ocean Color / MODIS-Aqua (Chlorophyll-a)**:
     Generate a free Earthdata application key at [urs.earthdata.nasa.gov](https://urs.earthdata.nasa.gov/) and set `NASA_EARTHDATA_TOKEN`. Or drop `.nc` files in `backend/data/netcdf/`.
   - **Argo Profiling Floats**:
     Place authentic Ifremer GDAC profile files (`*_prof.nc`) into `backend/data/argo/`.

3. Restart the FastAPI service:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend automatically parses and caches datasets upon startup using `xarray` and `netCDF4`.

---

## License & Attribution

Developed for **Smart India Hackathon (SIH)** • Ministry of Earth Sciences (MoES) & Indian National Centre for Ocean Information Services (INCOIS).


