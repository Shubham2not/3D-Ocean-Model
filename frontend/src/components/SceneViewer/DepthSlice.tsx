import { useRef, useMemo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import chroma from 'chroma-js';
import { useOceanStore } from '../../stores/oceanStore';

/**
 * DepthSlice — renders a single 2D temperature slice as a colored plane
 * in the Three.js scene. The plane is textured using vertex colors derived
 * from the color scale mapped to temperature values.
 */
export default function DepthSlice() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();

  const modelSlice = useOceanStore((s) => s.modelSlice);
  const activePresetId = useOceanStore((s) => s.activePresetId);
  const colorPresets = useOceanStore((s) => s.colorPresets);
  const colorMin = useOceanStore((s) => s.colorMin);
  const colorMax = useOceanStore((s) => s.colorMax);

  // Build the color scale from the active preset
  const colorScale = useMemo(() => {
    const preset = colorPresets.find((p) => p.id === activePresetId);
    const colors = preset?.colors || ['#0000FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF0000'];
    return chroma.scale(colors).mode('lab');
  }, [activePresetId, colorPresets]);

  // Build geometry and vertex colors whenever data or colormap changes
  const { geometry, material } = useMemo(() => {
    if (!modelSlice || modelSlice.data.length === 0) {
      return { geometry: null, material: null };
    }

    const { lats, lons, nlat, nlon, data, min_val, max_val } = modelSlice;

    const effectiveMin = colorMin ?? min_val;
    const effectiveMax = colorMax ?? max_val;
    const range = effectiveMax - effectiveMin || 1;

    // Create a plane geometry with vertices at each grid point
    const geo = new THREE.BufferGeometry();

    // Map lat/lon to scene coordinates
    // Normalize to roughly -5..5 for both axes
    const latCenter = (lats[0] + lats[lats.length - 1]) / 2;
    const lonCenter = (lons[0] + lons[lons.length - 1]) / 2;
    const latSpan = lats[lats.length - 1] - lats[0];
    const lonSpan = lons[lons.length - 1] - lons[0];
    const scaleFactor = 10 / Math.max(latSpan, lonSpan);
    const depthY = -((modelSlice.depth_m || 0) / 2000) * 3.5;

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < nlat; i++) {
      for (let j = 0; j < nlon; j++) {
        const x = (lons[j] - lonCenter) * scaleFactor;
        const z = -(lats[i] - latCenter) * scaleFactor; // Flip so north is up in scene
        const y = depthY; // Slice at its 3D depth level in the ocean column


        positions.push(x, y, z);

        // Color from temperature
        const val = data[i * nlon + j];
        const t = Math.max(0, Math.min(1, (val - effectiveMin) / range));
        const color = colorScale(t).gl(); // [r, g, b, a] in 0–1
        colors.push(color[0], color[1], color[2]);
      }
    }

    // Build triangle indices (two triangles per grid cell)
    for (let i = 0; i < nlat - 1; i++) {
      for (let j = 0; j < nlon - 1; j++) {
        const a = i * nlon + j;
        const b = a + 1;
        const c = a + nlon;
        const d = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      flatShading: false,
      metalness: 0.05,
      roughness: 0.7,
    });

    return { geometry: geo, material: mat };
  }, [modelSlice, colorScale, colorMin, colorMax]);

  useEffect(() => {
    invalidate();
  }, [geometry, invalidate]);

  if (!geometry || !material) return null;

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  );
}
