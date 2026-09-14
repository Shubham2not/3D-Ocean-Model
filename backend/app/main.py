"""
Ocean3D — FastAPI Application Entry Point

Main application with CORS middleware and router registration.
"""

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

# CORS — allow local dev frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
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


@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}

