/**
 * OceanVolumePrimitive.ts — Cesium custom Primitive for volumetric ocean rendering.
 *
 * Renders a georeferenced box (Arabian Sea footprint, surface to maxDepth)
 * using a ray-march fragment shader that samples a WebGL2 3D texture.
 *
 * This uses Cesium's low-level rendering pipeline (DrawCommand) to inject
 * custom WebGL2 shaders that support sampler3D for true volumetric rendering.
 */

import * as Cesium from 'cesium';

// ─── GLSL Shaders ───────────────────────────────────────────────────────────

const VERTEX_SHADER = `
  attribute vec3 position;
  
  uniform mat4 u_modelViewProjection;
  uniform mat4 u_model;
  
  varying vec3 v_worldPos;
  
  void main() {
    vec4 worldPos = u_model * vec4(position, 1.0);
    v_worldPos = worldPos.xyz;
    gl_Position = u_modelViewProjection * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `#version 300 es
  precision highp float;
  precision highp sampler3D;
  
  // Volume data (3D temperature field, normalized 0-1)
  uniform sampler3D u_volumeTex;
  // Colormap LUT (256x1 RGBA)
  uniform sampler2D u_colormapTex;
  
  // Bounding box in world (Cartesian3) coordinates
  uniform vec3 u_bboxMin;
  uniform vec3 u_bboxMax;
  
  // Camera position in world coordinates
  uniform vec3 u_cameraPos;
  
  // Depth cutaway: 0.0 = show nothing, 1.0 = show full depth
  uniform float u_depthClip;
  
  // Overall volume opacity multiplier
  uniform float u_opacity;

  // Adaptive ray-march step count (dynamically tuned to hardware/framerate)
  uniform int u_stepCount;
  
  in vec3 v_worldPos;
  out vec4 fragColor;
  
  // ── Ray-box intersection (slab method) ──
  // Returns (tNear, tFar). If tNear > tFar, no intersection.
  vec2 intersectBox(vec3 rayOrigin, vec3 rayDir, vec3 boxMin, vec3 boxMax) {
    vec3 invDir = 1.0 / rayDir;
    vec3 t0 = (boxMin - rayOrigin) * invDir;
    vec3 t1 = (boxMax - rayOrigin) * invDir;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);
    float tNear = max(max(tmin.x, tmin.y), tmin.z);
    float tFar  = min(min(tmax.x, tmax.y), tmax.z);
    return vec2(tNear, tFar);
  }
  
  void main() {
    vec3 rayOrigin = u_cameraPos;
    vec3 rayDir = normalize(v_worldPos - u_cameraPos);
    
    vec2 tHit = intersectBox(rayOrigin, rayDir, u_bboxMin, u_bboxMax);
    
    if (tHit.x > tHit.y || tHit.y < 0.0) {
      discard;
    }
    
    // Clamp entry point to in front of camera
    tHit.x = max(tHit.x, 0.0);
    
    // Adaptive step count clamped between 16 and 96
    int steps = clamp(u_stepCount, 16, 96);
    float stepSize = (tHit.y - tHit.x) / float(steps);
    
    // Step weighting ensures visual density remains consistent regardless of step count
    float stepWeight = 48.0 / float(steps);

    // Front-to-back alpha compositing
    vec4 accumulated = vec4(0.0);
    vec3 bboxSize = u_bboxMax - u_bboxMin;
    
    for (int i = 0; i < 96; i++) {
      if (i >= steps) break;
      float t = tHit.x + (float(i) + 0.5) * stepSize;
      vec3 samplePos = rayOrigin + rayDir * t;
      
      // Convert world position to normalized [0,1] texture coordinates
      vec3 uvw = (samplePos - u_bboxMin) / bboxSize;
      
      // Depth cutaway: skip samples deeper than the clip plane
      // uvw.z goes from 0 (surface/top) to 1 (deepest)
      // We want to show only uvw.z <= u_depthClip
      if (uvw.z > u_depthClip) continue;
      
      // Bounds check
      if (any(lessThan(uvw, vec3(0.0))) || any(greaterThan(uvw, vec3(1.0)))) continue;
      
      // Sample the 3D temperature texture (trilinear interpolated by GPU)
      float tempVal = texture(u_volumeTex, uvw).r;
      if (tempVal < 0.0) continue; // Skip land cells completely (de-emphasized context)
      
      // Map normalized temperature → color via the 1D colormap LUT
      vec4 sampleColor = texture(u_colormapTex, vec2(tempVal, 0.5));
      
      // Semi-transparent accumulation
      // Higher density near surface, more transparent at depth
      float depthFade = 1.0 - uvw.z * 0.3;
      float alpha = sampleColor.a * u_opacity * 0.04 * depthFade * stepWeight;
      
      // Front-to-back compositing
      accumulated.rgb += (1.0 - accumulated.a) * sampleColor.rgb * alpha;
      accumulated.a   += (1.0 - accumulated.a) * alpha;
      
      // Early termination when nearly opaque
      if (accumulated.a > 0.95) break;
    }
    
    fragColor = accumulated;
  }
