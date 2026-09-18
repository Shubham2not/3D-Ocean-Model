export function isWebGL2Available(): boolean {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('webgl2') === '0' ||
        params.get('nowebgl2') === '1' ||
        (window as unknown as { __FORCE_DISABLE_WEBGL2__?: boolean }).__FORCE_DISABLE_WEBGL2__ === true
      ) {
        return false;
      }
      if (!window.WebGL2RenderingContext) {
        return false;
      }
    }
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return !!gl;
  } catch {
    return false;
  }
}

interface WebGL2FallbackProps {
  onRetry?: () => void;
}

export default function WebGL2Fallback({ onRetry }: WebGL2FallbackProps) {
  return (
    <div
      id="webgl2-fallback-notice"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 560,
          width: '100%',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 16,
          padding: '32px 28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.15)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            margin: '0 auto 16px auto',
          }}
        >
          ⚠️
        </div>

        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#f87171',
            margin: '0 0 12px 0',
            letterSpacing: '-0.02em',
          }}
        >
          WebGL2 Hardware Support Required
        </h2>

        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: '#e2e8f0',
            margin: '0 0 18px 0',
          }}
        >
          Please <strong>switch to a browser or device with WebGL2 support</strong> to experience
          the Ocean3D digital twin.
        </p>

        <div
          style={{
            background: 'rgba(2, 6, 23, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 10,
            padding: '16px',
            textAlign: 'left',
            fontSize: 13,
            color: '#94a3b8',
            lineHeight: 1.5,
            marginBottom: 24,
          }}
        >
          <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: 6 }}>
            Why is WebGL2 required?
          </div>
          <div>
            The volumetric ocean renderer uses hardware-accelerated 3D textures (
            <code style={{ color: '#f43f5e' }}>sampler3D</code>) and GPU ray-marching to render 1,000m
            depth columns continuously without layer artifacts. WebGL1 browsers do not support 3D textures.
          </div>
        </div>

        <div
          style={{
            background: 'rgba(56, 189, 248, 0.06)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: 10,
            padding: '14px 16px',
            textAlign: 'left',
            fontSize: 12,
            color: '#cbd5e1',
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: 4 }}>
            Recommended Fixes:
          </div>
          <ul style={{ margin: '0', paddingLeft: 18 }}>
            <li>Switch to modern Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari 15+.</li>
            <li>Ensure <em>"Use hardware acceleration when available"</em> is turned on in browser settings.</li>
            <li>Verify your graphics drivers are up to date.</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {onRetry && (
            <button
              onClick={onRetry}
              id="webgl2-retry-btn"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                border: 'none',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              🔄 Re-check WebGL2
            </button>
          )}
          <button
            onClick={() => {

              const url = new URL(window.location.href);
              url.searchParams.delete('webgl2');
              url.searchParams.delete('nowebgl2');
              window.location.href = url.toString();
            }}
            id="webgl2-reload-btn"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
