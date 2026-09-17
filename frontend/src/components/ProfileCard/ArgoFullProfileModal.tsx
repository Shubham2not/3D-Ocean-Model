import { useState } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useOceanStore } from '../../stores/oceanStore';

ChartJS.register(LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function ArgoFullProfileModal() {
  const fullProfileModalOpen = useOceanStore((s) => s.fullProfileModalOpen);
  const setFullProfileModalOpen = useOceanStore((s) => s.setFullProfileModalOpen);
  const selectedFloat = useOceanStore((s) => s.selectedFloat);
  const selectedProfile = useOceanStore((s) => s.selectedProfile);
  const [activeTab, setActiveTab] = useState<'temp' | 'sal' | 'table'>('temp');

  if (!fullProfileModalOpen) return null;

  const floatId = selectedFloat?.float_id ?? '6903723';
  const cycle = selectedProfile?.cycle_number ?? 48;
  const levels = selectedProfile?.levels ?? [];

  const tempChartData = {
    datasets: [
      {
        label: 'In-Situ Temperature (°C)',
        data: levels.map((l) => ({ x: Number(l.temperature.toFixed(2)), y: l.depth_m })),
        borderColor: '#38bdf8',
        backgroundColor: '#38bdf8',
        borderWidth: 2.5,
        pointRadius: 3,
        tension: 0.25,
      },
    ],
  };

  const salChartData = {
    datasets: [
      {
        label: 'In-Situ Salinity (PSU)',
        data: levels.map((l) => ({ x: Number(l.salinity.toFixed(2)), y: l.depth_m })),
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        borderWidth: 2.5,
        pointRadius: 3,
        tension: 0.25,
      },
    ],
  };

  const chartOptions = (xTitle: string, xMin: number, xMax: number): ChartOptions<'line'> => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    scales: {
      y: {
        type: 'linear' as const,
        reverse: true,
        min: 0,
        max: 2000,
        ticks: { stepSize: 250, color: '#94a3b8', font: { size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        title: { display: true, text: 'Depth (dbar / m)', color: '#94a3b8', font: { size: 11, weight: 600 } },
      },
      x: {
        type: 'linear' as const,
        min: xMin,
        max: xMax,
        ticks: { color: '#94a3b8', font: { size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        title: { display: true, text: xTitle, color: '#94a3b8', font: { size: 11, weight: 600 } },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { color: '#e2e8f0', font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(56, 189, 248, 0.4)',
        borderWidth: 1,
        padding: 8,
      },
    },
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(3, 7, 18, 0.78)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={() => setFullProfileModalOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 760,
          maxHeight: '90vh',
          background: 'rgba(10, 18, 36, 0.96)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
          overflowY: 'auto',
          padding: 24,
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          animation: 'fadeSlideIn 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="8" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#ffffff' }}>
                Argo Float #{floatId} — Full CTD Profile (Cycle {cycle})
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
              Real NetCDF profile from Coriolis / Ifremer Global Data Assembly Centre (GDAC)
            </p>
          </div>
          <button
            onClick={() => setFullProfileModalOpen(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: 6,
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 16,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Source Citation Banner */}
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
          }}
        >
          <div>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>Data Source: </span>
            <span style={{ color: '#cbd5e1' }}>Ifremer Argo GDAC (data-argo.ifremer.fr)</span>
          </div>
          <a
            href="https://data-argo.ifremer.fr/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#38bdf8',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 11,
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: 4,
              padding: '3px 8px',
              background: 'rgba(56, 189, 248, 0.1)',
            }}
          >
            Visit GDAC Portal ↗
          </a>
        </div>

        {/* Float metadata pill row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
            fontSize: 12,
          }}
        >
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8 }}>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>Latitude / Longitude</div>
            <div style={{ color: '#ffffff', fontWeight: 600, marginTop: 2 }}>
              {selectedFloat ? `${selectedFloat.lat.toFixed(2)}°N, ${selectedFloat.lon.toFixed(2)}°E` : '12.40°N, 76.80°E'}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8 }}>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>Max Profile Depth</div>
            <div style={{ color: '#38bdf8', fontWeight: 600, marginTop: 2 }}>2,000 dbar</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8 }}>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>Observed Levels</div>
            <div style={{ color: '#ffffff', fontWeight: 600, marginTop: 2 }}>{levels.length} Vertical Levels</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8 }}>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>Status</div>
            <div style={{ color: '#10b981', fontWeight: 600, marginTop: 2 }}>ACTIVE (Operational)</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 8 }}>
          <button
            onClick={() => setActiveTab('temp')}
            style={{
              background: activeTab === 'temp' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              border: activeTab === 'temp' ? '1px solid #38bdf8' : '1px solid transparent',
              color: activeTab === 'temp' ? '#38bdf8' : '#94a3b8',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Temperature Profile (0–2000m)
          </button>
          <button
            onClick={() => setActiveTab('sal')}
            style={{
              background: activeTab === 'sal' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              border: activeTab === 'sal' ? '1px solid #10b981' : '1px solid transparent',
              color: activeTab === 'sal' ? '#10b981' : '#94a3b8',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Salinity Profile (0–2000m)
          </button>
          <button
            onClick={() => setActiveTab('table')}
            style={{
              background: activeTab === 'table' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: activeTab === 'table' ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
              color: activeTab === 'table' ? '#ffffff' : '#94a3b8',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Data Table
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ height: 320, width: '100%', overflowY: activeTab === 'table' ? 'auto' : 'hidden' }}>
          {activeTab === 'temp' && <Line data={tempChartData} options={chartOptions('Temperature (°C)', 2, 32)} />}
          {activeTab === 'sal' && <Line data={salChartData} options={chartOptions('Salinity (PSU)', 34, 37)} />}
          {activeTab === 'table' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8' }}>
                  <th style={{ padding: '8px 12px' }}>Depth (m)</th>
                  <th style={{ padding: '8px 12px' }}>Pressure (dbar)</th>
                  <th style={{ padding: '8px 12px' }}>Temperature (°C)</th>
                  <th style={{ padding: '8px 12px' }}>Salinity (PSU)</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((lvl, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '6px 12px', color: '#cbd5e1', fontWeight: 600 }}>{lvl.depth_m}</td>
                    <td style={{ padding: '6px 12px', color: '#94a3b8' }}>{lvl.pressure_dbar.toFixed(1)}</td>
                    <td style={{ padding: '6px 12px', color: '#38bdf8', fontWeight: 600 }}>{lvl.temperature.toFixed(2)}</td>
                    <td style={{ padding: '6px 12px', color: '#10b981', fontWeight: 600 }}>{lvl.salinity.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => setFullProfileModalOpen(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 8,
              color: '#e2e8f0',
              padding: '8px 18px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
