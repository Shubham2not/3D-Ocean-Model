import { useEffect, useRef, useMemo } from 'react';
import { Viewer, type CesiumComponentRef } from 'resium';
import * as Cesium from 'cesium';
import type { Viewer as CesiumViewer } from 'cesium';
import ArgoMarkers from './ArgoMarkers';
import ColorbarLegend from './ColorbarLegend';
import { useOceanStore } from '../../stores/oceanStore';
import { fetchArgoProfile, fetchModelProfile } from '../../services/api';

/**
 * SceneViewer — 3D Earth Globe visualization powered by CesiumJS and Resium.
 *
 * Default view is focused on the Arabian Sea (lon 60-78, lat 5-25),
 * with free rotation, panning, and seamless zoom from local sea level out to global space.
 */
export default function SceneViewer() {
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);
  const argoFloats = useOceanStore((s) => s.argoFloats);
  const timeIndex = useOceanStore((s) => s.timeIndex);
  const variable = useOceanStore((s) => s.variable);
  const setSelectedFloat = useOceanStore((s) => s.setSelectedFloat);
  const setSelectedProfile = useOceanStore((s) => s.setSelectedProfile);
  const setModelProfile = useOceanStore((s) => s.setModelProfile);
  const setProfileOpen = useOceanStore((s) => s.setProfileOpen);

  // High-performance satellite imagery with local NaturalEarthII offline fallback
  const baseLayer = useMemo(() => {
    return Cesium.ImageryLayer.fromProviderAsync(
      Cesium.ArcGisMapServerImageryProvider.fromUrl(
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
        { enablePickFeatures: false }
      ).catch(() => {
        return Cesium.TileMapServiceImageryProvider.fromUrl(
          '/cesiumStatic/Assets/Textures/NaturalEarthII'
        );
      })
    );
  }, []);

  const terrainProvider = useMemo(() => new Cesium.EllipsoidTerrainProvider(), []);

  // Set default camera view to Arabian Sea bounding box
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    // Arabian Sea: lon 58-80, lat 3-27
    const arabianSeaBounds = Cesium.Rectangle.fromDegrees(58.0, 3.0, 80.0, 27.0);

    viewer.camera.setView({
      destination: arabianSeaBounds,
    });

    // Ensure full-globe navigation is configured exactly like Google Earth
    if (viewer.scene?.screenSpaceCameraController) {
      viewer.scene.screenSpaceCameraController.enableRotate = true;
      viewer.scene.screenSpaceCameraController.enableTranslate = true;
      viewer.scene.screenSpaceCameraController.enableZoom = true;
      viewer.scene.screenSpaceCameraController.enableTilt = true;
      viewer.scene.screenSpaceCameraController.enableLook = true;
      // Allow zooming from 500m sea level all the way to 35,000,000m (space whole Earth view)
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 500;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 35000000;
    }

    // Direct screen-space click listener for reliable entity picking
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(async (movement: { position: Cesium.Cartesian2 }) => {
      const pickedObject = viewer.scene.pick(movement.position);
      if (
        Cesium.defined(pickedObject) &&
        pickedObject.id &&
        typeof pickedObject.id.id === 'string'
      ) {
        const entityId: string = pickedObject.id.id;
        if (entityId.startsWith('argo-')) {
          const floatId = entityId.replace('argo-', '');
          const float_ = argoFloats.find((f) => f.float_id === floatId);
          if (float_) {
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
          }
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
    };
  }, [
    argoFloats,
    timeIndex,
    variable,
    setSelectedFloat,
    setSelectedProfile,
    setModelProfile,
    setProfileOpen,
  ]);

  return (
    <div
      className="scene-viewer"
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <Viewer
        ref={viewerRef}
        full
        baseLayer={baseLayer}
        terrainProvider={terrainProvider}
        animation={false}
        timeline={false}
        baseLayerPicker={false}
        navigationHelpButton={false}
        geocoder={false}
        sceneModePicker={false}
        infoBox={false}
        selectionIndicator={false}
        fullscreenButton={false}
        homeButton={false}
      >
        <ArgoMarkers />
      </Viewer>

      {/* HTML Overlays */}
      <ColorbarLegend />
    </div>
  );
}
