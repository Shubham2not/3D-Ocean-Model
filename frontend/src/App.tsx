import { useEffect, useState } from 'react';
import SceneViewer from './components/SceneViewer/SceneViewer';
import ControlsPanel from './components/ControlsPanel/ControlsPanel';
import ProfileChart from './components/ProfileChart/ProfileChart';
import { checkHealth } from './services/api';

export default function App() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    let mounted = true;
    const verifyBackend = async () => {
      try {
        const res = await checkHealth();
        if (mounted && res.status === 'ok') {
          setApiStatus('connected');
        } else if (mounted) {
          setApiStatus('error');
        }
      } catch (err) {
        if (mounted) {
          setApiStatus('error');
        }
      }
    };

    verifyBackend();
    const interval = setInterval(verifyBackend, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="app-container">
      <ControlsPanel />
      <main className="main-viewport">
        <SceneViewer />

        {/* Top-right badges container */}
        <div className="viewport-badges" style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 12, zIndex: 10 }}>
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
                : 'Connecting to API...'}
            </span>
          </div>

          {/* Region / Live preview badge */}
          <div className="viewport-badge" style={{ position: 'static' }}>
            <span className="badge-dot" />
            <span>Arabian Sea • Live Preview</span>
          </div>
        </div>
      </main>
      <ProfileChart />
    </div>
  );
}

