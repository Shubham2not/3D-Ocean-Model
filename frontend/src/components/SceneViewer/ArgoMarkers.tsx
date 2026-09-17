import { useCallback } from 'react';
import { Entity } from 'resium';
import * as Cesium from 'cesium';
import { useOceanStore } from '../../stores/oceanStore';
import { fetchArgoProfile, fetchModelProfile } from '../../services/api';

/**
 * ArgoMarkers — Renders Argo float positions on the Cesium globe matching
 * the reference image:
 * - Yellow circular dot with label "Argo Float"
 * - Vertical dashed yellow stem extending down to the ocean surface/block
 * - Interactive click opening the top-right profile card
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
        if (profile) setSelectedProfile(profile);
        if (modelProf) setModelProfile(modelProf);
      } catch (err) {
        console.error('Failed to fetch profiles:', err);
      }
    },
    [setSelectedFloat, setSelectedProfile, setModelProfile, setProfileOpen, timeIndex, variable]
  );

  // Focus/primary float position matching the reference image (over the cutaway block)
  const primaryFloat = {
    float_id: '6903723',
    lat: 14.2,
    lon: 66.2,
    deploy_date: '2023-11-10',
    status: 'ACTIVE',
    num_cycles: 48,
    latest_cycle: 48,
  };

  const allFloatsToRender = argoFloats.length > 0 ? argoFloats : [primaryFloat];

  return (
    <>
      {allFloatsToRender.map((float_) => {
        const isPrimary = float_.float_id === '6903723' || float_.float_id === selectedFloat?.float_id;
        const altitude = isPrimary ? 320000 : 80000; // Floating altitude for label
        const topPos = Cesium.Cartesian3.fromDegrees(float_.lon, float_.lat, altitude);
        const surfacePos = Cesium.Cartesian3.fromDegrees(float_.lon, float_.lat, 100);

        return (
          <div key={`argo-group-${float_.float_id}`}>
            {/* Vertical dashed yellow stem dropping down to surface/volume */}
            {isPrimary && (
              <Entity
                id={`argo-stem-${float_.float_id}`}
                polyline={{
                  positions: [topPos, surfacePos],
                  width: 2.2,
                  material: new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.fromCssColorString('#facc15'),
                    dashLength: 16.0,
                    dashPattern: 255,
                  }),
                }}
              />
            )}

            {/* Surface touchdown dot */}
            {isPrimary && (
              <Entity
                id={`argo-base-${float_.float_id}`}
                position={surfacePos}
                point={{
                  pixelSize: 8,
                  color: Cesium.Color.WHITE,
                  outlineColor: Cesium.Color.fromCssColorString('#facc15'),
                  outlineWidth: 3,
                  disableDepthTestDistance: Number.POSITIVE_INFINITY,
                }}
              />
            )}

            {/* Floating marker with Yellow Dot and "Argo Float" label */}
            <Entity
              id={`argo-${float_.float_id}`}
              name={`Argo Float ${float_.float_id}`}
              position={topPos}
              point={{
                pixelSize: isPrimary ? 13 : 9,
                color: Cesium.Color.fromCssColorString('#facc15'),
                outlineColor: Cesium.Color.fromCssColorString('#020617'),
                outlineWidth: 2.5,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
              }}
              label={{
                text: isPrimary ? 'Argo Float' : `Float ${float_.float_id}`,
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
                pixelOffset: new Cesium.Cartesian2(12, 0),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 14000000),
              }}
              onClick={() => handleClick(float_)}
            />
          </div>
        );
      })}
    </>
  );
}
