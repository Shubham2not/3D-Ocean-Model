import { useMemo, useEffect } from 'react';
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
import { fetchArgoProfile } from '../../services/api';

// Register ChartJS elements
ChartJS.register(LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/**
 * FloatProfileCard — Top-right floating glassmorphic card matching the reference image.
 *
 * Shows:
 * - Header: Argo icon + "Argo Float #6903723" + close 'x'
 * - Metrics: Position, Depth (m), Temperature (°C), Salinity (PSU)
 * - "Profile" heading
 * - Inverted Depth vs Temperature Line Chart with dots
 * - "View Full Profile" button
 */
export default function FloatProfileCard() {
  const selectedFloat = useOceanStore((s) => s.selectedFloat);
  const selectedProfile = useOceanStore((s) => s.selectedProfile);
  const setSelectedProfile = useOceanStore((s) => s.setSelectedProfile);
  const profileOpen = useOceanStore((s) => s.profileOpen);
  const setProfileOpen = useOceanStore((s) => s.setProfileOpen);
  const setFullProfileModalOpen = useOceanStore((s) => s.setFullProfileModalOpen);
  const showToast = useOceanStore((s) => s.showToast);

  const floatId = selectedFloat?.float_id ?? '6903723';
  const latStr = selectedFloat ? `${selectedFloat.lat.toFixed(1)}°N` : '12.4°N';
  const lonStr = selectedFloat ? `${selectedFloat.lon.toFixed(1)}°E` : '76.8°E';

  // Load real Argo GDAC profile if not yet loaded
  useEffect(() => {
    let cancelled = false;
    fetchArgoProfile(floatId, 48)
      .then((p) => {
        if (!cancelled && p && p.levels) {
          setSelectedProfile(p);
        }
      })
      .catch((err) => {
        console.warn('Argo profile fetch fallback:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [floatId, setSelectedProfile]);

  if (!profileOpen) return null;

  // Sample or active profile data
  const profilePoints = useMemo(() => {
    if (selectedProfile && selectedProfile.levels.length > 0) {
      return selectedProfile.levels.map((lvl) => ({
        x: Number(lvl.temperature.toFixed(1)),
        y: lvl.depth_m,
      }));
    }
    // Default matching reference image curve
    return [
      { x: 25.4, y: 0 },
      { x: 24.5, y: 80 },
      { x: 22.8, y: 150 },
      { x: 20.6, y: 240 },
      { x: 18.0, y: 350 },
      { x: 15.5, y: 500 },
      { x: 13.4, y: 650 },
      { x: 11.2, y: 800 },
      { x: 9.5, y: 920 },
      { x: 8.4, y: 1000 },
    ];
  }, [selectedProfile]);

  const chartData = {
    datasets: [
      {
        label: 'Temperature',
        data: profilePoints,
        borderColor: '#38bdf8',
        backgroundColor: '#38bdf8',
        borderWidth: 2,
        pointBackgroundColor: '#38bdf8',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 3.5,
        pointHoverRadius: 5.5,
        tension: 0.35,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // Inverted Y-axis is depth
    scales: {
      y: {
        type: 'linear' as const,
        reverse: true, // 0 at top, 1000 at bottom
        min: 0,
        max: 1000,
        ticks: {
          stepSize: 200,
          color: '#94a3b8',
          font: { size: 10 },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.06)',
        },
        title: {
          display: true,
          text: 'Depth (m)',
          color: '#94a3b8',
          font: { size: 11, weight: 500 },
        },
      },
      x: {
        type: 'linear' as const,
        min: 5,
        max: 30,
        ticks: {
          stepSize: 5,
          color: '#94a3b8',
          font: { size: 10 },
          callback: (val) => `${val}`,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.06)',
        },
        title: {
          display: true,
          text: 'Temperature (°C)',
          color: '#94a3b8',
          font: { size: 11, weight: 500 },
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: '#94a3b8',
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          font: { size: 10 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        borderWidth: 1,
        padding: 8,
        callbacks: {
          label: (ctx) => {
            const pt = ctx.raw as { x: number; y: number };
            return ` ${pt.x}°C at ${pt.y}m`;
          },
        },
      },
    },
  };

  return (
    <div
      id="argo-profile-card"
      style={{
        position: 'absolute',
        top: 24,
        right: 24,
        width: 300,
        background: 'rgba(10, 18, 36, 0.82)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.22)',
        borderRadius: 14,
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65)',
        padding: '16px 18px 14px',
        zIndex: 30,
        color: '#f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        animation: 'fadeSlideIn 0.35s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(2, 132, 199, 0.6)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
              <circle cx="12" cy="12" r="8" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', letterSpacing: '0.2px' }}>
            Argo Float #{floatId}
          </span>
        </div>

        <button
          onClick={() => setProfileOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 16,
            padding: '2px 6px',
            borderRadius: 4,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f8fafc')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          title="Close profile panel"
        >
          ✕
        </button>
      </div>

      {/* Key-Value Metrics List */}
      {(() => {
        const level1000 = selectedProfile?.levels?.find((l) => Math.abs(l.depth_m - 1000) <= 50) ?? selectedProfile?.levels?.[selectedProfile.levels.length - 1];
        const tempVal = level1000 ? level1000.temperature.toFixed(1) : '12.6';
        const salVal = level1000 ? level1000.salinity.toFixed(1) : '34.8';

        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: 13,
              paddingTop: 2,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Position</span>
              <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{latStr}, {lonStr}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Depth (m)</span>
              <span style={{ color: '#f1f5f9', fontWeight: 500 }}>1000</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Temperature (°C)</span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>{tempVal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Salinity (PSU)</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>{salVal}</span>
            </div>
          </div>
        );
      })()}

      {/* Section Divider & Title */}
      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>
          Profile
        </div>

        {/* Chart Container */}
        <div style={{ height: 180, width: '100%' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Button: View Full Profile */}
      <button
        id="view-full-profile-btn"
        onClick={() => {
          setFullProfileModalOpen(true);
          showToast(`Displaying full 0–2000m CTD profile for Float #${floatId} (Ifremer GDAC).`, 'success');
        }}
        style={{
          background: 'linear-gradient(180deg, rgba(14, 34, 61, 0.9) 0%, rgba(10, 22, 42, 0.95) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: 8,
          color: '#e2e8f0',
          padding: '8px 14px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          width: '100%',
          textAlign: 'center',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#38bdf8';
          e.currentTarget.style.color = '#ffffff';
          e.currentTarget.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
          e.currentTarget.style.color = '#e2e8f0';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.3)';
        }}
      >
        View Full Profile
      </button>
    </div>
  );
}
