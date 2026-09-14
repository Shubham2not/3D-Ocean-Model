import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useOceanStore } from '../../stores/oceanStore';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * ProfileChart — displays a depth-vs-temperature chart for a selected Argo float.
 * Shown as a slide-in panel when a float marker is clicked.
 */
export default function ProfileChart() {
  const {
    selectedFloat,
    selectedProfile,
    profileOpen,
    setProfileOpen,
    setSelectedFloat,
    setSelectedProfile,
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
  };

  if (!profileOpen) return null;

  const chartData = selectedProfile
    ? {
        labels: selectedProfile.levels.map((l) => `${l.depth_m}m`),
        datasets: [
          {
            label: 'Temperature (°C)',
            data: selectedProfile.levels.map((l) => l.temperature),
            borderColor: '#4ecdc4',
            backgroundColor: 'rgba(78, 205, 196, 0.1)',
            borderWidth: 2,
            pointBackgroundColor: '#4ecdc4',
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Salinity (PSU)',
            data: selectedProfile.levels.map((l) => l.salinity),
            borderColor: '#ff6b35',
            backgroundColor: 'rgba(255, 107, 53, 0.05)',
            borderWidth: 2,
            pointBackgroundColor: '#ff6b35',
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.4,
            fill: false,
            yAxisID: 'y1',
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // Depth on Y axis (inverted)
    scales: {
      y: {
        reverse: true,
        title: {
          display: true,
          text: 'Depth (m)',
          color: '#8ab4f8',
          font: { size: 12 },
        },
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(255,255,255,0.06)' },
      },
      x: {
        title: {
          display: true,
          text: 'Temperature (°C)',
          color: '#4ecdc4',
          font: { size: 12 },
        },
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(255,255,255,0.06)' },
      },
      y1: {
        display: false, // Hidden axis for salinity
      },
    },
    plugins: {
      legend: {
        labels: { color: '#d1d5db', usePointStyle: true, padding: 16 },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#d1d5db',
        borderColor: 'rgba(78, 205, 196, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
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
            <h3 className="profile-title">
              Argo Float {selectedFloat?.float_id || '—'}
            </h3>
            {selectedProfile && (
              <p className="profile-meta">
                Cycle {selectedProfile.cycle_number} •{' '}
                {selectedProfile.profile_time.split('T')[0]} •{' '}
                {selectedProfile.lat.toFixed(2)}°N, {selectedProfile.lon.toFixed(2)}°E
              </p>
            )}
          </div>
          <button className="profile-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Chart */}
        <div className="profile-chart-container">
          {chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="profile-loading">
              <div className="loading-spinner" />
              <span>Loading profile data...</span>
            </div>
          )}
        </div>

        {/* Float Info */}
        {selectedFloat && (
          <div className="profile-info">
            <div className="info-row">
              <span className="info-label">WMO ID</span>
              <span className="info-value">{selectedFloat.float_id}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Position</span>
              <span className="info-value">
                {selectedFloat.lat.toFixed(2)}°N, {selectedFloat.lon.toFixed(2)}°E
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Deployed</span>
              <span className="info-value">{selectedFloat.deploy_date}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <span className="info-value status-active">{selectedFloat.status}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Cycles</span>
              <span className="info-value">{selectedFloat.num_cycles}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
