import { useOceanStore } from '../../stores/oceanStore';

export default function LoadingOverlay() {
  const isLoading = useOceanStore((s) => s.isLoading);
  const isUpdating = useOceanStore((s) => s.isUpdating);

  return (
    <>
      {/* Full-screen initial loading screen */}
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'radial-gradient(ellipse at center, #0d1b2a 0%, #030712 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f8fafc',
            fontFamily: "'Inter', sans-serif",
            transition: 'opacity 0.5s ease',
          }}
        >
          {/* Pulsing Ocean Icon */}
          <div
            style={{
              position: 'relative',
              width: 80,
              height: 80,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid rgba(6, 182, 212, 0.3)',
                animation: 'pulseRing 2s infinite',
              }}
            />
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}
            >
              🌊
            </div>
          </div>

          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.5px',
              margin: '0 0 8px',
              background: 'linear-gradient(135deg, #e2e8f0 0%, #38bdf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Ocean3D Digital Twin
          </h2>

          <p
            style={{
              fontSize: 13,
              color: '#94a3b8',
              margin: '0 0 28px',
              letterSpacing: '0.5px',
            }}
          >
            INCOIS Arabian Sea 3D Circulation & In-Situ Float Visualizer
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              color: '#38bdf8',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                border: '2px solid rgba(56, 189, 248, 0.3)',
                borderTopColor: '#38bdf8',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span>Loading depth layers & instrument floats...</span>
          </div>
        </div>
      )}

      {/* Subtle update pill when depth or time changes */}
      {!isLoading && isUpdating && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            backdropFilter: 'blur(12px)',
            borderRadius: 24,
            padding: '6px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            color: '#38bdf8',
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            pointerEvents: 'none',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              border: '2px solid rgba(56, 189, 248, 0.3)',
              borderTopColor: '#38bdf8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span>Updating depth slice & time step...</span>
        </div>
      )}
    </>
  );
}
