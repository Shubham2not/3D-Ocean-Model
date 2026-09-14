import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import DepthSlice from './DepthSlice';
import GridFrame from './GridFrame';
import ArgoMarkers from './ArgoMarkers';

/**
 * SceneViewer — main Three.js canvas wrapping the 3D ocean visualization.
 */
export default function SceneViewer() {
  return (
    <div className="scene-viewer">
      <Canvas
        camera={{ position: [0, 8, 12], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} color="#e8f0ff" />
        <directionalLight position={[-5, 8, -5]} intensity={0.3} color="#8ab4f8" />
        <pointLight position={[0, 5, 0]} intensity={0.2} color="#4ecdc4" />

        {/* Starfield background */}
        <Stars radius={50} depth={40} count={2000} factor={3} saturation={0.2} fade speed={0.5} />

        {/* Scene content */}
        <DepthSlice />
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
    </div>
  );
}
