import { useEffect, useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useOceanStore } from '../../stores/oceanStore';

// Register Chart.js components
ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * ProfileChart — displays a depth-vs-temperature comparison chart for a selected Argo float.
 * Overlays:
 *   1. "Argo Observed" (observed in-situ profile from the float)
 *   2. "Model" (numerical ocean model profile at the float's exact lat/lon)
 * Depth is plotted on the inverted Y-axis (0m surface at top, deeper at bottom).
 * Temperature is plotted on the X-axis.
 */
export default function ProfileChart() {
  const {
    selectedFloat,
    selectedProfile,
    modelProfile,
    profileOpen,
    setProfileOpen,
    setSelectedFloat,
    setSelectedProfile,
    setModelProfile,
  } = useOceanStore();

  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && profileOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [profileOpen]);

  const handleClose = () => {
    setProfileOpen(false);
    setSelectedFloat(null);
    setSelectedProfile(null);
    setModelProfile(null);
  };

  // Compute temperature difference at surface (0m or shallowest level)
  const surfaceComparison = useMemo(() => {
    if (!selectedProfile || !modelProfile) return null;
    const argoSurface = selectedProfile.levels[0]?.temperature;
    const modelSurface = modelProfile.levels[0]?.temperature;
    if (argoSurface === undefined || modelSurface === undefined) return null;
    const diff = modelSurface - argoSurface;
    return {
      argo: argoSurface.toFixed(2),
      model: modelSurface.toFixed(2),
      diff: (diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)) + ' °C',
    };
  }, [selectedProfile, modelProfile]);

  if (!profileOpen) return null;

  const hasData = Boolean(selectedProfile || modelProfile);

  // Both lines use numerical (x, y) coordinates with x = temp, y = depth_m
  const chartData = hasData
    ? {
        datasets: [
          ...(selectedProfile
            ? [
                {
                  label: 'Argo Observed',
                  data: selectedProfile.levels.map((l) => ({
                    x: Number(l.temperature.toFixed(2)),
                    y: l.depth_m,
                  })),
                  borderColor: '#06b6d4', // Vibrant cyan/teal
                  backgroundColor: 'rgba(6, 182, 212, 0.12)',
                  borderWidth: 2.5,
                  pointBackgroundColor: '#06b6d4',
                  pointBorderColor: '#ffffff',
                  pointBorderWidth: 1.5,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  tension: 0.3,
                  fill: false,
                },
              ]
            : []),
          ...(modelProfile
            ? [
                {
                  label: 'Model',
                  data: modelProfile.levels.map((l) => ({
                    x: Number(l.temperature.toFixed(2)),
                    y: l.depth_m,
                  })),
                  borderColor: '#f59e0b', // Vibrant warm amber
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  borderWidth: 2.5,
                  borderDash: [6, 4], // Dashed line for model prediction distinction
                  pointBackgroundColor: '#f59e0b',
                  pointBorderColor: '#ffffff',
                  pointBorderWidth: 1.5,
                  pointRadius: 5,
                  pointStyle: 'rectRot' as const, // Diamond points for model
                  pointHoverRadius: 7,
                  tension: 0.3,
                  fill: false,
                },
              ]
            : []),
        ],
      }
    : null;

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // Y is depth, sorted top-to-bottom
    animation: {
      duration: 500,
    },
    scales: {
      y: {
        type: 'linear' as const,
        reverse: true, // Inverted: 0m at top, deeper at bottom
        min: 0,
        title: {
          display: true,
          text: 'Depth (m)',
          color: '#93c5fd',
          font: { size: 12, weight: 600 },
        },
        ticks: {
          color: '#94a3b8',
          callback: (value) => `${value}m`,
        },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
      },
      x: {
        type: 'linear' as const,
        title: {
          display: true,
          text: 'Temperature (°C)',
          color: '#93c5fd',
          font: { size: 12, weight: 600 },
        },
        ticks: {
          color: '#94a3b8',
          callback: (value) => `${value}°C`,
        },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#e2e8f0',
          usePointStyle: true,
          padding: 14,
          font: { size: 12, weight: 600 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(6, 182, 212, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
        callbacks: {
          label: (context) => {
            const raw = context.raw as { x: number; y: number };
            return ` ${context.dataset.label}: ${raw.x}°C at ${raw.y}m`;
          },
        },
      },
    },
  };

  return (
    <div className={`profile-overlay ${profileOpen ? 'open' : ''}`} onClick={handleClose}>
      <div
        className="profile-panel"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="profile-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#06b6d4',
                  boxShadow: '0 0 8px #06b6d4',
                }}
              />
              <h3 className="profile-title" style={{ margin: 0 }}>
                Argo Float {selectedFloat?.float_id || '—'}
              </h3>
            </div>
            {selectedProfile && (
              <p className="profile-meta" style={{ marginTop: 4 }}>
                Cycle {selectedProfile.cycle_number} •{' '}
                {selectedProfile.profile_time.split('T')[0]} •{' '}
                {selectedProfile.lat.toFixed(2)}°N, {selectedProfile.lon.toFixed(2)}°E
              </p>
            )}
          </div>
          <button className="profile-close" onClick={handleClose} title="Close panel">
            ✕
          </button>
        </div>

        {/* Model vs Observation Callout */}
        <div
          style={{
            margin: '12px 20px 0',
            padding: '10px 14px',
            background: 'rgba(15, 23, 42, 0.65)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 3,
                  background: '#06b6d4',
                  borderRadius: 2,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                Argo Observed
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 3,
                  background: '#f59e0b',
                  borderRadius: 2,
                  display: 'inline-block',
                  borderTop: '1px dashed #f59e0b',
                }}
              />
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                Model
              </span>
            </div>
          </div>
          {surfaceComparison && (
            <div style={{ fontSize: 11, color: '#cbd5e1' }}>
              Surface ΔT:{' '}
              <strong
                style={{
                  color: surfaceComparison.diff.startsWith('+') ? '#f59e0b' : '#38bdf8',
                }}
              >
                {surfaceComparison.diff}
              </strong>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="profile-chart-container">
          {chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="profile-loading">
              <div className="loading-spinner" />
              <span>Fetching observation & model profiles...</span>
            </div>
          )}
        </div>

        {/* Float Info Details */}
        {selectedFloat && (
          <div className="profile-info">
            <div className="info-row">
              <span className="info-label">WMO Float ID</span>
              <span className="info-value">{selectedFloat.float_id}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Coordinates</span>
              <span className="info-value">
                {selectedFloat.lat.toFixed(2)}°N, {selectedFloat.lon.toFixed(2)}°E
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Deployment Date</span>
              <span className="info-value">{selectedFloat.deploy_date}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <span className="info-value status-active">{selectedFloat.status}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Total Cycles</span>
              <span className="info-value">{selectedFloat.num_cycles}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

