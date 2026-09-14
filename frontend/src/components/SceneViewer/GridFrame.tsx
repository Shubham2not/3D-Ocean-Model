import { useMemo } from 'react';
import * as THREE from 'three';
import { useOceanStore } from '../../stores/oceanStore';
import { Text } from '@react-three/drei';

/**
 * GridFrame — renders axis labels (lat/lon) and a wireframe box
 * to give spatial context to the 3D scene.
 */
export default function GridFrame() {
  const modelSlice = useOceanStore((s) => s.modelSlice);

  const frameData = useMemo(() => {
    if (!modelSlice) return null;

    const { lats, lons } = modelSlice;
    const latCenter = (lats[0] + lats[lats.length - 1]) / 2;
    const lonCenter = (lons[0] + lons[lons.length - 1]) / 2;
    const latSpan = lats[lats.length - 1] - lats[0];
    const lonSpan = lons[lons.length - 1] - lons[0];
    const scaleFactor = 10 / Math.max(latSpan, lonSpan);

    const halfX = (lonSpan / 2) * scaleFactor;
    const halfZ = (latSpan / 2) * scaleFactor;

    return { latCenter, lonCenter, halfX, halfZ, scaleFactor, lats, lons };
  }, [modelSlice]);

  if (!frameData) return null;

  const { halfX, halfZ, scaleFactor, lats, lons, latCenter, lonCenter } = frameData;

  const maxDepthY = -3.5;

  // Surface rectangle
  const surfacePoints = [
    new THREE.Vector3(-halfX, 0, -halfZ),
    new THREE.Vector3(halfX, 0, -halfZ),
    new THREE.Vector3(halfX, 0, halfZ),
    new THREE.Vector3(-halfX, 0, halfZ),
    new THREE.Vector3(-halfX, 0, -halfZ),
  ];

  // Ocean floor rectangle (at max depth)
  const floorPoints = [
    new THREE.Vector3(-halfX, maxDepthY, -halfZ),
    new THREE.Vector3(halfX, maxDepthY, -halfZ),
    new THREE.Vector3(halfX, maxDepthY, halfZ),
    new THREE.Vector3(-halfX, maxDepthY, halfZ),
    new THREE.Vector3(-halfX, maxDepthY, -halfZ),
  ];

  // Four vertical corner pillars
  const pillar1 = [new THREE.Vector3(-halfX, 0, -halfZ), new THREE.Vector3(-halfX, maxDepthY, -halfZ)];
  const pillar2 = [new THREE.Vector3(halfX, 0, -halfZ), new THREE.Vector3(halfX, maxDepthY, -halfZ)];
  const pillar3 = [new THREE.Vector3(halfX, 0, halfZ), new THREE.Vector3(halfX, maxDepthY, halfZ)];
  const pillar4 = [new THREE.Vector3(-halfX, 0, halfZ), new THREE.Vector3(-halfX, maxDepthY, halfZ)];

  // Depth ticks on front-left pillar
  const depthTicks = [
    { label: '0m', y: 0 },
    { label: '500m', y: -0.875 },
    { label: '1000m', y: -1.75 },
    { label: '1500m', y: -2.625 },
    { label: '2000m', y: -3.5 },
  ];

  // Latitude tick labels (every 5°)
  const latLabels = lats.filter((_: number, i: number) => i % 10 === 0);
  // Longitude tick labels (every 5°)
  const lonLabels = lons.filter((_: number, i: number) => i % 10 === 0);

  return (
    <group>
      {/* Surface bounding rectangle */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(surfacePoints.flatMap((p) => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#4ecdc4" linewidth={2} transparent opacity={0.7} />
      </line>

      {/* Ocean floor bounding rectangle */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(floorPoints.flatMap((p) => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#2d5282" linewidth={1.5} transparent opacity={0.5} />
      </line>

      {/* 4 Corner Vertical Pillars */}
      {[pillar1, pillar2, pillar3, pillar4].map((pts, idx) => (
        <line key={`pillar-${idx}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z])), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#3b82f6" linewidth={1} transparent opacity={0.35} />
        </line>
      ))}

      {/* Depth Axis labels along front-left pillar */}
      {depthTicks.map((tick) => (
        <Text
          key={`depth-${tick.label}`}
          position={[-halfX - 0.4, tick.y, halfZ]}
          fontSize={0.24}
          color="#38bdf8"
          anchorX="right"
          anchorY="middle"
        >
          {tick.label}
        </Text>
      ))}

      {/* Latitude labels along left edge */}
      {latLabels.map((lat: number) => (
        <Text
          key={`lat-${lat}`}
          position={[
            -halfX - 0.6,
            0,
            -(lat - latCenter) * scaleFactor,
          ]}
          fontSize={0.28}
          color="#8ab4f8"
          anchorX="right"
          anchorY="middle"
        >
          {lat.toFixed(0)}°N
        </Text>
      ))}

      {/* Longitude labels along bottom edge */}
      {lonLabels.map((lon: number) => (
        <Text
          key={`lon-${lon}`}
          position={[
            (lon - lonCenter) * scaleFactor,
            0,
            halfZ + 0.6,
          ]}
          fontSize={0.28}
          color="#8ab4f8"
          anchorX="center"
          anchorY="top"
        >
          {lon.toFixed(0)}°E
        </Text>
      ))}

      {/* Ocean floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, maxDepthY, 0]}>
        <planeGeometry args={[halfX * 2 + 0.5, halfZ * 2 + 0.5]} />
        <meshStandardMaterial
          color="#050d1a"
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
