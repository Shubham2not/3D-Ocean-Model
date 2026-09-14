"""
Ocean3D — Synthetic Argo Float Data Generator

Produces ~12 synthetic Argo floats positioned in the Arabian Sea region,
each with realistic depth-temperature profiles matching the Argo data schema
from the SIH brief (sections 10-11).
"""

import numpy as np
from typing import Dict, Any, List

np.random.seed(123)

# Float positions scattered across the Arabian Sea
_FLOAT_DEFINITIONS = [
    {"id": "2902150", "lat": 12.5,  "lon": 65.3,  "deploy_date": "2025-06-15"},
    {"id": "2902151", "lat": 15.8,  "lon": 68.7,  "deploy_date": "2025-07-22"},
    {"id": "2902152", "lat": 8.2,   "lon": 72.1,  "deploy_date": "2025-08-01"},
    {"id": "2902153", "lat": 20.1,  "lon": 64.9,  "deploy_date": "2025-05-10"},
    {"id": "2902154", "lat": 10.4,  "lon": 61.5,  "deploy_date": "2025-09-03"},
    {"id": "2902155", "lat": 18.3,  "lon": 70.2,  "deploy_date": "2025-04-18"},
    {"id": "2902156", "lat": 7.6,   "lon": 66.8,  "deploy_date": "2025-11-12"},
    {"id": "2902157", "lat": 22.0,  "lon": 67.5,  "deploy_date": "2025-03-25"},
    {"id": "2902158", "lat": 14.7,  "lon": 74.3,  "deploy_date": "2025-10-08"},
    {"id": "2902159", "lat": 16.9,  "lon": 62.8,  "deploy_date": "2025-12-01"},
    {"id": "2902160", "lat": 11.1,  "lon": 69.9,  "deploy_date": "2025-07-14"},
    {"id": "2902161", "lat": 19.5,  "lon": 73.1,  "deploy_date": "2025-08-29"},
]


def _generate_profile(lat: float, cycle: int) -> Dict[str, Any]:
    """Generate a single depth-vs-temperature profile for an Argo float."""
    # Standard Argo profile depths (pressure in dbar ≈ depth in meters)
    depths = [5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500,
              600, 800, 1000, 1200, 1500, 1800, 2000]

    # Surface temp depends on latitude (warmer near equator)
    surface_temp = 30.0 - (lat - 5.0) * 0.2 + np.random.normal(0, 0.3)

    # Small variation per cycle
    surface_temp += 0.2 * np.sin(cycle * 0.5)

    temperatures = []
    salinities = []

    for d in depths:
        # Temperature profile with thermocline
        if d <= 50:
            temp = surface_temp - (d / 50.0) * 1.0
        elif d <= 500:
            t_at_50 = surface_temp - 1.0
            frac = (d - 50) / 450.0
            temp = t_at_50 - frac * (t_at_50 - 8.5)
        else:
            frac = min((d - 500) / 1500.0, 1.0)
            temp = 8.5 - frac * 6.0

        temp += np.random.normal(0, 0.1)
        temperatures.append(round(float(temp), 3))

        # Salinity profile (typical Arabian Sea)
        if d <= 100:
            sal = 36.0 + (d / 100.0) * 0.5
        elif d <= 500:
            sal = 36.5 - ((d - 100) / 400.0) * 1.0
        else:
            sal = 35.5 - min((d - 500) / 1500.0, 1.0) * 0.7

        sal += np.random.normal(0, 0.02)
        salinities.append(round(float(sal), 3))

    return {
        "depths": depths,
        "pressure_dbar": depths,  # ~1:1 ratio
        "temperature": temperatures,
        "salinity": salinities,
    }


def generate_argo_floats() -> Dict[str, Any]:
    """
    Generate all synthetic Argo float data.

    Returns dict with:
        - 'floats': list of float metadata (id, lat, lon, deploy_date, status, num_cycles)
        - 'profiles': dict keyed by "{float_id}_{cycle}" with profile data
    """
    floats = []
    profiles = {}

    for fdef in _FLOAT_DEFINITIONS:
        num_cycles = np.random.randint(1, 4)  # 1–3 cycles per float

        float_meta = {
            "float_id": fdef["id"],
            "lat": fdef["lat"],
            "lon": fdef["lon"],
            "deploy_date": fdef["deploy_date"],
            "status": "active",
            "num_cycles": num_cycles,
            "latest_cycle": num_cycles,
        }
        floats.append(float_meta)

        for cycle in range(1, num_cycles + 1):
            profile_data = _generate_profile(fdef["lat"], cycle)
            profile_data["float_id"] = fdef["id"]
            profile_data["cycle_number"] = cycle
            profile_data["profile_time"] = f"2026-09-{7 + cycle:02d}T12:00:00Z"
            profile_data["lat"] = fdef["lat"] + np.random.normal(0, 0.05)
            profile_data["lon"] = fdef["lon"] + np.random.normal(0, 0.05)
            profiles[f"{fdef['id']}_{cycle}"] = profile_data

    return {"floats": floats, "profiles": profiles}


# Pre-generate and cache on import
_ARGO_DATA = None


def get_argo_data() -> Dict[str, Any]:
    """Get the cached synthetic Argo dataset (generated once on first call)."""
    global _ARGO_DATA
    if _ARGO_DATA is None:
        _ARGO_DATA = generate_argo_floats()
    return _ARGO_DATA
