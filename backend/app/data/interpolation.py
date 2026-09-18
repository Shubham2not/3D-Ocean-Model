import math
from typing import Tuple, Optional, Dict, Any, List
import numpy as np

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two geographic coordinates in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

COMPASS_DIRECTIONS = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
]

def vector_to_speed_and_direction(u: float, v: float) -> Dict[str, Any]:
    """
    Convert eastward (u) and northward (v) velocity components to speed (m/s),
    oceanographic flow direction (degrees True, 0-360°), and 16-point cardinal compass heading.
    Oceanographic convention: 0° = flowing towards North, 90° = flowing towards East.
    """
    speed = math.sqrt(u * u + v * v)

    direction_rad = math.atan2(u, v)
    direction_deg = (math.degrees(direction_rad) + 360.0) % 360.0

    compass_idx = int(round(direction_deg / 22.5)) % 16
    bearing = COMPASS_DIRECTIONS[compass_idx]

    return {
        "speed": round(speed, 3),
        "direction_deg": round(direction_deg, 1),
        "compass_bearing": bearing,
    }

def nearest_neighbor_2d(
    lats: np.ndarray,
    lons: np.ndarray,
    data_2d: np.ndarray,
    target_lat: float,
    target_lon: float,
) -> Tuple[Optional[float], float, float]:
    """
    Perform nearest-neighbor sampling on a 2D regular grid.
    Returns: (value, sampled_lat, sampled_lon)
    """
    lat_idx = int(np.argmin(np.abs(lats - target_lat)))
    lon_idx = int(np.argmin(np.abs(lons - target_lon)))

    val = data_2d[lat_idx, lon_idx]
    if val is None or not np.isfinite(val):
        return None, float(lats[lat_idx]), float(lons[lon_idx])

    return float(val), float(lats[lat_idx]), float(lons[lon_idx])

def bilinear_interpolate_2d(
    lats: np.ndarray,
    lons: np.ndarray,
    data_2d: np.ndarray,
    target_lat: float,
    target_lon: float,
) -> Tuple[Optional[float], float, float]:
    """
    Perform bilinear interpolation on a 2D regular grid with land-boundary preservation.
    If some of the 4 bounding nodes fall on land (NaN), it renormalizes the weights
    across the valid ocean nodes to avoid invalidating coastal water points.
    If all 4 surrounding nodes are land, it returns None (land cell).

    Returns: (interpolated_value, target_lat, target_lon)
    """

    lat_min, lat_max = float(lats.min()), float(lats.max())
    lon_min, lon_max = float(lons.min()), float(lons.max())

    if not (lat_min <= target_lat <= lat_max and lon_min <= target_lon <= lon_max):

        return nearest_neighbor_2d(lats, lons, data_2d, target_lat, target_lon)

    if lats[1] > lats[0]:

        i = int(np.searchsorted(lats, target_lat))
        i1 = max(0, i - 1)
        i2 = min(len(lats) - 1, i)
    else:

        i = int(np.searchsorted(-lats, -target_lat))
        i1 = min(len(lats) - 1, i)
        i2 = max(0, i - 1)

    if lons[1] > lons[0]:
        j = int(np.searchsorted(lons, target_lon))
        j1 = max(0, j - 1)
        j2 = min(len(lons) - 1, j)
    else:
        j = int(np.searchsorted(-lons, -target_lon))
        j1 = min(len(lons) - 1, j)
        j2 = max(0, j - 1)

    lat1, lat2 = float(lats[i1]), float(lats[i2])
    lon1, lon2 = float(lons[j1]), float(lons[j2])

    dlat = lat2 - lat1
    dlon = lon2 - lon1
    t = (target_lat - lat1) / dlat if abs(dlat) > 1e-7 else 0.0
    u = (target_lon - lon1) / dlon if abs(dlon) > 1e-7 else 0.0

    w11 = (1.0 - t) * (1.0 - u)
    w12 = (1.0 - t) * u
    w21 = t * (1.0 - u)
    w22 = t * u

    corners = [
        (data_2d[i1, j1], w11),
        (data_2d[i1, j2], w12),
        (data_2d[i2, j1], w21),
        (data_2d[i2, j2], w22),
    ]

    valid_sum = 0.0
    weight_sum = 0.0

    for val, w in corners:
        if val is not None and np.isfinite(val):
            valid_sum += float(val) * w
            weight_sum += w

    if weight_sum < 1e-6:

        return None, target_lat, target_lon

    interpolated_val = valid_sum / weight_sum
    return float(interpolated_val), target_lat, target_lon

def interpolate_point_data(
    lats: np.ndarray,
    lons: np.ndarray,
    data_2d: np.ndarray,
    target_lat: float,
    target_lon: float,
    method: str = "bilinear",
) -> Tuple[Optional[float], float, float]:
    """
    Interpolate a 2D scalar field to the specified target lat/lon.
    method: 'bilinear' or 'nearest'
    """
    if method.lower() == "nearest":
        return nearest_neighbor_2d(lats, lons, data_2d, target_lat, target_lon)
    return bilinear_interpolate_2d(lats, lons, data_2d, target_lat, target_lon)
