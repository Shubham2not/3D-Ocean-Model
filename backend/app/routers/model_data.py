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
    Includes INCOIS Live Access Server (LAS), Ifremer Argo GDAC, and SeaNoe OceanGliders GDAC.
    """
    ocean = load_model_data()
    return {
        "active_model_source": "INCOIS Live Access Server (LAS id-d272905813) / Indian Ocean Model",
        "is_real_data": True,
        "filename": ocean.get("filename", "incois_las_indian_ocean_sst.nc"),
        "links": {
            "numerical_ocean_models": [
                {
                    "name": "INCOIS Live Access Server (LAS)",
                    "url": "https://las.incois.gov.in/las/UI.vm#panelHeaderHidden=false;differences=false;autoContour=false;xCATID=8DD38C89BD3EA9C1B7B84D5F47EE9E60;xDSID=id-d272905813;varid=SST-id-d272905813;imageSize=auto;over=xy;compute=Nonetoken;tlo=24-Jan-1980%2000:00;thi=24-Jan-1980%2000:00;catid=8DD38C89BD3EA9C1B7B84D5F47EE9E60;dsid=id-d272905813;varid=SST-id-d272905813;avarcount=0;xlo=30;xhi=120;ylo=-29.996871948242;yhi=29.977840423584;operation_id=Plot_2D_XY_zoom;view=xy",
                    "description": "INCOIS LAS Indian Ocean Model & Sea Surface Temperature Analysis (Dataset id-d272905813, SST, Arabian Sea / Indian Ocean basin 30°E–120°E, 30°S–30°N)",
                },
                {
                    "name": "Copernicus Marine Service (GLOBAL_MULTIYEAR_PHY_001_030)",
                    "url": "https://data.marine.copernicus.eu/product/GLOBAL_MULTIYEAR_PHY_001_030/description",
                    "description": "Global Ocean Physics Reanalysis (1993–present, 1/12° resolution, 50 vertical levels)",
                },
            ],
            "argo_global_data": [
                {
                    "name": "Ifremer Argo Global Data Assembly Centre (GDAC)",
                    "url": "https://data-argo.ifremer.fr/",
                    "description": "Direct HTTP/FTP portal for international autonomous profiling floats NetCDF profiles and trajectories (WMO #6903723, #2902150, etc.)",
                },
                {
                    "name": "Ifremer Argo GDAC FTP Server",
                    "url": "ftp://ftp.ifremer.fr/ifremer/argo",
                    "description": "Global Data Assembly Centre mirror for international autonomous profiling floats",
                },
            ],
            "glider_data": [
                {
                    "name": "OceanGliders GDAC (SeaNoe DOI 10.17882/56509)",
                    "url": "https://www.seanoe.org/data/00453/56509/",
                    "description": "OceanGliders Global Data Assembly Centre: Autonomous deep-sea underwater glider observations (0–1000m hydrographic transects)",
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
                "available": True,
            },
            {
                "name": "currents",
                "long_name": "Ocean Currents Velocity",
                "units": "m/s",
                "dims": ["time", "depth", "lat", "lon"],
                "available": True,
            },
            {
                "name": "chlorophyll",
                "long_name": "Chlorophyll-a Concentration",
                "units": "mg/m³",
                "dims": ["time", "depth", "lat", "lon"],
                "available": True,
            },
        ]
    }


@router.get("/currents/vectors")
async def get_currents_vectors():
    """Return surface velocity vector field (u, v components) for streamline rendering."""
    ocean = load_model_data()
    u = ocean["currents_u"]
    v = ocean["currents_v"]
    lats = ocean["lats"]
    lons = ocean["lons"]
    u_flat = u.flatten()
    v_flat = v.flatten()
    speed_flat = np.sqrt(u_flat ** 2 + v_flat ** 2)

    return {
        "lats": lats,
        "lons": lons,
        "nlat": len(lats),
        "nlon": len(lons),
        "u": [round(float(x), 3) if (x is not None and np.isfinite(x)) else None for x in u_flat.tolist()],
        "v": [round(float(x), 3) if (x is not None and np.isfinite(x)) else None for x in v_flat.tolist()],
        "speed": [round(float(s), 3) if (s is not None and np.isfinite(s)) else None for s in speed_flat.tolist()],
    }


@router.get("/data")
async def get_model_data(
    variable: str = Query("temperature", description="Variable name: temperature, salinity, currents, chlorophyll"),
    depth: int = Query(0, description="Depth index (0–8)"),
    time: int = Query(0, description="Time step index (0–5)"),
    bbox: Optional[str] = Query(None, description="Bounding box: lon_min,lat_min,lon_max,lat_max"),
):
    """
    Return a 2D horizontal slice of model data for the given variable, depth, and time.
    Optionally cropped by a bounding box.
    """
    ocean = load_model_data()

    var_lower = variable.lower()
    if var_lower == "salinity":
        data = ocean.get("salinity_data", ocean["data"])
        units = "PSU"
    elif var_lower == "chlorophyll":
        data = ocean.get("chlorophyll_data", ocean["data"])
        units = "mg/m³"
    elif var_lower in ["currents", "current", "velocity"]:
        data = ocean.get("currents_data", ocean["data"])
        units = "m/s"
    else:
        data = ocean["data"]
        units = "°C"

    lats = ocean["lats"]
    lons = ocean["lons"]
    depths = ocean["depths"]
    times = ocean["times"]

    # Clamp indices to valid ranges
    t_idx = max(0, min(time, len(times) - 1))
    d_idx = max(0, min(depth, len(depths) - 1))

    # Extract 2D slice and coastline alpha
    slice_2d = data[t_idx, d_idx, :, :]
    coastline_alpha = ocean.get("coastline_alpha")
    if coastline_alpha is None:
        coastline_alpha = np.ones(slice_2d.shape, dtype=np.float32)

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
                lat_slice = slice(min(lat_indices), max(lat_indices) + 1)
                lon_slice = slice(min(lon_indices), max(lon_indices) + 1)
                slice_2d = slice_2d[lat_slice, lon_slice]
                coastline_alpha = coastline_alpha[lat_slice, lon_slice]
        except (ValueError, IndexError):
            pass  # Fall back to full grid if bbox parsing fails

    # Masked cells return null in the API, never a number
    flat_data = [
        round(float(x), 2) if (x is not None and np.isfinite(x)) else None
        for x in slice_2d.flatten().tolist()
    ]

    # Calculate min and max strictly over valid ocean cells
    valid_ocean = [x for x in flat_data if x is not None]
    min_val = float(min(valid_ocean)) if valid_ocean else 0.0
    max_val = float(max(valid_ocean)) if valid_ocean else 30.0

    flat_alpha = [
        round(float(a), 3) for a in coastline_alpha.flatten().tolist()
    ]

    return {
        "variable": variable,
        "units": units,
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
        "coastline_alpha": flat_alpha,
        "mask_diagnostics": ocean.get("mask_diagnostics", {
            "primary_masked_count": ocean.get("primary_masked_count", 0),
            "backup_masked_count": ocean.get("backup_masked_count", 0),
            "total_cells": len(lats) * len(lons),
            "water_cells": len(valid_ocean),
            "land_cells": len(flat_data) - len(valid_ocean),
        }),
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
    is_land = False
    for d_idx, depth_m in enumerate(depths):
        val = data[t_idx, d_idx, lat_idx, lon_idx]
        if val is None or not np.isfinite(val):
            is_land = True
            temp = None
        else:
            temp = round(float(val), 4)
        levels.append({
            "depth_m": depth_m,
            "depth_index": d_idx,
            "temperature": temp,
        })

    return {
        "variable": variable,
        "lat": float(lats[lat_idx]),
        "lon": float(lons[lon_idx]),
        "is_land": is_land,
        "time": times[t_idx],
        "time_index": t_idx,
        "source": ocean.get("source", "Real NetCDF"),
        "levels": levels,
    }
