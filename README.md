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

## License & Attribution

Developed for **Smart India Hackathon (SIH)** • Ministry of Earth Sciences (MoES) & Indian National Centre for Ocean Information Services (INCOIS).

