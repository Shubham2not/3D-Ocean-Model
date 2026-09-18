
export interface PerformanceStats {
  fps: number;
  stepCount: number;
  gpuTier: 'low' | 'medium' | 'high';
  frameTimeMs: number;
}

export class PerformanceManager {
  private _lastFrameTime = performance.now();
  private _frameDeltas: number[] = [];
  private _stepCount: number = 48;
  private _maxSamples = 45;
  private _fps: number = 60;
  private _frameTimeMs: number = 16.6;
  private _lastAdjustmentTime = performance.now();
  private _gpuTier: 'low' | 'medium' | 'high' = 'high';
  private _initialized = false;

  init(gl?: WebGLRenderingContext | WebGL2RenderingContext | null) {
    if (this._initialized) return;
    this._initialized = true;

    const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
    let isIntegrated = false;

    if (gl) {
      try {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          const renderer = (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string || '').toLowerCase();
          if (
            renderer.includes('intel') ||
            renderer.includes('uhd') ||
            renderer.includes('hd graphics') ||
            renderer.includes('iris') ||
            renderer.includes('swiftshader') ||
            renderer.includes('llvmpipe') ||
            renderer.includes('mali') ||
            renderer.includes('adreno')
          ) {
            isIntegrated = true;
          }
        }
      } catch {

      }
    }

    if (cores <= 2 || isIntegrated) {
      this._gpuTier = 'low';
      this._stepCount = 24;
    } else if (cores <= 4) {
      this._gpuTier = 'medium';
      this._stepCount = 36;
    } else {
      this._gpuTier = 'high';
      this._stepCount = 48;
    }
  }

  recordFrame(): number {
    const now = performance.now();
    const delta = now - this._lastFrameTime;
    this._lastFrameTime = now;

    if (delta > 0 && delta < 200) {
      this._frameDeltas.push(delta);
      if (this._frameDeltas.length > this._maxSamples) {
        this._frameDeltas.shift();
      }
      const avgDelta = this._frameDeltas.reduce((a, b) => a + b, 0) / this._frameDeltas.length;
      this._frameTimeMs = Math.round(avgDelta * 10) / 10;
      this._fps = Math.round(1000 / avgDelta);

      if (now - this._lastAdjustmentTime > 1500 && this._frameDeltas.length >= 15) {
        this._lastAdjustmentTime = now;
        if (this._fps < 28) {
          this._stepCount = Math.max(16, this._stepCount - 8);
        } else if (this._fps > 55 && this._stepCount < 64) {
          this._stepCount = Math.min(64, this._stepCount + 4);
        }
      }
    }
    return this._stepCount;
  }

  get stats(): PerformanceStats {
    return {
      fps: this._fps,
      stepCount: this._stepCount,
      gpuTier: this._gpuTier,
      frameTimeMs: this._frameTimeMs,
    };
  }

  get stepCount() { return this._stepCount; }
  get fps() { return this._fps; }
  get gpuTier() { return this._gpuTier; }
}

export const sharedPerformanceManager = new PerformanceManager();
