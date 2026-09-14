# Ocean3D — 3D Ocean Data Visualization Platform

Interactive 3D ocean data visualization platform for INCOIS (Indian National Centre for Ocean Information Services), MoES.

## Monorepo Architecture

```
ocean3d/
├── backend/          (FastAPI, Python)
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   └── data/
│   └── requirements.txt
├── frontend/         (React + Vite, TypeScript)
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── stores/
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Getting Started

### 1. Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/v1/health`

### 2. Frontend Setup (React + Vite + TypeScript)

```bash
cd frontend
npm install
npm run dev
```

- Web App: `http://localhost:5173`

## Features

- **3D Ocean Data Visualization**: Interactive Three.js/React-Three-Fiber rendering of depth slices in the Arabian Sea.
- **Dynamic Colorbar Presets**: Colormaps including Jet, Viridis, Turbo, Inferno, Cool–Warm, and Ocean.
- **Temporal Animation & Depth Slicing**: Controls to step through depth levels and time series data.
- **Argo Float Overlay**: Clickable in-situ floats with vertical depth profiles (temperature & salinity).
