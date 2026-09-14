"""
Ocean3D — Synthetic Ocean Temperature Data Generator

Produces a 4D temperature grid matching real INCOIS model output:
  time (5 daily steps ending today)
  × depth (7 levels: 0, 25, 50, 100, 200, 500, 1000 m)
  × lat (41 pts, 5.0–25.0°N, 0.5° res)
  × lon (37 pts, 60.0–78.0°E, 0.5° res)

Physical characteristics:
  - Tropical Arabian Sea surface temperatures (~28–30°C)
  - Smooth spatial variation using layered harmonics / gradients
    (representing upwelling signatures and mesoscale gyre structures)
  - Thermocline cooling through 100–200m down to ~5–10°C at 1000m
  - Coherent, subtle day-to-day evolution across the 5 daily time steps
  - Cached in memory at startup
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
import numpy as np

# Grid specifications matching user prompt and INCOIS brief
DEPTH_LEVELS: List[int] = [0, 25, 50, 100, 200, 500, 1000]  # meters
NUM_DEPTHS = len(DEPTH_LEVELS)

LAT_RANGE = (5.0, 25.0)    # °N
LON_RANGE = (60.0, 78.0)   # °E
LAT_RES = 0.5              # degrees
LON_RES = 0.5              # degrees

LATS = np.arange(LAT_RANGE[0], LAT_RANGE[1] + LAT_RES * 0.5, LAT_RES, dtype=np.float32)   # 41 points
LONS = np.arange(LON_RANGE[0], LON_RANGE[1] + LON_RES * 0.5, LON_RES, dtype=np.float32)   # 37 points

NUM_DAYS = 5


def get_daily_timestamps() -> List[str]:
    """Generate 5 daily ISO 8601 timestamps ending today at 00:00:00Z."""
    today = datetime.now(timezone.utc).date()
    return [
        (datetime.combine(today - timedelta(days=NUM_DAYS - 1 - i), datetime.min.time(), tzinfo=timezone.utc)).strftime(
            "%Y-%m-%dT00:00:00Z"
        )
        for i in range(NUM_DAYS)
    ]


def _vertical_temperature_decay(depth: float, surface_temp: float) -> float:
    """
    Computes temperature at a given depth based on surface temperature.
    - Surface mixed layer (0–25m): warm (~28–30°C), minimal drop.
    - Upper thermocline (25–100m): cooling begins.
    - Main thermocline (100–200m): steep drop (cooling toward ~15–18°C).
    - Mesopelagic (200–500m): cooling toward ~10–12°C.
    - Deep layer (500–1000m): asymptotic approach to ~6.5–8.0°C at 1000m.
    """
    if depth <= 25.0:
        return surface_temp - (depth / 25.0) * 0.4
    elif depth <= 100.0:
        t_25 = surface_temp - 0.4
        frac = (depth - 25.0) / 75.0
        # Thermocline onset: drops ~5–6°C by 100m
        return t_25 - frac * 5.8
    elif depth <= 200.0:
        t_100 = surface_temp - 6.2
        frac = (depth - 100.0) / 100.0
        # Steep thermocline drop: down to ~16.5°C at 200m
        return t_100 - frac * 6.5
    elif depth <= 500.0:
        t_200 = surface_temp - 12.7
        frac = (depth - 200.0) / 300.0
        # Gradual intermediate cooling: down to ~10.5°C
        return t_200 - frac * (t_200 - 10.5)
    else:  # 500m to 1000m
        t_500 = 10.5
        frac = min((depth - 500.0) / 500.0, 1.0)
        # Deep ocean asymptotic limit ~7.2°C (well within 5–10°C)
        return t_500 - frac * 3.3


def generate_ocean_temperature() -> Dict[str, Any]:
    """
    Generate the full 4D synthetic temperature dataset (time x depth x lat x lon).
    Uses smooth harmonic and gradient functions instead of random noise.
    """
    timestamps = get_daily_timestamps()
    nlat = len(LATS)
    nlon = len(LONS)
    grid = np.zeros((NUM_DAYS, NUM_DEPTHS, nlat, nlon), dtype=np.float32)

    lon_2d, lat_2d = np.meshgrid(LONS, LATS)  # shapes (nlat, nlon)

    # 1. Base latitude gradient (warm equatorial ~30.2°C down to ~28.0°C in north)
    base_lat = 30.2 - ((lat_2d - 5.0) / 20.0) * 2.2

    # 2. Western boundary / upwelling cool plume (Somali/Oman coast: cooler near 60°E)
    upwelling = -1.4 * np.exp(-((lon_2d - 60.0) / 7.0) ** 2) * np.sin(np.pi * (lat_2d - 5.0) / 20.0)

    # 3. Layered harmonic gyres / thermal fronts (smooth spatial ocean features)
    gyre_macro = 0.75 * np.sin(2.0 * np.pi * (lon_2d - 60.0) / 18.0) * np.cos(np.pi * (lat_2d - 5.0) / 20.0)
    gyre_meso = 0.35 * np.sin(4.0 * np.pi * (lon_2d - 62.0) / 18.0) * np.sin(2.0 * np.pi * (lat_2d - 8.0) / 15.0)

    base_spatial_surface = base_lat + upwelling + gyre_macro + gyre_meso

    for t in range(NUM_DAYS):
        # Subtle day-to-day variation across the 5 daily timesteps (smooth phase shift ~0.1-0.25°C)
        day_wave = 0.28 * np.sin(2.0 * np.pi * (t / float(NUM_DAYS)) + (lon_2d - 60.0) * 0.08 + (lat_2d - 5.0) * 0.05)
        surface_t = base_spatial_surface + day_wave

        for di, depth in enumerate(DEPTH_LEVELS):
            # Vectorized vertical temperature profile computation
            for li in range(nlat):
                for lj in range(nlon):
                    surf_val = float(surface_t[li, lj])
                    temp = _vertical_temperature_decay(float(depth), surf_val)
                    # Depth-dependent modulation of spatial features (attenuates in the deep)
                    depth_damping = max(0.15, 1.0 - (depth / 1200.0))
                    delta_spatial = (surf_val - float(base_lat[li, lj])) * depth_damping
                    final_temp = round(temp + delta_spatial * 0.2, 2)
                    grid[t, di, li, lj] = final_temp

    return {
        "data": grid,
        "lats": [round(float(x), 2) for x in LATS.tolist()],
        "lons": [round(float(x), 2) for x in LONS.tolist()],
        "depths": DEPTH_LEVELS,
        "times": timestamps,
        "variable": "temperature",
        "units": "°C",
    }


# In-memory startup cache
_OCEAN_DATA: Dict[str, Any] = None


def get_ocean_data() -> Dict[str, Any]:
    """Retrieve the cached 4D synthetic ocean dataset."""
    global _OCEAN_DATA
    if _OCEAN_DATA is None:
        _OCEAN_DATA = generate_ocean_temperature()
    return _OCEAN_DATA


def sample_model_temperature(lat: float, lon: float, depth: float, time_idx: int = -1) -> float:
    """
    Sample model temperature at an arbitrary lat/lon/depth point.
    Uses bilinear interpolation on nearest grid points.
    """
    dataset = get_ocean_data()
    data = dataset["data"]  # (time, depth, lat, lon)
    lats = dataset["lats"]
    lons = dataset["lons"]
    depths = dataset["depths"]

    # Clamp time
    t_idx = time_idx if 0 <= time_idx < len(dataset["times"]) else len(dataset["times"]) - 1

    # Find nearest depth level index
    depth_diffs = [abs(d - depth) for d in depths]
    d_idx = int(np.argmin(depth_diffs))

    # Bilinear interpolation over lat and lon
    lat_clamped = min(max(lat, LAT_RANGE[0]), LAT_RANGE[1])
    lon_clamped = min(max(lon, LON_RANGE[0]), LON_RANGE[1])

    i_lat = (lat_clamped - LAT_RANGE[0]) / LAT_RES
    i_lon = (lon_clamped - LON_RANGE[0]) / LON_RES

    i0, i1 = int(np.floor(i_lat)), min(int(np.ceil(i_lat)), len(lats) - 1)
    j0, j1 = int(np.floor(i_lon)), min(int(np.ceil(i_lon)), len(lons) - 1)

    wi = i_lat - i0
    wj = i_lon - j0

    val00 = data[t_idx, d_idx, i0, j0]
    val01 = data[t_idx, d_idx, i0, j1]
    val10 = data[t_idx, d_idx, i1, j0]
    val11 = data[t_idx, d_idx, i1, j1]

    interp = (1 - wi) * ((1 - wj) * val00 + wj * val01) + wi * ((1 - wj) * val10 + wj * val11)
    return round(float(interp), 2)
