import { Entity } from 'resium';
import * as Cesium from 'cesium';
import { useOceanStore } from '../../stores/oceanStore';
import { fetchGliderProfile } from '../../services/api';

// SVG triangle for glider marker
const gliderSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <polygon points="12,2 22,22 2,22" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/>
  </svg>
`)}`;

/**
 * GliderMarkers — Renders autonomous deep-sea gliders matching the
 * white/cyan triangle "▲ Glider" marker seen in the reference image.
 */
export default function GliderMarkers() {
  const showGliders = useOceanStore((s) => s.showGliders);
  const gliders = useOceanStore((s) => s.gliders);
  const showToast = useOceanStore((s) => s.showToast);
  const setSelectedGlider = useOceanStore((s) => s.setSelectedGlider);
  const setSelectedGliderProfile = useOceanStore((s) => s.setSelectedGliderProfile);
  const setGliderModalOpen = useOceanStore((s) => s.setGliderModalOpen);

  if (!showGliders) return null;

  const defaultGliders = gliders.length > 0 ? gliders : [
    { id: 'GLIDER-SG542', name: 'Glider', lat: 15.2, lon: 70.8, status: 'Diving (350m)', mission: 'Arabian Sea Hydrography', battery: 85 }
  ];

  return (
    <>
      {defaultGliders.map((g) => {
        const pos = Cesium.Cartesian3.fromDegrees(g.lon, g.lat, 220000);
        return (
          <Entity
            key={g.id}
            id={`glider-${g.id}`}
            name={`Glider ${g.name}`}
            position={pos}
            billboard={{
              image: gliderSvg,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              scale: 0.85,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            }}
            label={{
              text: 'Glider',
              font: '600 13px Inter, system-ui, sans-serif',
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.fromCssColorString('rgba(10, 18, 36, 0.95)'),
              outlineWidth: 3,
              showBackground: true,
              backgroundColor: Cesium.Color.fromCssColorString('rgba(10, 18, 36, 0.82)'),
              backgroundPadding: new Cesium.Cartesian2(8, 4),
              horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              pixelOffset: new Cesium.Cartesian2(14, 0),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 14000000),
            }}
            onClick={async () => {
              setSelectedGlider(g);
              showToast(`Loading SeaNoe OceanGliders GDAC profile for ${g.id}...`, 'info');
              try {
                const prof = await fetchGliderProfile(g.id);
                setSelectedGliderProfile(prof);
                setGliderModalOpen(true);
              } catch (err) {
                console.error('Glider profile error:', err);
                setGliderModalOpen(true);
              }
            }}
          />
        );
      })}
    </>
  );
}
