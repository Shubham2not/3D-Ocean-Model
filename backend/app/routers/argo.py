"""
Ocean3D — Argo Instruments API Router

Endpoints for querying synthetic Argo float positions and depth profiles.
Matches the API design from section 11 of the SIH brief.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from app.data.argo_parser import get_argo_data

router = APIRouter(prefix="/api/v1/instruments", tags=["Instruments"])


@router.get("/argo")
async def list_argo_floats(
    bbox: Optional[str] = Query(None, description="Bounding box: lon_min,lat_min,lon_max,lat_max"),
):
    """
    Return all Argo float positions and metadata within the bounding box.
    If no bbox is provided, return all floats.
    """
    argo = get_argo_data()
    floats = argo["floats"]

    if bbox:
        try:
            parts = [float(x) for x in bbox.split(",")]
            lon_min, lat_min, lon_max, lat_max = parts
            floats = [
                f for f in floats
                if lon_min <= f["lon"] <= lon_max and lat_min <= f["lat"] <= lat_max
            ]
        except (ValueError, IndexError):
            pass  # Fall back to all floats

    return {
        "count": len(floats),
        "source": argo.get("source", "Real Ifremer GDAC NetCDF"),
        "is_real_data": argo.get("is_real_data", True),
        "floats": floats,
    }



@router.get("/argo/{float_id}/profile/{cycle}")
async def get_argo_profile(float_id: str, cycle: int):
    """
    Return the depth-vs-temperature/salinity profile for a specific
    Argo float and cycle number.
    """
    argo = get_argo_data()
    key = f"{float_id}_{cycle}"

    if key not in argo["profiles"]:
        raise HTTPException(
            status_code=404,
            detail=f"Profile not found for float {float_id}, cycle {cycle}"
        )

    profile = argo["profiles"][key]
    return {
        "float_id": profile["float_id"],
        "cycle_number": profile["cycle_number"],
        "profile_time": profile["profile_time"],
        "lat": profile["lat"],
        "lon": profile["lon"],
        "levels": [
            {
                "depth_m": profile["depths"][i],
                "pressure_dbar": profile["pressure_dbar"][i],
                "temperature": profile["temperature"][i],
                "salinity": profile["salinity"][i],
            }
            for i in range(len(profile["depths"]))
        ],
    }
