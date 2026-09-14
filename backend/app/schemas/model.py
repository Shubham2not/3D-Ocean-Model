"""
Pydantic schemas for ocean model endpoints.
"""

from typing import List
from pydantic import BaseModel, Field


class VariableInfo(BaseModel):
    name: str = Field(..., description="Variable identifier name")
    long_name: str = Field(..., description="Human-readable variable name")
    units: str = Field(..., description="Measurement units")
    dims: List[str] = Field(..., description="Dimension order of dataset")
    available: bool = Field(..., description="Whether variable is available in API")


class VariablesResponse(BaseModel):
    variables: List[VariableInfo]


class TimeStepItem(BaseModel):
    index: int = Field(..., description="0-based timestep index")
    label: str = Field(..., description="ISO 8601 timestamp string")


class TimestepsResponse(BaseModel):
    variable: str
    timesteps: List[TimeStepItem]


class DepthItem(BaseModel):
    index: int = Field(..., description="0-based depth level index")
    depth_m: int = Field(..., description="Depth in meters")


class DepthsResponse(BaseModel):
    depths: List[DepthItem]


class ModelSliceResponse(BaseModel):
    variable: str = Field(..., description="Variable name (e.g. temperature)")
    depth_m: int = Field(..., description="Depth in meters")
    depth_index: int = Field(..., description="Depth level index")
    time: str = Field(..., description="ISO 8601 timestamp of data slice")
    time_index: int = Field(..., description="Timestep index")
    lats: List[float] = Field(..., description="Array of latitude coordinates")
    lons: List[float] = Field(..., description="Array of longitude coordinates")
    nlat: int = Field(..., description="Number of latitude grid points")
    nlon: int = Field(..., description="Number of longitude grid points")
    data: List[float] = Field(..., description="Flattened 2D grid values (row-major: lat then lon)")
    min_val: float = Field(..., description="Minimum value in the slice")
    max_val: float = Field(..., description="Maximum value in the slice")
    units: str = Field("°C", description="Measurement units")
