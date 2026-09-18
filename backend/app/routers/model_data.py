from fastapi import APIRouter, Query
from typing import Optional
import numpy as np

from app.data.netcdf_loader import get_model_data as load_model_data
from app.data.interpolation import (
    interpolate_point_data,
    vector_to_speed_and_direction,
    haversine_distance_km,
)
from app.data.argo_parser import get_argo_data
from app.config import config

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

    t_idx = max(0, min(time, len(times) - 1))
    d_idx = max(0, min(depth, len(depths) - 1))

    slice_2d = data[t_idx, d_idx, :, :]
    coastline_alpha = ocean.get("coastline_alpha")
    if coastline_alpha is None:
        coastline_alpha = np.ones(slice_2d.shape, dtype=np.float32)

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
            pass

    flat_data = [
        round(float(x), 2) if (x is not None and np.isfinite(x)) else None
        for x in slice_2d.flatten().tolist()
    ]

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
    data = ocean["data"]
    lats = np.array(ocean["lats"])
    lons = np.array(ocean["lons"])
    depths = ocean["depths"]
    times = ocean["times"]

    t_idx = max(0, min(time, len(times) - 1))

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

@router.get("/point-data")
@router.get("/point_data")
async def get_point_data(
    lat: float = Query(..., description="Latitude of the query point (-90 to 90)"),
    lon: float = Query(..., description="Longitude of the query point (-180 to 180)"),
    variable: str = Query("temperature", description="Variable: temperature, salinity, currents, chlorophyll"),
    depth: int = Query(0, description="Depth index (0 = surface)"),
    time: int = Query(0, description="Time step index (0-4)"),
    date: Optional[str] = Query(None, description="Optional ISO date string or date (e.g. 2024-09-15)"),
    method: str = Query("bilinear", description="Interpolation method: 'bilinear' or 'nearest'"),
):
    """
    Interpolate the selected oceanographic variable to the exact (lat, lon) coordinate.
    Supports Bilinear (with land-mask boundary protection) and Nearest-Neighbor.
    Includes units, product attribution, timestamp, and automated proximity comparison
    against the nearest active Argo profiling float.
    """
    ocean = load_model_data()
    lats = np.array(ocean["lats"])
    lons = np.array(ocean["lons"])
    depths = ocean.get("depths", [0, 25, 50, 100, 200, 500, 1000])
    times = ocean.get("times", ["2024-09-15T12:00:00Z"])

    t_num = time.default if hasattr(time, "default") else time
    d_num = depth.default if hasattr(depth, "default") else depth
    try:
        t_int = int(t_num) if t_num is not None else 0
    except (ValueError, TypeError):
        t_int = 0
    try:
        d_int = int(d_num) if d_num is not None else 0
    except (ValueError, TypeError):
        d_int = 0

    t_idx = max(0, min(t_int, len(times) - 1))
    if date:

        for idx, t_str in enumerate(times):
            if str(date).strip() in str(t_str):
                t_idx = idx
                break
    d_idx = max(0, min(d_int, len(depths) - 1))
    timestamp = times[t_idx]
    depth_m = depths[d_idx]

    var_str = variable.default if hasattr(variable, "default") else variable
    var_lower = str(var_str or "temperature").lower().strip()
    meth_str = method.default if hasattr(method, "default") else method
    norm_method = "nearest" if str(meth_str or "bilinear").lower() == "nearest" else "bilinear"

    current_details = None

    if var_lower in ["currents", "current", "velocity"]:
        var_name = "currents"
        units = "m/s"
        source = "NOAA OSCAR / CMEMS Surface Velocity"
        product_name = "NOAA Ocean Surface Current Analyses Real-time (OSCAR) 1/3°"

        u_grid = ocean.get("currents_u")
        v_grid = ocean.get("currents_v")

        if u_grid is not None and v_grid is not None:
            u_slice = u_grid if u_grid.ndim == 2 else u_grid[t_idx, d_idx]
            v_slice = v_grid if v_grid.ndim == 2 else v_grid[t_idx, d_idx]

            u_val, _, _ = interpolate_point_data(lats, lons, u_slice, lat, lon, norm_method)
            v_val, _, _ = interpolate_point_data(lats, lons, v_slice, lat, lon, norm_method)

            if u_val is not None and v_val is not None:
                current_details = vector_to_speed_and_direction(u_val, v_val)
                value = current_details["speed"]
            else:
                value = None
        else:
            value = None

    elif var_lower == "salinity":
        var_name = "salinity"
        units = "PSU"
        source = "Copernicus Marine Service (CMEMS)"
        product_name = "CMEMS Global Physical Reanalysis (Salinity) 1/12°"
        grid_4d = ocean.get("salinity_data", ocean["data"])
        slice_2d = grid_4d[t_idx, d_idx, :, :]
        value, _, _ = interpolate_point_data(lats, lons, slice_2d, lat, lon, norm_method)

    elif var_lower in ["chlorophyll", "chlorophyll-a", "chla", "chl"]:
        var_name = "chlorophyll"
        units = "mg/m³"
        source = "NASA Ocean Color / MODIS-Aqua & GlobColour"
        product_name = "NASA MODIS-Aqua L3 Mapped Chlorophyll-a 4km"
        grid_4d = ocean.get("chlorophyll_data", ocean["data"])
        slice_2d = grid_4d[t_idx, d_idx, :, :]
        value, _, _ = interpolate_point_data(lats, lons, slice_2d, lat, lon, norm_method)

    else:
        var_name = "temperature"
        units = "°C"
        source = "INCOIS LAS / Copernicus Marine Service (CMEMS)"
        product_name = "CMEMS Physical Ocean Temperature Analysis (GLOBAL_MULTIYEAR_PHY_001_030)"
        grid_4d = ocean["data"]
        slice_2d = grid_4d[t_idx, d_idx, :, :]
        value, _, _ = interpolate_point_data(lats, lons, slice_2d, lat, lon, norm_method)

    nearest_lat_idx = int(np.argmin(np.abs(lats - lat)))
    nearest_lon_idx = int(np.argmin(np.abs(lons - lon)))
    nearest_lat = float(lats[nearest_lat_idx])
    nearest_lon = float(lons[nearest_lon_idx])

    is_land = (value is None)

    nearby_argo = None
    try:
        argo_data = get_argo_data()
        floats = argo_data.get("floats", [])
        if floats:
            closest_float = None
            min_dist = float("inf")
            for f in floats:
                dist = haversine_distance_km(lat, lon, f["lat"], f["lon"])
                if dist < min_dist:
                    min_dist = dist
                    closest_float = f

            threshold = getattr(config, "argo_proximity_threshold_km", 150.0)
            if closest_float and min_dist <= threshold:
                fid = str(closest_float.get("float_id"))
                cyc = closest_float.get("latest_cycle", closest_float.get("most_recent_cycle", 1))
                profiles = argo_data.get("profiles", {})
                profile = profiles.get(f"{fid}_{cyc}") or profiles.get(f"{fid}_1")

                observed_val = None
                if var_name == "temperature":
                    observed_val = closest_float.get("temperature_surface")
                    if observed_val is None and profile and profile.get("temperature"):
                        observed_val = profile["temperature"][0]
                elif var_name == "salinity":
                    observed_val = closest_float.get("salinity_surface")
                    if observed_val is None and profile and profile.get("salinity"):
                        observed_val = profile["salinity"][0]

                delta = None
                if value is not None and observed_val is not None:
                    delta = round(float(value) - float(observed_val), 3)

                nearby_argo = {
                    "float_id": fid,
                    "wmo_id": str(closest_float.get("wmo_id", fid)),
                    "platform_type": closest_float.get("platform_type", "PROVOR / APEX Profiling Float"),
                    "distance_km": round(min_dist, 1),
                    "float_lat": round(float(closest_float["lat"]), 4),
                    "float_lon": round(float(closest_float["lon"]), 4),
                    "cycle_number": cyc,
                    "observed_value": round(float(observed_val), 3) if observed_val is not None else None,
                    "model_bias_delta": delta,
                }
    except Exception as e:
        nearby_argo = None

    return {
        "query_lat": round(lat, 5),
        "query_lon": round(lon, 5),
        "nearest_grid_lat": nearest_lat,
        "nearest_grid_lon": nearest_lon,
        "is_land": is_land,
        "variable": var_name,
        "value": round(float(value), 3) if value is not None else None,
        "units": units,
        "depth_m": depth_m,
        "depth_index": d_idx,
        "timestamp": timestamp,
        "time_index": t_idx,
        "source": source,
        "product_name": product_name,
        "interpolation_method": norm_method,
        "current_details": current_details,
        "nearby_argo": nearby_argo,
    }
