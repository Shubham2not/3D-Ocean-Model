import { useEffect, useState } from 'react';
import SceneViewer from './components/SceneViewer/SceneViewer';
import OceanLeafletMap from './components/LeafletViewer/OceanLeafletMap';
import PointInspectorPanel from './components/Inspector/PointInspectorPanel';
import GoogleApiKeyModal from './components/common/GoogleApiKeyModal';
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
  const viewMode = useOceanStore((s) => s.viewMode);

  useEffect(() => {
    let mounted = true;
    const verifyBackend = async () => {
      try {
        await checkHealth();
      } catch (err) {
        if (!mounted) return;

      }
    };

    verifyBackend();
    const interval = setInterval(verifyBackend, 12000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [showToast]);

  if (!webgl2Supported && viewMode !== 'map2d') {
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

      {viewMode === 'map2d' ? (
        <OceanLeafletMap />
      ) : (
        <SceneViewer />
      )}

      <LayersPanel />

      <FloatProfileCard />

      <PointInspectorPanel />

      <GoogleApiKeyModal />

      <ArgoFullProfileModal />
      <GliderProfileModal />
      <DataSourcesModal
        isOpen={useOceanStore((s) => s.dataSourcesModalOpen)}
        onClose={() => useOceanStore.getState().setDataSourcesModalOpen(false)}
      />

      <LoadingOverlay />
      <ToastNotification />
      <OutreachGuide />
    </div>
  );
}
