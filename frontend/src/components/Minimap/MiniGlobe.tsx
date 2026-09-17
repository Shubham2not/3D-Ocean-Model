import { useRef, useEffect } from 'react';

/**
 * MiniGlobe — Floating bottom-right mini-globe widget.
 * Renders an orthographic globe with continents, dark oceans,
 * atmospheric rim lighting, and a highlighted bounding box
 * indicating the current focus region (Arabian Sea / Indian Ocean).
 */
export default function MiniGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | undefined;

    // Load world map image or draw procedurally
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&w=600&q=80';


    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const radius = width * 0.44;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Save for globe clipping
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // Deep ocean base
      const oceanGrad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
      oceanGrad.addColorStop(0, '#103058');
      oceanGrad.addColorStop(0.6, '#081a36');
      oceanGrad.addColorStop(1, '#030a18');
      ctx.fillStyle = oceanGrad;
      ctx.fill();

      // Draw Earth continents texture if loaded
      if (img.complete && img.naturalWidth > 0) {
        ctx.globalAlpha = 0.85;
        ctx.drawImage(img, cx - radius * 1.5, cy - radius * 1.2, radius * 3.0, radius * 2.4);
        ctx.globalAlpha = 1.0;
      } else {
        // Procedural continents fallback
        ctx.fillStyle = '#2d5a3f';
        ctx.beginPath();
        ctx.arc(cx - radius * 0.45, cy + radius * 0.1, radius * 0.45, 0, Math.PI * 2); // Africa
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + radius * 0.15, cy - radius * 0.25, radius * 0.35, 0, Math.PI * 2); // Asia
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + radius * 0.05, cy - radius * 0.1);
        ctx.lineTo(cx + radius * 0.25, cy + radius * 0.3);
        ctx.lineTo(cx - radius * 0.05, cy + radius * 0.25);
        ctx.closePath();
        ctx.fill();
      }

      // Sphere 3D shading overlay (specular + shadow)
      const shadeGrad = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.35, radius * 0.1, cx, cy, radius);
      shadeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
      shadeGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0)');
      shadeGrad.addColorStop(0.85, 'rgba(2, 6, 18, 0.6)');
      shadeGrad.addColorStop(1, 'rgba(1, 3, 10, 0.95)');
      ctx.fillStyle = shadeGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Current focus bounding box (white glowing rectangle over Arabian Sea / Indian Ocean)
      const boxX = cx - radius * 0.12;
      const boxY = cy - radius * 0.2;
      const boxW = radius * 0.65;
      const boxH = radius * 0.55;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Subtle white glow around box
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.restore();

      // Atmosphere outer rim glow
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      const glowGrad = ctx.createRadialGradient(cx, cy, radius - 2, cx, cy, radius + 8);
      glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.3)');
      glowGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    img.onload = render;
    render();

    return () => {
      if (animId !== undefined) cancelAnimationFrame(animId);
    };

  }, []);

  return (
    <div
      id="mini-globe-widget"
      style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 170,
        height: 170,
        borderRadius: '50%',
        background: 'rgba(10, 18, 36, 0.72)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(6, 182, 212, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 25,
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      title="Indian Ocean Region Overview"
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <canvas
        ref={canvasRef}
        width={160}
        height={160}
        style={{ width: 160, height: 160, borderRadius: '50%', display: 'block' }}
      />
    </div>
  );
}
