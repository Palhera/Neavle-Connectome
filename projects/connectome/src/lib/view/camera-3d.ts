import { mat4, vec3 } from 'gl-matrix';

const MIN_ELEVATION = -Math.PI / 2 + 0.01;
const MAX_ELEVATION = Math.PI / 2 - 0.01;
const WORLD_UP = vec3.fromValues(0, 1, 0);

export class Camera3D {
  public readonly target = new Float32Array([0, 0, 0]);
  public distance = 5;
  public minDistance = 0.5;
  public maxDistance = 500;
  public azimuth = 0;
  public elevation = 0;

  private readonly _view = mat4.create();
  private readonly _proj = mat4.create();
  private readonly _viewProj = mat4.create();
  private readonly _cameraPosition = vec3.create();
  private readonly _forward = vec3.create();
  private readonly _right = vec3.create();
  private readonly _up = vec3.create();

  private _viewport = { width: 1, height: 1, dpr: 1 };
  private _viewDirty = true;
  private _projDirty = true;
  private _viewProjDirty = true;
  private _aspect = 1;
  private readonly _fov = (55 * Math.PI) / 180;

  constructor() {
    this.reset();
  }

  get fov(): number {
    return this._fov;
  }

  reset(): void {
    this.target[0] = 0;
    this.target[1] = 0;
    this.target[2] = 0;
    this.distance = 5;
    this.azimuth = 0;
    this.elevation = 0;
    this._viewDirty = true;
    this._viewProjDirty = true;
  }

  setViewport(width: number, height: number, dpr: number): void {
    const nextWidth = Math.max(1, Math.floor(width));
    const nextHeight = Math.max(1, Math.floor(height));
    const nextDpr = Math.max(1, dpr || 1);
    if (
      this._viewport.width !== nextWidth ||
      this._viewport.height !== nextHeight ||
      this._viewport.dpr !== nextDpr
    ) {
      this._viewport = { width: nextWidth, height: nextHeight, dpr: nextDpr };
      this._aspect = nextWidth / nextHeight;
      this._projDirty = true;
      this._viewProjDirty = true;
    }
  }

  toView(out: Float32Array): Float32Array {
    this.ensureView();
    out.set(this._view);
    return out;
  }

  toProj(out: Float32Array): Float32Array {
    this.ensureProj();
    out.set(this._proj);
    return out;
  }

  toViewProj(out: Float32Array): Float32Array {
    this.ensureViewProj();
    out.set(this._viewProj);
    return out;
  }

  orbit(deltaAzimuth: number, deltaElevation: number): void {
    if (deltaAzimuth === 0 && deltaElevation === 0) {
      return;
    }
    this.azimuth += deltaAzimuth;
    this.elevation = clamp(this.elevation + deltaElevation, MIN_ELEVATION, MAX_ELEVATION);
    this._viewDirty = true;
    this._viewProjDirty = true;
  }

  dolly(delta: number): void {
    if (delta === 0) {
      return;
    }
    const scale = Math.exp(delta);
    const next = clamp(this.distance * scale, this.minDistance, this.maxDistance);
    if (next === this.distance) {
      return;
    }
    this.distance = next;
    this._viewDirty = true;
    this._viewProjDirty = true;
  }

  pan(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      return;
    }
    this.ensureView();
    const offsetX = this._right[0] * dx + this._up[0] * dy;
    const offsetY = this._right[1] * dx + this._up[1] * dy;
    const offsetZ = this._right[2] * dx + this._up[2] * dy;
    this.target[0] += offsetX;
    this.target[1] += offsetY;
    this.target[2] += offsetZ;
    this._viewDirty = true;
    this._viewProjDirty = true;
  }

  private ensureView(): void {
    if (!this._viewDirty) {
      return;
    }
    const clampedDistance = clamp(this.distance, this.minDistance, this.maxDistance);
    this.distance = clampedDistance;
    this.elevation = clamp(this.elevation, MIN_ELEVATION, MAX_ELEVATION);

    const cosEl = Math.cos(this.elevation);
    const sinEl = Math.sin(this.elevation);
    const cosAz = Math.cos(this.azimuth);
    const sinAz = Math.sin(this.azimuth);

    this._cameraPosition[0] = this.target[0] + clampedDistance * cosEl * sinAz;
    this._cameraPosition[1] = this.target[1] + clampedDistance * sinEl;
    this._cameraPosition[2] = this.target[2] + clampedDistance * cosEl * cosAz;

    mat4.lookAt(this._view, this._cameraPosition, this.target, WORLD_UP);
    vec3.set(
      this._forward,
      this.target[0] - this._cameraPosition[0],
      this.target[1] - this._cameraPosition[1],
      this.target[2] - this._cameraPosition[2],
    );
    vec3.normalize(this._forward, this._forward);
    vec3.cross(this._right, this._forward, WORLD_UP);
    vec3.normalize(this._right, this._right);
    vec3.cross(this._up, this._right, this._forward);
    vec3.normalize(this._up, this._up);

    this._viewDirty = false;
  }

  private ensureProj(): void {
    if (!this._projDirty) {
      return;
    }
    const aspect = Math.max(0.0001, this._aspect);
    mat4.perspective(this._proj, this._fov, aspect, 0.01, 10000);
    this._projDirty = false;
  }

  private ensureViewProj(): void {
    if (!this._viewProjDirty) {
      return;
    }
    this.ensureView();
    this.ensureProj();
    mat4.multiply(this._viewProj, this._proj, this._view);
    this._viewProjDirty = false;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
