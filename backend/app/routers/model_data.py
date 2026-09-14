"""
Ocean3D — Model Data API Router

Endpoints for querying the synthetic ocean temperature grid.
Matches the API design from section 11 of the SIH brief.
"""

from fastapi import APIRouter, Query
from typing import Optional
import numpy as np

from app.data.generate_ocean_data import get_ocean_data

router = APIRouter(prefix="/api/v1/model", tags=["Model Data"])


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
    Return a 2D lat×lon temperature slice for the given depth and time step.

    Response includes the flat data array, grid coordinates, and metadata
    needed for the frontend to reconstruct the 2D field.
    """
    ocean = get_ocean_data()
    data = ocean["data"]  # shape: (time, depth, lat, lon)
    lats = ocean["lats"]
    lons = ocean["lons"]
    depths = ocean["depths"]
    times = ocean["times"]

    # Clamp indices
    t_idx = max(0, min(time, len(times) - 1))
    d_idx = max(0, min(depth, len(depths) - 1))

    # Extract 2D slice
    slice_2d = data[t_idx, d_idx, :, :]  # shape: (nlat, nlon)

    # Apply bbox filtering if provided
    lat_mask = np.ones(len(lats), dtype=bool)
    lon_mask = np.ones(len(lons), dtype=bool)

    if bbox:
        try:
            parts = [float(x) for x in bbox.split(",")]
            lon_min, lat_min, lon_max, lat_max = parts
            lat_mask = (np.array(lats) >= lat_min) & (np.array(lats) <= lat_max)
            lon_mask = (np.array(lons) >= lon_min) & (np.array(lons) <= lon_max)
        except (ValueError, IndexError):
            pass  # Fall back to full extent

    filtered_lats = [lats[i] for i in range(len(lats)) if lat_mask[i]]
    filtered_lons = [lons[j] for j in range(len(lons)) if lon_mask[j]]
    filtered_data = slice_2d[np.ix_(lat_mask, lon_mask)]

    return {
        "variable": variable,
        "depth_m": depths[d_idx],
        "depth_index": d_idx,
        "time": times[t_idx],
        "time_index": t_idx,
        "lats": filtered_lats,
        "lons": filtered_lons,
        "nlat": len(filtered_lats),
        "nlon": len(filtered_lons),
        "data": filtered_data.flatten().tolist(),
        "min_val": float(filtered_data.min()),
        "max_val": float(filtered_data.max()),
        "units": "°C",
    }


@router.get("/timesteps")
async def get_timesteps(
    variable: str = Query("temperature", description="Variable name"),
):
    """Return the list of available time steps for a variable."""
    ocean = get_ocean_data()
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
    ocean = get_ocean_data()
    return {
        "depths": [
            {"index": i, "depth_m": d}
            for i, d in enumerate(ocean["depths"])
        ],
    }
