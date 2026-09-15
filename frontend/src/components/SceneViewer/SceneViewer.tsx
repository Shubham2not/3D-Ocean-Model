import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import DepthSliceStack from './DepthSlice';
import GridFrame from './GridFrame';
import ArgoMarkers from './ArgoMarkers';
import ColorbarLegend from './ColorbarLegend';

/**
 * SceneViewer — main Three.js canvas wrapping the 3D ocean visualization.
 *
 * Renders all 7 depth slices as stacked translucent planes, with the
 * user-selected depth highlighted at full opacity.
 * ColorbarLegend is an HTML overlay rendered *outside* the R3F Canvas.
 */
export default function SceneViewer() {
  return (
    <div className="scene-viewer" style={{ position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 8, 12], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.9} color="#e8f0ff" />
        <directionalLight position={[-5, 8, -5]} intensity={0.3} color="#8ab4f8" />
        <pointLight position={[0, 5, 0]} intensity={0.3} color="#4ecdc4" />

        {/* Starfield background */}
        <Stars radius={50} depth={40} count={2000} factor={3} saturation={0.2} fade speed={0.5} />

        {/* All depth slices — stacked translucent + highlighted selection */}
        <DepthSliceStack />
        <GridFrame />
        <ArgoMarkers />

        {/* Controls */}
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={3}
          maxDistance={30}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2.2}
          autoRotate={false}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>

      {/* HTML overlays (outside Canvas) */}
      <ColorbarLegend />
    </div>
  );
}
