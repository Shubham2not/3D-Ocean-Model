from typing import List, Optional
from pydantic import BaseModel, Field

class ArgoFloatSummary(BaseModel):
    float_id: str = Field(..., description="Unique WMO or Argo float identifier")
    lat: float = Field(..., description="Current latitude position (°N)")
    lon: float = Field(..., description="Current longitude position (°E)")
    deploy_date: Optional[str] = Field(None, description="Date deployed")
    status: str = Field("active", description="Operational status")
    num_cycles: int = Field(..., description="Total cycles performed")
    latest_cycle: int = Field(..., description="Latest available cycle index")

class ArgoFloatsResponse(BaseModel):
    count: int = Field(..., description="Total number of matching floats")
    floats: List[ArgoFloatSummary]

class ProfileLevel(BaseModel):
    depth_m: int = Field(..., description="Depth in meters")
    pressure_dbar: float = Field(..., description="Observed pressure in decibars")
    temperature: float = Field(..., description="Observed sea water temperature (°C)")
    salinity: Optional[float] = Field(None, description="Observed salinity (PSU)")

class ArgoProfileResponse(BaseModel):
    float_id: str = Field(..., description="Float identifier")
    cycle_number: int = Field(..., description="Profile cycle number")
    profile_time: str = Field(..., description="ISO 8601 timestamp of observation")
    lat: float = Field(..., description="Latitude of float at time of profile")
    lon: float = Field(..., description="Longitude of float at time of profile")
    levels: List[ProfileLevel] = Field(..., description="Vertical profile levels ordered by depth")
