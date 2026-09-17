import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useCesium } from 'resium';
import { useOceanStore } from '../../stores/oceanStore';
import { getInterpolator } from '../../utils/colorUtils';
import {
  buildVolumeTexture,
  buildColormapTexture,
  disposeVolumeTexture,
  type VolumeTextureInfo,
} from '../../utils/OceanVolumeTexture';
import { OceanVolumePrimitive } from './OceanVolumePrimitive';

/**
 * OceanVolume — React component that manages the volumetric ocean render.
 *
 * Responsibilities:
 * 1. Watches allSlices, colorMin/Max, activePresetId, selectedDepth from store
 * 2. Builds/updates the 3D volume texture when slice data changes
 * 3. Builds/updates the colormap LUT when palette/range changes
 * 4. Strictly keeps only ONE volume texture in GPU memory, disposing old textures instantly
 * 5. Manages the OceanVolumePrimitive lifecycle
 * 6. Maps the depth slider to the cutaway clip plane
 * 7. Hooks into Cesium's postRender to issue raw GL draw calls
 */
export default function OceanVolume() {
  const { viewer } = useCesium();
  const primitiveRef = useRef<OceanVolumePrimitive | null>(null);
  const volumeTexRef = useRef<VolumeTextureInfo | null>(null);
  const colormapTexRef = useRef<WebGLTexture | null>(null);
  const postRenderListenerRef = useRef<(() => void) | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);

  // Store selectors
  const allSlices = useOceanStore((s) => s.allSlices);
  const selectedDepth = useOceanStore((s) => s.selectedDepth);
  const timeIndex = useOceanStore((s) => s.timeIndex);
  const variable = useOceanStore((s) => s.variable);
  const colorMin = useOceanStore((s) => s.colorMin);
  const colorMax = useOceanStore((s) => s.colorMax);
  const activePresetId = useOceanStore((s) => s.activePresetId);
  const colorPresets = useOceanStore((s) => s.colorPresets);
  const modelSlice = useOceanStore((s) => s.modelSlice);
  const depths = useOceanStore((s) => s.depths);

  const interpolator = useMemo(
    () => getInterpolator(activePresetId, colorPresets),
    [activePresetId, colorPresets],
  );

  // Effective color range
  const effectiveMin = colorMin ?? modelSlice?.min_val ?? 0;
  const effectiveMax = colorMax ?? modelSlice?.max_val ?? 30;

  // Max depth from the depth levels
  const maxDepth = useMemo(() => {
    if (depths.length === 0) return 1000;
    return Math.max(...depths.map((d) => d.depth_m), 1000);
  }, [depths]);

  // Normalized depth clip: selectedDepth / maxDepth
  const depthClip = useMemo(() => {
    if (maxDepth <= 0) return 1.0;
    return Math.max(0.01, Math.min(1.0, selectedDepth / maxDepth));
  }, [selectedDepth, maxDepth]);

  // Get WebGL2 context from Cesium's canvas
  const getGL = useCallback((): WebGL2RenderingContext | null => {
    if (glRef.current) return glRef.current;
    if (!viewer) return null;
    const canvas = viewer.scene.canvas as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2');
    if (gl) {
      // Enable float texture extension for R32F
      gl.getExtension('EXT_color_buffer_float');
      glRef.current = gl;
    }
    return gl;
  }, [viewer]);

  // ── Explicitly dispose old 3D volume texture the instant time or variable changes ──
  useEffect(() => {
    const gl = getGL();
    if (gl && volumeTexRef.current) {
      disposeVolumeTexture(gl, volumeTexRef.current);
      volumeTexRef.current = null;
    }
  }, [timeIndex, variable, getGL]);

  // ── Build/update 3D volume texture when slice data changes ──
  useEffect(() => {
    const gl = getGL();
    if (!gl || Object.keys(allSlices).length === 0) return;

    // Dispose previous before allocating new
    if (volumeTexRef.current) {
      disposeVolumeTexture(gl, volumeTexRef.current);
      volumeTexRef.current = null;
    }

    const depthIndices = Object.keys(allSlices).map(Number);
    const info = buildVolumeTexture(gl, allSlices, depthIndices, effectiveMin, effectiveMax);
    volumeTexRef.current = info;
  }, [allSlices, effectiveMin, effectiveMax, getGL]);

  // ── Build/update colormap LUT when palette changes ──
  useEffect(() => {
    const gl = getGL();
    if (!gl) return;

    // Dispose previous colormap texture
    if (colormapTexRef.current) {
      gl.deleteTexture(colormapTexRef.current);
      colormapTexRef.current = null;
    }

    colormapTexRef.current = buildColormapTexture(gl, interpolator);
  }, [interpolator, getGL]);

  // ── Create primitive and hook into Cesium's render loop ──
  useEffect(() => {
    if (!viewer) return;

    // Create the volume primitive
    const primitive = new OceanVolumePrimitive();
    primitiveRef.current = primitive;

    // Initialize resources (first _update call will create GPU resources)
    const scene = viewer.scene;
    const gl = getGL();
    if (!gl) return;

    // Force a first _update to create GPU resources
    // We need to call this with the scene's frame state
    const fakeFrameState = {
      context: { _gl: gl },
      camera: scene.camera,
      commandList: [],
    };
    primitive._update(fakeFrameState);

    // Hook into postRender to draw the volume each frame
    const renderCallback = () => {
      if (!primitiveRef.current) return;
      primitiveRef.current.render({ camera: scene.camera });
      // Request re-render
      scene.requestRender();
    };

    postRenderListenerRef.current = renderCallback;
    scene.postRender.addEventListener(renderCallback);
    scene.requestRender();

    return () => {
      if (postRenderListenerRef.current) {
        scene.postRender.removeEventListener(postRenderListenerRef.current);
        postRenderListenerRef.current = null;
      }
      if (primitiveRef.current) {
        primitiveRef.current.destroy();
        primitiveRef.current = null;
      }
      // Explicitly dispose volume texture and colormap LUT from GPU memory
      const gl = getGL();
      if (gl) {
        if (volumeTexRef.current) {
          disposeVolumeTexture(gl, volumeTexRef.current);
          volumeTexRef.current = null;
        }
        if (colormapTexRef.current) {
          gl.deleteTexture(colormapTexRef.current);
          colormapTexRef.current = null;
        }
      }
    };
  }, [viewer, getGL]);

  // ── Update primitive params whenever data/settings change ──
  useEffect(() => {
    const primitive = primitiveRef.current;
    const volumeInfo = volumeTexRef.current;
    const colormapTex = colormapTexRef.current;

    if (!primitive || !volumeInfo || !colormapTex) return;

    primitive.update({
      geoBounds: volumeInfo.geoBounds,
      maxDepth: volumeInfo.maxDepth || maxDepth,
      volumeTexture: volumeInfo.texture,
      colormapTexture: colormapTex,
      depthClip,
      opacity: 0.7,
    });

    // Trigger re-render
    if (viewer) {
      viewer.scene.requestRender();
    }
  }, [allSlices, depthClip, effectiveMin, effectiveMax, interpolator, maxDepth, viewer]);

  // This component renders nothing to the React tree — it's pure WebGL
  return null;
}
