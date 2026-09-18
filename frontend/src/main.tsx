import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'

if (typeof window !== 'undefined') {
  ;(window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = '/cesiumStatic/'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
