import { useState, useEffect } from 'react';
import { fetchDataSources, type DataSourcesResponse } from '../../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function DataSourcesModal({ isOpen, onClose }: Props) {
  const [dataSources, setDataSources] = useState<DataSourcesResponse | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDataSources().then(setDataSources).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(3, 7, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '85vh',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          overflowY: 'auto',
          padding: 24,
          color: '#f8fafc',
          fontFamily: "'Inter', sans-serif",
          animation: 'slideUpFade 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🌐</span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#ffffff' }}>
                Real-World Oceanographic Data Sources
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
              INCOIS & Global Marine Observation Portals (SIH 26067)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#94a3b8',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        {dataSources && (
          <div
            style={{
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Current Active Engine
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
                {dataSources.active_model_source}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: dataSources.is_real_data ? '#10b981' : '#f59e0b',
                color: '#0f172a',
                padding: '4px 10px',
                borderRadius: 20,
              }}
            >
              {dataSources.is_real_data ? '✓ Real NetCDF Active' : '⚡ Synthetic Fallback'}
            </span>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.8px' }}>
            a. Numerical Ocean Model Outputs
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dataSources?.links.numerical_ocean_models.map((item, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13, color: '#f1f5f9' }}>{item.name}</strong>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 12,
                      color: '#38bdf8',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    Open Portal ↗
                  </a>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{item.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.8px' }}>
            b. Argo Global Observational Data
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dataSources?.links.argo_global_data.map((item, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13, color: '#f1f5f9' }}>{item.name}</strong>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 12,
                      color: '#38bdf8',
                      textDecoration: 'none',
                    }}
                  >
                    {item.url.startsWith('ftp://') ? 'FTP Server ↗' : 'HTTP Access ↗'}
                  </a>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{item.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.8px' }}>
            c. Deep-Sea Glider Data
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dataSources?.links.glider_data.map((item, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13, color: '#f1f5f9' }}>{item.name}</strong>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 12,
                      color: '#38bdf8',
                      textDecoration: 'none',
                    }}
                  >
                    FTP Server ↗
                  </a>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{item.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.8px' }}>
            d. Collection of In-Situ Data
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dataSources?.links.in_situ_collections.map((item, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13, color: '#f1f5f9' }}>{item.name}</strong>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 12,
                      color: '#38bdf8',
                      textDecoration: 'none',
                    }}
                  >
                    Visit Portal ↗
                  </a>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{item.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
