import { Entity } from 'resium';
import * as Cesium from 'cesium';
import { useOceanStore } from '../../stores/oceanStore';

export default function CtdMarkers() {
  const showCtdStations = useOceanStore((s) => s.showCtdStations);
  const ctdStations = useOceanStore((s) => s.ctdStations);
  const showToast = useOceanStore((s) => s.showToast);

  if (!showCtdStations) return null;

  return (
    <>
      {ctdStations.map((station) => {
        const pos = Cesium.Cartesian3.fromDegrees(station.lon, station.lat, 100);
        return (
          <Entity
            key={station.id}
            id={`ctd-${station.id}`}
            name={station.name}
            position={pos}
            point={{
              pixelSize: 10,
              color: Cesium.Color.fromCssColorString('#38bdf8'),
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            }}
            label={{
              text: `CTD ${station.name}`,
              font: '600 12px Inter, system-ui, sans-serif',
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.fromCssColorString('#020617'),
              outlineWidth: 3,
              pixelOffset: new Cesium.Cartesian2(0, -14),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            }}
            onClick={() => {
              showToast(`Moored CTD Station: ${station.name} (${station.lat}°N, ${station.lon}°E)`, 'info');
            }}
          />
        );
      })}
    </>
  );
}
