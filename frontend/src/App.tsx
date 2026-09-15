import { useEffect, useState } from 'react';
import SceneViewer from './components/SceneViewer/SceneViewer';
import ControlsPanel from './components/ControlsPanel/ControlsPanel';
import ProfileChart from './components/ProfileChart/ProfileChart';
import LoadingOverlay from './components/common/LoadingOverlay';
import ToastNotification from './components/common/ToastNotification';
import OutreachGuide from './components/common/OutreachGuide';
import { useOceanStore } from './stores/oceanStore';
import { checkHealth } from './services/api';

export default function App() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const outreachMode = useOceanStore((s) => s.outreachMode);
  const setOutreachMode = useOceanStore((s) => s.setOutreachMode);
  const sidebarCollapsed = useOceanStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useOceanStore((s) => s.setSidebarCollapsed);
  const showToast = useOceanStore((s) => s.showToast);

  useEffect(() => {
    let mounted = true;
    const verifyBackend = async () => {
      try {
        const res = await checkHealth();
        if (mounted && res.status === 'ok') {
          setApiStatus('connected');
        } else if (mounted) {
          setApiStatus('error');
          showToast('Backend connection check returned an unexpected status.', 'warning');
        }
      } catch (err) {
        if (mounted) {
          setApiStatus('error');
          showToast('Cannot connect to FastAPI backend at localhost:8000. Ensure server is running.', 'error');
        }
      }
    };

    verifyBackend();
    const interval = setInterval(verifyBackend, 12000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [showToast]);

  return (
    <div className="app-container">
      <ControlsPanel />

      <main className="main-viewport" style={{ position: 'relative' }}>
        {/* Floating Expand Button when sidebar is collapsed */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              zIndex: 30,
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              backdropFilter: 'blur(12px)',
              color: '#38bdf8',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              transition: 'all 0.2s ease',
            }}
            title="Expand Controls Panel"
          >
            <span>▶</span>
            <span>Controls</span>
          </button>
        )}

        <SceneViewer />

        {/* Top-right badges & Outreach Mode container */}
        <div
          className="viewport-badges"
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            zIndex: 30,
          }}
        >
          {/* Outreach Mode Toggle Button */}
          <button
            id="outreach-mode-toggle"
            onClick={() => setOutreachMode(!outreachMode)}
            style={{
              background: outreachMode
                ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)'
                : 'rgba(15, 23, 42, 0.75)',
              border: outreachMode
                ? '1px solid #38bdf8'
                : '1px solid rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(12px)',
              color: outreachMode ? '#38bdf8' : '#e2e8f0',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: outreachMode
                ? '0 0 15px rgba(56, 189, 248, 0.4)'
                : 'none',
              transition: 'all 0.2s ease',
            }}
            title="Toggle Guided Outreach Mode for non-technical judges"
          >
            <span>🎓</span>
            <span>Outreach Mode</span>
            <span
              style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 10,
                background: outreachMode ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)',
                color: outreachMode ? '#0f172a' : '#94a3b8',
                fontWeight: 700,
              }}
            >
              {outreachMode ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* API Health Status Badge */}
          <div className="viewport-badge" style={{ position: 'static' }}>
            <span
              className="badge-dot"
              style={{
                background:
                  apiStatus === 'connected'
                    ? 'var(--accent-green)'
                    : apiStatus === 'error'
                    ? 'var(--accent-orange)'
                    : '#eab308',
                boxShadow:
                  apiStatus === 'connected'
                    ? '0 0 8px var(--accent-green)'
                    : apiStatus === 'error'
                    ? '0 0 8px var(--accent-orange)'
                    : '0 0 8px #eab308',
              }}
            />
            <span id="api-status" style={{ fontWeight: 600 }}>
              {apiStatus === 'connected'
                ? 'API connected'
                : apiStatus === 'error'
                ? 'API offline'
                : 'Connecting...'}
            </span>
          </div>

          {/* Region Badge */}
          <div className="viewport-badge" style={{ position: 'static' }}>
            <span className="badge-dot" />
            <span>Arabian Sea • Live Twin</span>
          </div>
        </div>
      </main>

      <ProfileChart />
      <LoadingOverlay />
      <ToastNotification />
      <OutreachGuide />
    </div>
  );
}


