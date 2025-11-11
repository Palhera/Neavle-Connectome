import { mat3 } from 'gl-matrix';

export class Camera2D {
  public readonly position = new Float32Array([0, 0]);
  public zoom = 1;
  public minZoom = 0.1;
  public maxZoom = 10;

  private readonly _view = mat3.create();
  private readonly _proj = mat3.create();
  private readonly _viewProj = mat3.create();

  private _viewport = { width: 1, height: 1, dpr: 1 };
  private _viewDirty = true;
  private _projDirty = true;
  private _viewProjDirty = true;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.position[0] = 0;
    this.position[1] = 0;
    this.zoom = 1;
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

  pan(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      return;
    }
    this.position[0] += dx;
    this.position[1] += dy;
    this._viewDirty = true;
    this._viewProjDirty = true;
  }

  zoomAt(factor: number, worldX: number, worldY: number): void {
    if (!Number.isFinite(factor) || factor === 1) {
      return;
    }
    const clamped = this.clampZoom(this.zoom * factor);
    if (clamped === this.zoom) {
      return;
    }

    const prevZoom = this.zoom;
    this.zoom = clamped;

    const scale = prevZoom / this.zoom;
    this.position[0] = worldX - (worldX - this.position[0]) * scale;
    this.position[1] = worldY - (worldY - this.position[1]) * scale;

    this._viewDirty = true;
    this._viewProjDirty = true;
  }

  private clampZoom(value: number): number {
    return Math.min(this.maxZoom, Math.max(this.minZoom, value));
  }

  private ensureView(): void {
    if (!this._viewDirty) {
      return;
    }
    mat3.identity(this._view);
    mat3.translate(this._view, this._view, [-this.position[0], -this.position[1]]);
    mat3.scale(this._view, this._view, [this.zoom, this.zoom]);
    this._viewDirty = false;
  }

  private ensureProj(): void {
    if (!this._projDirty) {
      return;
    }
    const width = Math.max(1, this._viewport.width);
    const height = Math.max(1, this._viewport.height);
    const sx = 2 / width;
    const sy = 2 / height;
    mat3.identity(this._proj);
    mat3.scale(this._proj, this._proj, [sx, sy]);
    this._projDirty = false;
  }

  private ensureViewProj(): void {
    if (!this._viewProjDirty) {
      return;
    }
    this.ensureView();
    this.ensureProj();
    mat3.multiply(this._viewProj, this._proj, this._view);
    this._viewProjDirty = false;
  }
}
