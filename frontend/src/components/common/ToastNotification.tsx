import { useEffect } from 'react';
import { useOceanStore } from '../../stores/oceanStore';

export default function ToastNotification() {
  const toast = useOceanStore((s) => s.toast);
  const hideToast = useOceanStore((s) => s.hideToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      hideToast();
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;

  const bgColors = {
    error: 'rgba(239, 68, 68, 0.95)',
    warning: 'rgba(245, 158, 11, 0.95)',
    info: 'rgba(59, 130, 246, 0.95)',
    success: 'rgba(16, 185, 129, 0.95)',
  };

  const icons = {
    error: '⚠️',
    warning: '⚡',
    info: 'ℹ️',
    success: '✅',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: bgColors[toast.type || 'info'],
        color: '#ffffff',
        padding: '12px 18px',
        borderRadius: 10,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        maxWidth: 420,
        fontSize: 13,
        fontWeight: 500,
        border: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <span style={{ fontSize: 16 }}>{icons[toast.type || 'info']}</span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      <button
        onClick={hideToast}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.8)',
          fontSize: 16,
          cursor: 'pointer',
          padding: '0 4px',
          lineHeight: 1,
        }}
        title="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}
