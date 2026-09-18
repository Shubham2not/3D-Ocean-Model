from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import model_data, argo, colorbar

app = FastAPI(
    title="Ocean3D API",
    description=(
        "Backend API for the Ocean3D 3D ocean data visualization platform. "
        "SIH Problem Statement 26067 — INCOIS, MoES."
    ),
    version="0.1.0-mvp",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(model_data.router)
app.include_router(argo.router)
app.include_router(colorbar.router)

@app.get("/", tags=["Health"])
async def root():
    return {
        "name": "Ocean3D API",
        "version": "0.1.0-mvp",
        "status": "running",
        "docs": "/docs",
    }

@app.get("/point-data", tags=["Point Data"])
@app.get("/point_data", tags=["Point Data"])
async def root_point_data(
    lat: float,
    lon: float,
    variable: str = "temperature",
    depth: int = 0,
    time: int = 0,
    date: str = None,
    method: str = "bilinear",
):
    from app.routers.model_data import get_point_data
    return await get_point_data(
        lat=lat,
        lon=lon,
        variable=variable,
        depth=depth,
        time=time,
        date=date,
        method=method,
    )

@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}

