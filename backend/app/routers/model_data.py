"""
Ocean3D — Model Data API Router

Endpoints for querying the synthetic ocean temperature grid.
Matches the API design from section 11 of the SIH brief.
"""

from fastapi import APIRouter, Query
from typing import Optional
import numpy as np

from app.data.netcdf_loader import get_model_data as load_model_data

router = APIRouter(prefix="/api/v1/model", tags=["Model Data"])


@router.get("/sources")
async def get_data_sources():
    """
    Return active oceanographic data sources and official real-world dataset links.
    Includes INCOIS, Copernicus Marine, Ifremer Argo GDAC, and Glider portals.
    """
    ocean = load_model_data()
    return {
        "active_model_source": ocean.get("source", "Real NetCDF"),
        "is_real_data": ocean.get("is_real_data", True),
        "filename": ocean.get("filename", "arabian_sea_copernicus_extract.nc"),
        "links": {
            "numerical_ocean_models": [
                {
                    "name": "INCOIS Live Access Server (LAS)",
                    "url": "https://las.incois.gov.in/",
                    "description": "Indian National Centre for Ocean Information Services - ROMS / GODAS ocean simulations",
                },
                {
                    "name": "Copernicus Marine Service (GLOBAL_MULTIYEAR_PHY_001_030)",
                    "url": "https://data.marine.copernicus.eu/product/GLOBAL_MULTIYEAR_PHY_001_030/description",
                    "description": "Global Ocean Physics Reanalysis (1993–present, 1/12° resolution, 50 vertical levels)",
                },
            ],
            "argo_global_data": [
                {
                    "name": "Ifremer Argo GDAC FTP",
                    "url": "ftp://ftp.ifremer.fr/ifremer/argo",
                    "description": "Global Data Assembly Centre for international autonomous profiling floats",
                },
                {
                    "name": "Ifremer Argo GDAC HTTP Mirror",
                    "url": "https://data-argo.ifremer.fr/",
                    "description": "Direct HTTP portal for Argo NetCDF profiles and trajectories",
                },
            ],
            "glider_data": [
                {
                    "name": "Ifremer Glider Ocean Data",
                    "url": "ftp://ftp.ifremer.fr/ifremer/glider/v2/",
                    "description": "Deep-sea underwater glider hydrographic transect data",
                },
            ],
            "in_situ_collections": [
                {
                    "name": "INCOIS In-Situ Observation Portal",
                    "url": "https://incois.gov.in/portal/datainfo/insitu.jsp",
                    "description": "Indian Ocean moored buoys, wave rider buoys, drifters, and coastal ADCPs",
                },
                {
                    "name": "OceanOPS / WMO-IOC Global Ocean Observing System",
                    "url": "https://www.ocean-ops.org/",
                    "description": "Global real-time marine meteorological and oceanographic tracking",
                },
            ],
        },
    }


@router.get("/variables")
async def list_variables():
    """List all available model variables. Currently only temperature."""
    return {
        "variables": [
            {
                "name": "temperature",
                "long_name": "Sea Water Temperature",
                "units": "°C",
                "dims": ["time", "depth", "lat", "lon"],
                "available": True,
            },
            {
                "name": "salinity",
                "long_name": "Sea Water Salinity",
                "units": "PSU",
                "dims": ["time", "depth", "lat", "lon"],
                "available": False,  # Extensibility: not yet implemented
            },
            {
                "name": "current_u",
                "long_name": "Eastward Sea Water Velocity",
                "units": "m/s",
                "dims": ["time", "depth", "lat", "lon"],
                "available": False,
            },
            {
                "name": "current_v",
                "long_name": "Northward Sea Water Velocity",
                "units": "m/s",
                "dims": ["time", "depth", "lat", "lon"],
                "available": False,
            },
        ]
    }


