"""
Ocean3D — Single Source of Truth Land/Ocean Masking System

Features:
1. Primary mask: Reads NetCDF _FillValue, missing_value, and NaNs. Honors declared attributes.
   Prevents fill values (e.g. 1e20, 9.96921e36, -999) from leaking into color ranges.
2. Backup mask: Bundled Natural Earth 50m ocean polygon clipped to bbox [60, 5, 78, 25].
   Point-in-polygon resolves any cells fill values missed.
   Tracks and reports cell counts masked by each method.
3. Soft coastline falloff: Computes distance-to-coast using Euclidean Distance Transform (scipy.ndimage.distance_transform_edt),
   ramping alpha smoothly from 0.0 to 1.0 over 2-3 grid cells at the shoreline.
"""

import os
import json
from typing import Tuple, List, Set, Optional, Dict, Any
import numpy as np
import scipy.ndimage as ndi

POLYGON_PATH = os.path.join(os.path.dirname(__file__), "arabian_sea_polygon.json")

_OCEAN_POLYGON: Optional[List[List[float]]] = None


def get_arabian_sea_polygon() -> List[List[float]]:
    """Loads and caches the bundled Natural Earth Arabian Sea ocean polygon."""
    global _OCEAN_POLYGON
    if _OCEAN_POLYGON is not None:
        return _OCEAN_POLYGON

    if not os.path.exists(POLYGON_PATH):
        raise FileNotFoundError(f"Arabian Sea polygon not found at {POLYGON_PATH}")

    with open(POLYGON_PATH, "r") as f:
        data = json.load(f)
    _OCEAN_POLYGON = data["coordinates"][0]
    return _OCEAN_POLYGON


def point_in_polygon(x: float, y: float, poly: List[List[float]]) -> bool:
    """
    Ray casting algorithm to test if point (x=lon, y=lat) is inside polygon.
    """
    n = len(poly)
    inside = False
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


def apply_land_mask(
    data_4d: np.ndarray,
    lats: List[float],
    lons: List[float],
    fill_values: Optional[Set[float]] = None,
) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
    """
    Applies the two-tier land masking pipeline to a 4D array (time, depth, lat, lon).

    Returns:
    - masked_data_4d: 4D numpy array with NaN over land cells
    - coastline_alpha: 2D numpy array (lat, lon) with alpha values [0.0, 1.0] ramping over 2-3 cells
    - diagnostics: Dict with counts of cells masked by primary vs backup methods
    """
    if fill_values is None:
        fill_values = set()

    nlat = len(lats)
    nlon = len(lons)
    total_cells = nlat * nlon

    # Step 1: Detect Primary Mask from data values
    # A 2D cell (i, j) is primary-masked if it is NaN, inf, or matches any known _FillValue / missing_value
    surface_slice = data_4d[0, 0, :, :].copy()
    primary_mask = np.zeros((nlat, nlon), dtype=bool)

    # Check NaNs and infinities
    primary_mask |= ~np.isfinite(surface_slice)

    # Check declared fill values (exact and float close)
    for fv in fill_values:
        if fv is not None and np.isfinite(fv):
            primary_mask |= np.isclose(surface_slice, fv, rtol=1e-4, atol=1e-4)

    # Values exceeding physical limits (> 1e20 or < -1e20) are fill values
    primary_mask |= (np.abs(surface_slice) > 1e20)

    primary_masked_count = int(np.sum(primary_mask))

    # Step 2: Backup Mask using Natural Earth Ocean Polygon
    poly = get_arabian_sea_polygon()
    backup_mask = np.zeros((nlat, nlon), dtype=bool)

    for i, lat in enumerate(lats):
        for j, lon in enumerate(lons):
            # Only test cells not already masked by primary fill values
            if not primary_mask[i, j]:
                is_ocean = point_in_polygon(lon, lat, poly)
                if not is_ocean:
                    backup_mask[i, j] = True

    backup_masked_count = int(np.sum(backup_mask))

    # Combined land mask
    combined_land_mask = primary_mask | backup_mask
    water_mask = ~combined_land_mask
    water_count = int(np.sum(water_mask))

    # Step 3: Apply mask to the 4D array (NaN for all masked cells)
    masked_data = data_4d.copy()
    masked_data[:, :, combined_land_mask] = np.nan

    # Step 4: Compute distance-to-coast falloff
    # distance_transform_edt computes Euclidean distance in grid cell units to nearest 0 (land)
    dist = ndi.distance_transform_edt(water_mask)

    # Ramp alpha smoothly from 0.0 to 1.0 over roughly 2.5 grid cells (2-3 cells)
    # At dist=0 (land): alpha=0.0
    # At dist=1: alpha=0.40
    # At dist=2: alpha=0.80
    # At dist>=2.5: alpha=1.0
    coastline_alpha = np.clip(dist / 2.5, 0.0, 1.0).astype(np.float32)
    coastline_alpha[combined_land_mask] = 0.0

    diagnostics = {
        "primary_masked_count": primary_masked_count,
        "backup_masked_count": backup_masked_count,
        "total_cells": total_cells,
        "water_cells": water_count,
        "land_cells": total_cells - water_count,
        "land_percentage": round(((total_cells - water_count) / total_cells) * 100.0, 1),
    }

    print(
        f"[Land Mask] Total cells: {total_cells} | "
        f"Primary mask (NaN/_FillValue): {primary_masked_count} | "
        f"Backup mask (Natural Earth polygon): {backup_masked_count} | "
        f"Ocean cells: {water_count} ({100.0 - diagnostics['land_percentage']}%)"
    )

    if backup_masked_count > 50 and primary_masked_count == 0:
        print(
            f"[Land Mask Warning] Backup Natural Earth polygon masked {backup_masked_count} cells "
            "because source NetCDF did not declare _FillValue/missing_value attributes."
        )

    return masked_data, coastline_alpha, diagnostics
