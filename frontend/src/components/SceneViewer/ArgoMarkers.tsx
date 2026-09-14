import { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { useOceanStore } from '../../stores/oceanStore';
import { fetchArgoProfile } from '../../services/api';

/**
 * ArgoMarkers — renders Argo float positions as 3D markers on the scene.
 * Clicking a marker fetches and displays the depth profile.
 */
export default function ArgoMarkers() {
  const argoFloats = useOceanStore((s) => s.argoFloats);
  const modelSlice = useOceanStore((s) => s.modelSlice);
  const setSelectedFloat = useOceanStore((s) => s.setSelectedFloat);
  const setSelectedProfile = useOceanStore((s) => s.setSelectedProfile);
  const setProfileOpen = useOceanStore((s) => s.setProfileOpen);
  const { invalidate } = useThree();

  // Compute scene transform from model slice coordinates
  const transform = useMemo(() => {
    if (!modelSlice) return null;
    const { lats, lons } = modelSlice;
    const latCenter = (lats[0] + lats[lats.length - 1]) / 2;
    const lonCenter = (lons[0] + lons[lons.length - 1]) / 2;
    const latSpan = lats[lats.length - 1] - lats[0];
    const lonSpan = lons[lons.length - 1] - lons[0];
    const scaleFactor = 10 / Math.max(latSpan, lonSpan);
    return { latCenter, lonCenter, scaleFactor };
  }, [modelSlice]);

  const handleClick = useCallback(
    async (float_: typeof argoFloats[0]) => {
      setSelectedFloat(float_);
      setProfileOpen(true);
      try {
        const profile = await fetchArgoProfile(float_.float_id, float_.latest_cycle);
        setSelectedProfile(profile);
      } catch (err) {
        console.error('Failed to fetch Argo profile:', err);
      }
      invalidate();
    },
    [setSelectedFloat, setSelectedProfile, setProfileOpen, invalidate]
  );

  if (!transform || argoFloats.length === 0) return null;

  const { latCenter, lonCenter, scaleFactor } = transform;

  const selectedFloat = useOceanStore((s) => s.selectedFloat);

  return (
    <group>
      {argoFloats.map((float_) => {
        const x = (float_.lon - lonCenter) * scaleFactor;
        const z = -(float_.lat - latCenter) * scaleFactor;
        const isSelected = selectedFloat?.float_id === float_.float_id;

        return (
          <group
            key={float_.float_id}
            position={[x, 0.15, z]}
            onClick={(e) => {
              e.stopPropagation();
              handleClick(float_);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
            }}
          >
            {/* Invisible expanded hit target sphere */}
            <mesh>
              <sphereGeometry args={[0.45, 8, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* Float Pin Head */}
            <mesh>
              <sphereGeometry args={[isSelected ? 0.22 : 0.16, 16, 16]} />
              <meshStandardMaterial
                color={isSelected ? '#4ecdc4' : '#ff6b35'}
                emissive={isSelected ? '#4ecdc4' : '#ff6b35'}
                emissiveIntensity={isSelected ? 0.6 : 0.3}
                metalness={0.3}
                roughness={0.4}
              />
            </mesh>

            {/* Pin stem */}
            <mesh position={[0, -0.15, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
              <meshStandardMaterial color={isSelected ? '#4ecdc4' : '#ff6b35'} />
            </mesh>

            {/* Profiling tether line down to depth */}
            <mesh position={[0, -1.2, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 2.0, 4]} />
              <meshBasicMaterial
                color={isSelected ? '#4ecdc4' : '#ff6b35'}
                transparent
                opacity={0.35}
              />
            </mesh>

            {/* Glow ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <ringGeometry args={[0.18, isSelected ? 0.35 : 0.26, 32]} />
              <meshBasicMaterial
                color={isSelected ? '#4ecdc4' : '#ff6b35'}
                transparent
                opacity={isSelected ? 0.7 : 0.35}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Float ID label */}
            <Billboard position={[0, 0.45, 0]}>
              <Text
                fontSize={0.2}
                color={isSelected ? '#4ecdc4' : '#ffffff'}
                anchorX="center"
                anchorY="bottom"
              >
                {float_.float_id}
              </Text>
            </Billboard>
          </group>
        );
      })}
    </group>
  );
}
