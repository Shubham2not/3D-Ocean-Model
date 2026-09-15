import { useCallback } from 'react';
import { Entity } from 'resium';
import * as Cesium from 'cesium';
import { useOceanStore } from '../../stores/oceanStore';
import { fetchArgoProfile, fetchModelProfile } from '../../services/api';

// Custom SVG pins for default and active float selection
const defaultPinSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 32 42">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26c0-8.84-7.16-16-16-16z" fill="#ff6b35" stroke="#ffffff" stroke-width="2"/>
    <circle cx="16" cy="16" r="6" fill="#0f172a"/>
    <circle cx="16" cy="16" r="3.5" fill="#ffffff"/>
  </svg>
`)}`;

const selectedPinSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="38" height="50" viewBox="0 0 32 42">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26c0-8.84-7.16-16-16-16z" fill="#4ecdc4" stroke="#ffffff" stroke-width="2.5"/>
    <circle cx="16" cy="16" r="7" fill="#0f172a"/>
    <circle cx="16" cy="16" r="4.5" fill="#4ecdc4"/>
  </svg>
`)}`;

/**
 * ArgoMarkers — renders Argo float positions as Cesium 3D Entities on the globe.
 * Clicking a float fetches and displays the depth profile comparison panel.
 */
export default function ArgoMarkers() {
  const argoFloats = useOceanStore((s) => s.argoFloats);
  const timeIndex = useOceanStore((s) => s.timeIndex);
  const variable = useOceanStore((s) => s.variable);
  const selectedFloat = useOceanStore((s) => s.selectedFloat);
  const setSelectedFloat = useOceanStore((s) => s.setSelectedFloat);
  const setSelectedProfile = useOceanStore((s) => s.setSelectedProfile);
  const setModelProfile = useOceanStore((s) => s.setModelProfile);
  const setProfileOpen = useOceanStore((s) => s.setProfileOpen);

  const handleClick = useCallback(
    async (float_: (typeof argoFloats)[0]) => {
      setSelectedFloat(float_);
      setSelectedProfile(null);
      setModelProfile(null);
      setProfileOpen(true);
      try {
        const [profile, modelProf] = await Promise.all([
          fetchArgoProfile(float_.float_id, float_.latest_cycle).catch((err) => {
            console.error('Failed to fetch Argo profile:', err);
            return null;
          }),
          fetchModelProfile(float_.lat, float_.lon, timeIndex, variable).catch((err) => {
            console.error('Failed to fetch Model profile:', err);
            return null;
          }),
        ]);
        setSelectedProfile(profile);
        setModelProfile(modelProf);
      } catch (err) {
        console.error('Failed to fetch profiles:', err);
      }
    },
    [setSelectedFloat, setSelectedProfile, setModelProfile, setProfileOpen, timeIndex, variable]
  );

  return (
    <>
      {argoFloats.map((float_) => {
        const isSelected = selectedFloat?.float_id === float_.float_id;
        const position = Cesium.Cartesian3.fromDegrees(float_.lon, float_.lat, 50);

        return (
          <Entity
            key={float_.float_id}
            id={`argo-${float_.float_id}`}
            name={`Argo Float ${float_.float_id}`}
            position={position}
            billboard={{
              image: isSelected ? selectedPinSvg : defaultPinSvg,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              scale: isSelected ? 1.1 : 0.85,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            }}
            point={{
              pixelSize: isSelected ? 10 : 7,
              color: isSelected
                ? Cesium.Color.fromCssColorString('#4ecdc4')
                : Cesium.Color.fromCssColorString('#ff6b35'),
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            }}
            label={{
              text: `Float ${float_.float_id}`,
              font: '600 11px Inter, system-ui, sans-serif',
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              fillColor: isSelected
                ? Cesium.Color.fromCssColorString('#4ecdc4')
                : Cesium.Color.WHITE,
              outlineColor: Cesium.Color.fromCssColorString('#0a0e1a'),
              outlineWidth: 3,
              showBackground: true,
              backgroundColor: Cesium.Color.fromCssColorString('rgba(15, 23, 42, 0.85)'),
              backgroundPadding: new Cesium.Cartesian2(6, 3),
              verticalOrigin: Cesium.VerticalOrigin.TOP,
              pixelOffset: new Cesium.Cartesian2(0, 8),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 7000000),
            }}
            onClick={() => handleClick(float_)}
          />
        );
      })}
    </>
  );
}
