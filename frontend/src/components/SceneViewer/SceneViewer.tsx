import { useEffect, useState, useRef, useMemo } from 'react';
import { Viewer, type CesiumComponentRef } from 'resium';
import * as Cesium from 'cesium';
import type { Viewer as CesiumViewer } from 'cesium';
import ArgoMarkers from './ArgoMarkers';
import GliderMarkers from './GliderMarkers';
import CtdMarkers from './CtdMarkers';
import WaterBodyLabels from './WaterBodyLabels';
import OceanDrapeLayer from './OceanDrapeLayer';
import OceanCutawayBlock from './OceanCutawayBlock';
import CurrentStreamlines from './CurrentStreamlines';
import HorizontalColorbar from './HorizontalColorbar';
import MiniGlobe from '../Minimap/MiniGlobe';
import { sharedPerformanceManager } from '../../utils/performanceManager';
import { useOceanStore } from '../../stores/oceanStore';
import { fetchArgoProfile, fetchModelProfile } from '../../services/api';

/**
 * SceneViewer — Ocean-focused 3D Earth Globe powered by CesiumJS and Resium.
 * Styled matching the reference image:
 * - Oblique perspective of Indian Ocean & Arabian Sea
 * - 3D Ocean Cutaway Block with depth profiles
 * - Flowing surface current streamlines
 * - Argo Float & Glider markers
 * - Bottom-center horizontal legend & bottom-right mini-globe
 */
export default function SceneViewer() {
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);
  const argoFloats = useOceanStore((s) => s.argoFloats);
  const timeIndex = useOceanStore((s) => s.timeIndex);
  const variable = useOceanStore((s) => s.variable);
  const viewMode = useOceanStore((s) => s.viewMode);
  const showArgoFloats = useOceanStore((s) => s.showArgoFloats);
  const setSelectedFloat = useOceanStore((s) => s.setSelectedFloat);
  const setSelectedProfile = useOceanStore((s) => s.setSelectedProfile);
  const setModelProfile = useOceanStore((s) => s.setModelProfile);
  const setProfileOpen = useOceanStore((s) => s.setProfileOpen);

  const baseLayer = useMemo(() => {
    return Cesium.ImageryLayer.fromProviderAsync(
      Cesium.ArcGisMapServerImageryProvider.fromUrl(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer',
        { enablePickFeatures: false }
      ).catch(() => {
        return Cesium.TileMapServiceImageryProvider.fromUrl(
          '/cesiumStatic/Assets/Textures/NaturalEarthII'
        );
      })
    );
  }, []);

  const terrainProvider = useMemo(() => new Cesium.EllipsoidTerrainProvider(), []);

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    const globe = viewer.scene.globe;
    const scene = viewer.scene;

    scene.backgroundColor = Cesium.Color.fromCssColorString('#030712');

    scene.skyAtmosphere = new Cesium.SkyAtmosphere();
    scene.skyAtmosphere.brightnessShift = -0.15;
    scene.skyAtmosphere.hueShift = -0.05;
    scene.skyAtmosphere.saturationShift = 0.1;

    globe.enableLighting = false;
    globe.showGroundAtmosphere = true;
    globe.baseColor = Cesium.Color.fromCssColorString('#06101e');
    globe.undergroundColor = Cesium.Color.fromCssColorString('#020812');
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.88;
    globe.translucency.backFaceAlpha = 0.88;


    globe.depthTestAgainstTerrain = false;
    globe.preloadAncestors = false;
    globe.preloadSiblings = false;
    globe.maximumScreenSpaceError = 2.5;
    globe.tileCacheSize = 100;
    globe.loadingDescendantLimit = 2;

    scene.skyBox = undefined as unknown as Cesium.SkyBox;
    scene.fog.enabled = true;
    scene.fog.density = 2.0e-4;
    scene.sun = undefined as unknown as Cesium.Sun;
    scene.moon = undefined as unknown as Cesium.Moon;

    // --- Camera: tilted perspective matching reference image ---
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(63.5, 3.5, 3800000),
      orientation: {
        heading: Cesium.Math.toRadians(18.0),
        pitch: Cesium.Math.toRadians(-38.0),
        roll: 0.0,
      },
    });

    const sscc = scene.screenSpaceCameraController;
    sscc.enableRotate = true;
    sscc.enableTranslate = true;
    sscc.enableZoom = true;
    sscc.enableTilt = true;
    sscc.enableLook = true;
    sscc.minimumZoomDistance = 500;
    sscc.maximumZoomDistance = 35_000_000;

    const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    handler.setInputAction(async (movement: { position: Cesium.Cartesian2 }) => {
      const pickedObject = scene.pick(movement.position);
      if (
        Cesium.defined(pickedObject) &&
        pickedObject.id &&
        typeof pickedObject.id.id === 'string'
      ) {
        const entityId: string = pickedObject.id.id;
        if (entityId.startsWith('argo-')) {
          const floatId = entityId.replace('argo-', '').replace('stem-', '').replace('base-', '');
          const float_ = argoFloats.find((f) => f.float_id === floatId);
          if (float_) {
            setSelectedFloat(float_);
            setProfileOpen(true);
            try {
              const [profile, modelProf] = await Promise.all([
                fetchArgoProfile(float_.float_id, float_.latest_cycle).catch(() => null),
                fetchModelProfile(float_.lat, float_.lon, timeIndex, variable).catch(() => null),
              ]);
              if (profile) setSelectedProfile(profile);
              if (modelProf) setModelProfile(modelProf);
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
        {/* In-situ Observation Markers */}
        {showArgoFloats && <ArgoMarkers />}
        <GliderMarkers />
        <CtdMarkers />
        <WaterBodyLabels />

        {/* Ocean Surface Data Layer */}
        <OceanDrapeLayer />

        {/* 3D Volumetric Ocean Cutaway Block with depth profiles */}
        {viewMode === 'volume' && <OceanCutawayBlock />}

        {/* Flowing Surface Current Streamlines */}
        <CurrentStreamlines />
      </Viewer>

      {/* Floating HTML Overlays matching reference image */}
      <HorizontalColorbar />
      <MiniGlobe />
      <PerformanceIndicator />
    </div>
  );
}


function PerformanceIndicator() {
  const [stats, setStats] = useState(() => sharedPerformanceManager.stats);

  useEffect(() => {
    const id = setInterval(() => {
      setStats({ ...sharedPerformanceManager.stats });
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      id="perf-stats-badge"
      style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        backdropFilter: 'blur(10px)',
        borderRadius: 6,
        padding: '4px 10px',
        fontSize: 11,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        zIndex: 20,
        pointerEvents: 'none',
        boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
      }}
      title="Live WebGL2 ray-marching performance metrics"
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: stats.fps >= 30 ? '#4ade80' : '#f87171',
          boxShadow: stats.fps >= 30 ? '0 0 6px #4ade80' : '0 0 6px #f87171',
        }}
      />
      <span style={{ fontWeight: 700, color: stats.fps >= 30 ? '#4ade80' : '#f87171' }}>
        {stats.fps} FPS
      </span>
      <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
      <span style={{ color: '#94a3b8' }}>{stats.stepCount} steps</span>
      <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
      <span style={{ color: '#38bdf8' }}>{stats.frameTimeMs}ms</span>
    </div>
  );
}


