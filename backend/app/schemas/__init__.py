"""
Schemas package for Ocean3D API.
"""
from app.schemas.model import (
    VariableInfo,
    VariablesResponse,
    TimeStepItem,
    TimestepsResponse,
    DepthItem,
    DepthsResponse,
    ModelSliceResponse,
)
from app.schemas.argo import (
    ArgoFloatSummary,
    ArgoFloatsResponse,
    ProfileLevel,
    ArgoProfileResponse,
)

__all__ = [
    "VariableInfo",
    "VariablesResponse",
    "TimeStepItem",
    "TimestepsResponse",
    "DepthItem",
    "DepthsResponse",
    "ModelSliceResponse",
    "ArgoFloatSummary",
    "ArgoFloatsResponse",
    "ProfileLevel",
    "ArgoProfileResponse",
]
