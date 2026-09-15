import { useState } from 'react';
import { useOceanStore } from '../../stores/oceanStore';

interface TourStep {
  title: string;
  badge: string;
  explanation: string;
  actionHint?: string;
  action?: () => void;
}

export default function OutreachGuide() {
  const outreachMode = useOceanStore((s) => s.outreachMode);
  const setOutreachMode = useOceanStore((s) => s.setOutreachMode);
  const setSelectedDepth = useOceanStore((s) => s.setSelectedDepth);
  const setDepthIndex = useOceanStore((s) => s.setDepthIndex);
  const depths = useOceanStore((s) => s.depths);

  const [stepIndex, setStepIndex] = useState(0);

  const steps: TourStep[] = [
    {
      title: '3D Ocean Layers (Digital Twin)',
      badge: 'Scientific Overview',
      explanation:
        'You are viewing a 3D simulation of the Arabian Sea sliced into discrete depth levels from the surface down to 1000 meters. The color gradient reveals how ocean temperature drops as sunlight fades with depth.',
      actionHint: 'View surface (0m)',
      action: () => {
        setSelectedDepth(0);
        setDepthIndex(0);
      },
    },
    {
      title: 'The Thermocline Barrier',
      badge: 'Ocean Physics',
      explanation:
        'Notice the drastic drop in temperature between 50m and 200m depth. This sharp boundary is the ocean "thermocline". It separates warm, sunlit surface waters from cold, nutrient-rich deep water and dictates monsoon circulation.',
      actionHint: 'Slice at 100m depth',
      action: () => {
        const d100 = depths.findIndex((d) => d.depth_m === 100);
        if (d100 !== -1) {
          setSelectedDepth(100);
          setDepthIndex(d100);
        }
      },
    },
    {
      title: 'Argo Robotic Profiling Floats',
      badge: 'In-Situ Observation',
      explanation:
        'The glowing pins are real-world autonomous robotic Argo floats. These automated instruments drift with ocean currents, dive to 2,000 meters, and resurface every 10 days to transmit real-time data back via satellite.',
      actionHint: 'Look for glowing pins above surface',
    },
    {
      title: 'Digital Twin vs In-Situ Truth',
      badge: 'SIH Brief Section 14',
      explanation:
        'Click on any floating pin marker to open the depth comparison chart! The chart overlays numerical simulation forecasts ("Model") against direct physical sensor readings ("Argo Observed") at that precise coordinate.',
      actionHint: 'Click any float marker in 3D scene',
    },
  ];

  if (!outreachMode) return null;

  const currentStep = steps[stepIndex];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: 360,
        zIndex: 50,
        maxWidth: 440,
        background: 'rgba(15, 23, 42, 0.92)',
        border: '1px solid rgba(56, 189, 248, 0.4)',
        backdropFilter: 'blur(16px)',
        borderRadius: 12,
        padding: '18px 20px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        color: '#f8fafc',
        fontFamily: "'Inter', sans-serif",
        animation: 'slideUpFade 0.3s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🎓</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.12)',
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            {currentStep.badge}
          </span>
        </div>
        <button
          onClick={() => setOutreachMode(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: 15,
            cursor: 'pointer',
            padding: 2,
          }}
          title="Exit Outreach Mode"
        >
          ✕
        </button>
      </div>

      {/* Title */}
      <h4
        style={{
          margin: '0 0 8px',
          fontSize: 15,
          fontWeight: 700,
          color: '#ffffff',
        }}
      >
        {currentStep.title}
      </h4>

      {/* Description */}
      <p
        style={{
          margin: '0 0 14px',
          fontSize: 13,
          lineHeight: 1.5,
          color: '#cbd5e1',
        }}
      >
        {currentStep.explanation}
      </p>

      {/* Action button if present */}
      {currentStep.action && (
        <button
          onClick={currentStep.action}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 14,
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 6,
            padding: '4px 10px',
            color: '#38bdf8',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span>🎯</span> {currentStep.actionHint}
        </button>
      )}

      {/* Footer Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: 12,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: '#94a3b8',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Step {stepIndex + 1} of {steps.length}
        </span>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              padding: '4px 12px',
              color: stepIndex === 0 ? '#64748b' : '#f8fafc',
              fontSize: 12,
              cursor: stepIndex === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>
          <button
            onClick={() => {
              if (stepIndex < steps.length - 1) {
                setStepIndex((i) => i + 1);
              } else {
                setOutreachMode(false);
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              border: 'none',
              borderRadius: 6,
              padding: '4px 14px',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