`;

// Fallback WebGL1 fragment shader (no sampler3D — renders a flat colored box)
const FRAGMENT_SHADER_FALLBACK = `
  precision highp float;
  
  uniform sampler2D u_colormapTex;
  uniform float u_opacity;
  
  varying vec3 v_worldPos;
  
  void main() {
    // Simple flat-color fallback
    vec4 color = texture2D(u_colormapTex, vec2(0.5, 0.5));
    gl_FragColor = vec4(color.rgb, u_opacity * 0.3);
  }
`;

// ─── Volume Box Geometry Builder ────────────────────────────────────────────

/**
 * Creates the 8 vertices and 36 indices for a box primitive.
 * The box spans from (0,0,0) to (1,1,1) in local coordinates,
 * then gets transformed by the model matrix to world position.
 */
function createBoxGeometry(): { positions: Float32Array; indices: Uint16Array } {
  // 8 corners of a unit cube
  const positions = new Float32Array([
    0, 0, 0,  // 0: front-bottom-left
    1, 0, 0,  // 1: front-bottom-right
    1, 1, 0,  // 2: front-top-right
    0, 1, 0,  // 3: front-top-left
    0, 0, 1,  // 4: back-bottom-left
    1, 0, 1,  // 5: back-bottom-right
    1, 1, 1,  // 6: back-top-right
    0, 1, 1,  // 7: back-top-left
  ]);

  // 12 triangles (2 per face, 6 faces)
  const indices = new Uint16Array([
    // Front
    0, 1, 2, 0, 2, 3,
    // Back
    4, 6, 5, 4, 7, 6,
    // Left
    0, 3, 7, 0, 7, 4,
    // Right
    1, 5, 6, 1, 6, 2,
    // Top
    3, 2, 6, 3, 6, 7,
    // Bottom
    0, 4, 5, 0, 5, 1,
  ]);

  return { positions, indices };
}

// ─── Public Interface ───────────────────────────────────────────────────────

export interface VolumeRenderParams {
  /** Geographic bounds [west, south, east, north] in degrees */
  geoBounds: [number, number, number, number];
  /** Maximum depth in metres (positive number, e.g. 1000) */
  maxDepth: number;
  /** WebGL2 3D texture handle */
  volumeTexture: WebGLTexture;
  /** WebGL2 2D colormap LUT texture handle */
  colormapTexture: WebGLTexture;
  /** Depth cutaway normalized 0–1 (0 = surface only, 1 = full depth) */
  depthClip: number;
  /** Overall opacity 0–1 */
  opacity: number;
}

// ─── Adaptive Performance & Ray-March Step Controller ─────────────────────

export interface PerformanceStats {
  fps: number;
  stepCount: number;
  gpuTier: 'low' | 'medium' | 'high';
  frameTimeMs: number;
}

export class AdaptivePerformanceManager {
  private _stepCount: number = 48;
  private _lastFrameTime: number = performance.now();
  private _frameDeltas: number[] = [];
  private _maxSamples = 45;
  private _fps: number = 60;
  private _frameTimeMs: number = 16.6;
  private _lastAdjustmentTime = performance.now();
  private _gpuTier: 'low' | 'medium' | 'high' = 'high';
  private _initialized = false;

  init(gl?: WebGLRenderingContext | WebGL2RenderingContext | null) {
    if (this._initialized) return;
    this._initialized = true;

    // 1. Core count heuristic
    const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;

    // 2. GPU renderer detection
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
        // Ignore extension block
      }
    }

    // 3. Set starting step count based on rough GPU/device capability signal
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

      // Adaptive adjustment: check every 1.5s after gathering at least 15 frames
      if (now - this._lastAdjustmentTime > 1500 && this._frameDeltas.length >= 15) {
        this._lastAdjustmentTime = now;
        if (this._fps < 28) {
          // Drop step count on lower-end devices to stay smooth
          this._stepCount = Math.max(16, this._stepCount - 8);
        } else if (this._fps > 55 && this._stepCount < 64) {
          // Increase quality if GPU handles it easily
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

export const sharedPerformanceManager = new AdaptivePerformanceManager();

/**
 * OceanVolumePrimitive — manages a Cesium Primitive that renders the
 * volumetric ocean body using ray-marching.
 *
 * Usage:
 *   const vol = new OceanVolumePrimitive();
 *   scene.primitives.add(vol);
 *   vol.update(params);  // call whenever data/settings change
 *   scene.primitives.remove(vol);  // cleanup
 */
export class OceanVolumePrimitive {
  private _params: VolumeRenderParams | null = null;
  private _drawCommand: any = null;
  private _shaderProgram: any = null;
  private _vertexArray: any = null;
  private _modelMatrix: Cesium.Matrix4 = Cesium.Matrix4.IDENTITY.clone();
  private _bboxMin: Cesium.Cartesian3 = new Cesium.Cartesian3();
  private _bboxMax: Cesium.Cartesian3 = new Cesium.Cartesian3();
  private _ready = false;
  private _isWebGL2 = false;
  private _perfManager = sharedPerformanceManager;

  show = true;

  private _compileShader(gl: WebGLRenderingContext | WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  update(params: VolumeRenderParams) {
    this._params = params;
    this._computeBoundingBox(params);
    this._ready = true;
  }

  get perfStats(): PerformanceStats {
    return this._perfManager.stats;
  }

  /**
   * Compute the Cartesian3 bounding box for the volume.
   * Surface corners are on the WGS84 ellipsoid; depth corners are
   * at (ellipsoid surface - maxDepth) along the surface normal.
   */
  private _computeBoundingBox(params: VolumeRenderParams) {
    const [west, south, east, north] = params.geoBounds;

    // Get the 4 surface corners and push them down by maxDepth
    const surfaceCorners = [
      Cesium.Cartesian3.fromDegrees(west, south, 0),
      Cesium.Cartesian3.fromDegrees(east, south, 0),
      Cesium.Cartesian3.fromDegrees(east, north, 0),
      Cesium.Cartesian3.fromDegrees(west, north, 0),
    ];
    const deepCorners = [
      Cesium.Cartesian3.fromDegrees(west, south, -params.maxDepth),
      Cesium.Cartesian3.fromDegrees(east, south, -params.maxDepth),
      Cesium.Cartesian3.fromDegrees(east, north, -params.maxDepth),
      Cesium.Cartesian3.fromDegrees(west, north, -params.maxDepth),
    ];

    const allCorners = [...surfaceCorners, ...deepCorners];

    // Compute axis-aligned bounding box in Cartesian3
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const c of allCorners) {
      minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
      minZ = Math.min(minZ, c.z); maxZ = Math.max(maxZ, c.z);
    }

    // Add a small padding so the volume isn't paper-thin
    const padX = (maxX - minX) * 0.02;
    const padY = (maxY - minY) * 0.02;
    const padZ = (maxZ - minZ) * 0.02;

    this._bboxMin = new Cesium.Cartesian3(minX - padX, minY - padY, minZ - padZ);
    this._bboxMax = new Cesium.Cartesian3(maxX + padX, maxY + padY, maxZ + padZ);

    // Model matrix positions the unit cube at the bounding box
    const scale = Cesium.Cartesian3.subtract(this._bboxMax, this._bboxMin, new Cesium.Cartesian3());
    this._modelMatrix = Cesium.Matrix4.fromTranslationRotationScale(
      new Cesium.TranslationRotationScale(
        this._bboxMin,
        Cesium.Quaternion.IDENTITY,
        scale,
      ),
    );
  }

  // Cesium Primitive interface — called each frame
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _update(frameState: any) {
    if (!this.show || !this._ready || !this._params) return;

    const context = frameState.context;
    const gl = context._gl as WebGL2RenderingContext;

    // Check WebGL2 on first call
    if (!this._drawCommand) {
      this._isWebGL2 = gl instanceof WebGL2RenderingContext;
    }

    // Create GPU resources on first render
    if (!this._drawCommand) {
      this._createResources(context, frameState);
    }

    if (!this._drawCommand) return;

    // Update uniforms
    const params = this._params;
    const uniformMap = this._drawCommand.uniformMap;
    
    uniformMap.u_bboxMin = () => this._bboxMin;
    uniformMap.u_bboxMax = () => this._bboxMax;
    uniformMap.u_cameraPos = () => frameState.camera.positionWC;
    uniformMap.u_depthClip = () => params.depthClip;
    uniformMap.u_opacity = () => params.opacity;
    uniformMap.u_modelViewProjection = () => {
      const mvp = new Cesium.Matrix4();
      Cesium.Matrix4.multiply(
        frameState.camera.viewMatrix,
        this._modelMatrix,
        mvp,
      );
      Cesium.Matrix4.multiply(
        frameState.camera.frustum.projectionMatrix,
        mvp,
        mvp,
      );
      return mvp;
    };
    uniformMap.u_model = () => this._modelMatrix;

    // Bind textures manually each frame
    uniformMap.u_volumeTex = () => params.volumeTexture;
    uniformMap.u_colormapTex = () => params.colormapTexture;

    // Update bounding volume for frustum culling
    const center = Cesium.Cartesian3.midpoint(this._bboxMin, this._bboxMax, new Cesium.Cartesian3());
    const radius = Cesium.Cartesian3.distance(this._bboxMin, this._bboxMax) / 2;
    this._drawCommand.boundingVolume = new Cesium.BoundingSphere(center, radius);

    frameState.commandList.push(this._drawCommand);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _createResources(context: any, _frameState: any) {
    const gl = context._gl as WebGL2RenderingContext;
    
    // Build box geometry
    const { positions, indices } = createBoxGeometry();

    // We'll use raw WebGL for maximum control since Cesium's
    // shader pipeline doesn't natively support sampler3D
    this._createRawDrawCommand(gl, context, positions, indices);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _createRawDrawCommand(gl: WebGL2RenderingContext, _context: any, positions: Float32Array, indices: Uint16Array) {
    // Compile shaders
    const vsSource = this._isWebGL2
      ? `#version 300 es
        in vec3 position;
        uniform mat4 u_modelViewProjection;
        uniform mat4 u_model;
        out vec3 v_worldPos;
        void main() {
          vec4 worldPos = u_model * vec4(position, 1.0);
          v_worldPos = worldPos.xyz;
          gl_Position = u_modelViewProjection * vec4(position, 1.0);
        }`
      : VERTEX_SHADER;

    const fsSource = this._isWebGL2 ? FRAGMENT_SHADER : FRAGMENT_SHADER_FALLBACK;

    const vs = this._compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = this._compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Volume shader link error:', gl.getProgramInfoLog(program));
      return;
    }

    // Create VAO
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const ibo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    // Store everything
    this._shaderProgram = program;
    this._vertexArray = vao;

    // Initialize performance manager with GL context
    this._perfManager.init(gl);

    // Uniform locations
    const locs = {
      u_modelViewProjection: gl.getUniformLocation(program, 'u_modelViewProjection'),
      u_model: gl.getUniformLocation(program, 'u_model'),
      u_bboxMin: gl.getUniformLocation(program, 'u_bboxMin'),
      u_bboxMax: gl.getUniformLocation(program, 'u_bboxMax'),
      u_cameraPos: gl.getUniformLocation(program, 'u_cameraPos'),
      u_depthClip: gl.getUniformLocation(program, 'u_depthClip'),
      u_opacity: gl.getUniformLocation(program, 'u_opacity'),
      u_stepCount: gl.getUniformLocation(program, 'u_stepCount'),
      u_volumeTex: gl.getUniformLocation(program, 'u_volumeTex'),
      u_colormapTex: gl.getUniformLocation(program, 'u_colormapTex'),
    };

    // Create a minimal draw command object that the _update method
    // pushes to frameState.commandList. We use Cesium's internal
    // DrawCommand structure.
    const self = this;
    const numIndices = indices.length;

    // Instead of fighting Cesium's DrawCommand, we use a simpler approach:
    // hook into the scene's postRender event to do raw GL drawing
    this._drawCommand = {
      _program: program,
      _vao: vao,
      _locs: locs,
      _numIndices: numIndices,
      _gl: gl,
      _self: self,
      uniformMap: {} as Record<string, () => unknown>,
      boundingVolume: new Cesium.BoundingSphere(Cesium.Cartesian3.ZERO, 1e7),
      // Flag to identify this as our custom volume command
      __isOceanVolume: true,
    };
  }

  /**
   * Render the volume using raw WebGL calls.
   * Called from the React component's postRender hook.
   */
  render(frameState: { camera: Cesium.Camera }) {
    if (!this.show || !this._ready || !this._params || !this._drawCommand) return;

    const cmd = this._drawCommand;
    const gl = cmd._gl as WebGL2RenderingContext;
    const program = cmd._program;
    const locs = cmd._locs;
    const params = this._params!;

    // Save GL state
    const prevProgram = gl.getParameter(gl.CURRENT_PROGRAM);
    const prevBlend = gl.isEnabled(gl.BLEND);
    const prevDepthWrite = gl.getParameter(gl.DEPTH_WRITEMASK);
    const prevCullFace = gl.isEnabled(gl.CULL_FACE);

    // Set up blending for volume rendering
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);   // Don't write to depth buffer
    gl.disable(gl.CULL_FACE); // Render both faces of the box

    // Bind VAO
    gl.bindVertexArray(cmd._vao);

    // Set uniforms
    const camera = frameState.camera;
    
    // Model-View-Projection matrix
    const view = camera.viewMatrix;
    const proj = camera.frustum.projectionMatrix;
    const mv = new Cesium.Matrix4();
    Cesium.Matrix4.multiply(view, this._modelMatrix, mv);
    const mvp = new Cesium.Matrix4();
    Cesium.Matrix4.multiply(proj, mv, mvp);

    const mvpArray = Cesium.Matrix4.toArray(mvp, new Array(16));
    gl.uniformMatrix4fv(locs.u_modelViewProjection, false, new Float32Array(mvpArray));

    const modelArray = Cesium.Matrix4.toArray(this._modelMatrix, new Array(16));
    gl.uniformMatrix4fv(locs.u_model, false, new Float32Array(modelArray));

    // Bounding box
    gl.uniform3f(locs.u_bboxMin, this._bboxMin.x, this._bboxMin.y, this._bboxMin.z);
    gl.uniform3f(locs.u_bboxMax, this._bboxMax.x, this._bboxMax.y, this._bboxMax.z);

    // Camera position
    const camPos = camera.positionWC;
    gl.uniform3f(locs.u_cameraPos, camPos.x, camPos.y, camPos.z);

    // Depth clip and opacity
    gl.uniform1f(locs.u_depthClip, params.depthClip);
    gl.uniform1f(locs.u_opacity, params.opacity);

    // Adaptive ray-march step count
    const activeStepCount = this._perfManager.recordFrame();
    if (this._isWebGL2 && locs.u_stepCount != null) {
      gl.uniform1i(locs.u_stepCount, activeStepCount);
    }

    // Bind textures
    if (this._isWebGL2 && locs.u_volumeTex != null) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_3D, params.volumeTexture);
      gl.uniform1i(locs.u_volumeTex, 0);
    }

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, params.colormapTexture);
    gl.uniform1i(locs.u_colormapTex, 1);

    // Draw the box
    gl.drawElements(gl.TRIANGLES, cmd._numIndices, gl.UNSIGNED_SHORT, 0);

    // Restore GL state
    gl.bindVertexArray(null);
    gl.useProgram(prevProgram);
    if (!prevBlend) gl.disable(gl.BLEND);
    gl.depthMask(prevDepthWrite as boolean);
    if (prevCullFace) gl.enable(gl.CULL_FACE);
    gl.activeTexture(gl.TEXTURE0);
  }

  isDestroyed() {
    return false;
  }

  destroy() {
    if (this._drawCommand) {
      const gl = this._drawCommand._gl as WebGL2RenderingContext;
      if (this._shaderProgram) gl.deleteProgram(this._shaderProgram);
      if (this._vertexArray) gl.deleteVertexArray(this._vertexArray);
    }
    this._drawCommand = null;
    this._ready = false;
    this._params = null;
  }
}
