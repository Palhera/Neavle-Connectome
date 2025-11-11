import { Camera2D } from './camera-2d';

export interface Controls2DOptions {
  zoomStep?: number;
  panStep?: number;
  damping?: number;
}

interface Viewport {
  width: number;
  height: number;
  dpr: number;
}

export class Controls2D {
  private readonly zoomStep: number;
  private readonly panStep: number;
  private readonly damping: number;

  private activePointer: number | null = null;
  private lastX = 0;
  private lastY = 0;
  private readonly panVelocity = new Float32Array([0, 0]);

  constructor(
    private readonly cam: Camera2D,
    private readonly getViewport: () => Viewport,
    options: Controls2DOptions = {},
  ) {
    this.zoomStep = options.zoomStep ?? 0.0025;
    this.panStep = options.panStep ?? 50;
    this.damping = options.damping ?? 0.9;
  }

  onWheel(ev: WheelEvent): void {
    ev.preventDefault();
    const viewport = this.getViewport();
    const { worldX, worldY } = this.pointerToWorld(ev.offsetX, ev.offsetY, viewport);
    const delta = ev.deltaY * this.zoomStep;
    const factor = Math.exp(-delta);
    this.cam.zoomAt(factor, worldX, worldY);
  }

  onPointerDown(ev: PointerEvent): void {
    if (this.activePointer !== null || ev.button !== 0) {
      return;
    }
    this.activePointer = ev.pointerId;
    this.lastX = ev.clientX;
    this.lastY = ev.clientY;
    this.panVelocity[0] = 0;
    this.panVelocity[1] = 0;
    (ev.target as Element | null)?.setPointerCapture?.(ev.pointerId);
    ev.preventDefault();
  }

  onPointerMove(ev: PointerEvent): void {
    if (this.activePointer !== ev.pointerId) {
      return;
    }
    const dxCss = ev.clientX - this.lastX;
    const dyCss = ev.clientY - this.lastY;
    this.lastX = ev.clientX;
    this.lastY = ev.clientY;
    const viewport = this.getViewport();
    const dxDevice = dxCss * viewport.dpr;
    const dyDevice = dyCss * viewport.dpr;
    const worldDx = -(dxDevice / this.cam.zoom);
    const worldDy = dyDevice / this.cam.zoom;
    this.cam.pan(worldDx, worldDy);
    this.panVelocity[0] = worldDx;
    this.panVelocity[1] = worldDy;
    ev.preventDefault();
  }

  onPointerUp(ev: PointerEvent): void {
    if (this.activePointer !== ev.pointerId) {
      return;
    }
    (ev.target as Element | null)?.releasePointerCapture?.(ev.pointerId);
    this.activePointer = null;
    ev.preventDefault();
  }

  onKey(ev: KeyboardEvent): void {
    switch (ev.key) {
      case '+':
      case '=': {
        const factor = Math.max(0.01, 1 + this.zoomStep * 50);
        this.cam.zoomAt(factor, this.cam.position[0], this.cam.position[1]);
        ev.preventDefault();
        break;
      }
      case '-':
      case '_': {
        const factor = Math.max(0.01, 1 - this.zoomStep * 50);
        this.cam.zoomAt(factor, this.cam.position[0], this.cam.position[1]);
        ev.preventDefault();
        break;
      }
      case 'ArrowUp':
        this.cam.pan(0, this.panStep / this.cam.zoom);
        ev.preventDefault();
        break;
      case 'ArrowDown':
        this.cam.pan(0, -this.panStep / this.cam.zoom);
        ev.preventDefault();
        break;
      case 'ArrowLeft':
        this.cam.pan(this.panStep / this.cam.zoom, 0);
        ev.preventDefault();
        break;
      case 'ArrowRight':
        this.cam.pan(-this.panStep / this.cam.zoom, 0);
        ev.preventDefault();
        break;
      default:
        break;
    }
  }

  update(_dt: number): boolean {
    void _dt;
    if (this.activePointer !== null) {
      return false;
    }
    const vx = this.panVelocity[0];
    const vy = this.panVelocity[1];
    if (Math.abs(vx) < 1e-3 && Math.abs(vy) < 1e-3) {
      return false;
    }
    this.cam.pan(vx, vy);
    this.panVelocity[0] *= this.damping;
    this.panVelocity[1] *= this.damping;
    return true;
  }

  private pointerToWorld(
    offsetX: number,
    offsetY: number,
    viewport: Viewport,
  ): {
    worldX: number;
    worldY: number;
  } {
    const deviceX = offsetX * viewport.dpr - viewport.width / 2;
    const deviceY = viewport.height / 2 - offsetY * viewport.dpr;
    const worldX = this.cam.position[0] + deviceX / this.cam.zoom;
    const worldY = this.cam.position[1] + deviceY / this.cam.zoom;
    return { worldX, worldY };
  }
}
