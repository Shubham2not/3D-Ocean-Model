import { useEffect, useState } from 'react';
import SceneViewer from './components/SceneViewer/SceneViewer';
import LayersPanel from './components/ControlsPanel/LayersPanel';
import FloatProfileCard from './components/ProfileCard/FloatProfileCard';
import ArgoFullProfileModal from './components/ProfileCard/ArgoFullProfileModal';
import GliderProfileModal from './components/ProfileCard/GliderProfileModal';
import DataSourcesModal from './components/common/DataSourcesModal';
import LoadingOverlay from './components/common/LoadingOverlay';
import ToastNotification from './components/common/ToastNotification';
import OutreachGuide from './components/common/OutreachGuide';
import WebGL2Fallback, { isWebGL2Available } from './components/common/WebGL2Fallback';
import { useOceanStore } from './stores/oceanStore';
import { checkHealth } from './services/api';

export default function App() {
  const [webgl2Supported, setWebgl2Supported] = useState<boolean>(() => isWebGL2Available());
  const showToast = useOceanStore((s) => s.showToast);

  useEffect(() => {
    let mounted = true;
    const verifyBackend = async () => {
      try {
        await checkHealth();
      } catch (err) {
        if (!mounted) return;
        // Backend health check logged silently; offline fallbacks handle gracefully
      }
    };

    verifyBackend();
    const interval = setInterval(verifyBackend, 12000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [showToast]);



  if (!webgl2Supported) {
    return (
      <div className="app-container">
        <WebGL2Fallback onRetry={() => setWebgl2Supported(isWebGL2Available())} />
      </div>
    );
  }

  return (
    <div
      className="app-container"
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#030712',
      }}
    >
      {/* 100% Fullscreen 3D Cesium Ocean Scene */}
      <SceneViewer />

      {/* Floating Top-Left Layers Control Panel */}
      <LayersPanel />

      {/* Floating Top-Right Argo Float Profile Card */}
      <FloatProfileCard />

      {/* Real Data Modals */}
      <ArgoFullProfileModal />
      <GliderProfileModal />
      <DataSourcesModal
        isOpen={useOceanStore((s) => s.dataSourcesModalOpen)}
        onClose={() => useOceanStore.getState().setDataSourcesModalOpen(false)}
      />

      {/* Standard utility overlays */}
      <LoadingOverlay />
      <ToastNotification />
      <OutreachGuide />
    </div>
  );
}