@router.get("/data")
async def get_model_data(
    variable: str = Query("temperature", description="Variable name"),
    depth: int = Query(0, description="Depth index (0–8)"),
    time: int = Query(0, description="Time step index (0–5)"),
    bbox: Optional[str] = Query(None, description="Bounding box: lon_min,lat_min,lon_max,lat_max"),
):
    """
    Return a 2D horizontal slice of model data for the given variable, depth, and time.
    Optionally cropped by a bounding box.
    """
    ocean = load_model_data()
    data = ocean["data"]  # (time, depth, lat, lon)
    lats = ocean["lats"]
    lons = ocean["lons"]
    depths = ocean["depths"]
    times = ocean["times"]

    # Clamp indices to valid ranges
    t_idx = max(0, min(time, len(times) - 1))
    d_idx = max(0, min(depth, len(depths) - 1))

    # Extract 2D slice
    slice_2d = data[t_idx, d_idx, :, :]

    # Handle bounding box filtering
    if bbox:
        try:
            parts = [float(x) for x in bbox.split(",")]
            lon_min, lat_min, lon_max, lat_max = parts

            lat_mask = [lat_min <= lat <= lat_max for lat in lats]
            lon_mask = [lon_min <= lon <= lon_max for lon in lons]

            if any(lat_mask) and any(lon_mask):
                lat_indices = [i for i, m in enumerate(lat_mask) if m]
                lon_indices = [j for j, m in enumerate(lon_mask) if m]

                lats = [lats[i] for i in lat_indices]
                lons = [lons[j] for j in lon_indices]
                slice_2d = slice_2d[
                    min(lat_indices):max(lat_indices) + 1,
                    min(lon_indices):max(lon_indices) + 1,
                ]
        except (ValueError, IndexError):
            pass  # Fall back to full grid if bbox parsing fails

    min_val = float(np.min(slice_2d))
    max_val = float(np.max(slice_2d))
    flat_data = [round(float(x), 2) for x in slice_2d.flatten().tolist()]

    return {
        "variable": variable,
        "units": ocean.get("units", "°C"),
        "source": ocean.get("source", "Real NetCDF"),
        "depth_m": depths[d_idx],
        "depth_index": d_idx,
        "time": times[t_idx],
        "time_index": t_idx,
        "lats": lats,
        "lons": lons,
        "nlat": len(lats),
        "nlon": len(lons),
        "min_val": round(min_val, 2),
        "max_val": round(max_val, 2),
        "data": flat_data,
    }


@router.get("/timesteps")
async def get_timesteps(
    variable: str = Query("temperature", description="Variable name"),
):
    """Return the list of available timesteps."""
    ocean = load_model_data()
    return {
        "variable": variable,
        "timesteps": [
            {"index": i, "label": t}
            for i, t in enumerate(ocean["times"])
        ],
    }


@router.get("/depths")
async def get_depths():
    """Return the list of available depth levels."""
    ocean = load_model_data()
    return {
        "depths": [
            {"index": i, "depth_m": d}
            for i, d in enumerate(ocean["depths"])
        ],
    }


@router.get("/profile")
async def get_model_profile(
    lat: float = Query(..., description="Latitude of the point"),
    lon: float = Query(..., description="Longitude of the point"),
    time: int = Query(0, description="Time step index (0–4)"),
    variable: str = Query("temperature", description="Variable name"),
):
    """
    Return the model's full depth profile at the nearest grid point to the
    given lat/lon for all available depth levels.

    This enables the model-vs-observation comparison feature — the frontend
    overlays this profile against an Argo float's observed profile.
    """
    ocean = load_model_data()
    data = ocean["data"]        # shape: (time, depth, lat, lon)
    lats = np.array(ocean["lats"])
    lons = np.array(ocean["lons"])
    depths = ocean["depths"]
    times = ocean["times"]

    t_idx = max(0, min(time, len(times) - 1))

    # Nearest-neighbour grid lookup
    lat_idx = int(np.argmin(np.abs(lats - lat)))
    lon_idx = int(np.argmin(np.abs(lons - lon)))

    levels = []
    for d_idx, depth_m in enumerate(depths):
        temp = float(data[t_idx, d_idx, lat_idx, lon_idx])
        levels.append({
            "depth_m": depth_m,
            "depth_index": d_idx,
            "temperature": round(temp, 4),
        })

    return {
        "variable": variable,
        "lat": float(lats[lat_idx]),
        "lon": float(lons[lon_idx]),
        "time": times[t_idx],
        "time_index": t_idx,
        "source": ocean.get("source", "Real NetCDF"),
        "levels": levels,
    }
