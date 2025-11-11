import { Camera3D } from './camera-3d';

export interface Controls3DOptions {
  rotateSpeed?: number;
  dollyStep?: number;
  panStep?: number;
  damping?: number;
}

interface Viewport {
  width: number;
  height: number;
  dpr: number;
}

type PointerMode = 'orbit' | 'pan';

export class Controls3D {
  private readonly rotateSpeed: number;
  private readonly dollyStep: number;
  private readonly panStep: number;
  private readonly damping: number;

  private pointerState: {
    id: number;
    mode: PointerMode;
    lastX: number;
    lastY: number;
  } | null = null;

  private readonly panVelocity = new Float32Array([0, 0]);

  constructor(
    private readonly cam: Camera3D,
    private readonly getViewport: () => Viewport,
    options: Controls3DOptions = {},
  ) {
    this.rotateSpeed = options.rotateSpeed ?? 0.005;
    this.dollyStep = options.dollyStep ?? 0.0015;
    this.panStep = options.panStep ?? 1;
    this.damping = options.damping ?? 0.85;
  }

  onWheel(ev: WheelEvent): void {
    ev.preventDefault();
    const delta = ev.deltaY * this.dollyStep;
    this.cam.dolly(delta);
  }

  onPointerDown(ev: PointerEvent): void {
    if (this.pointerState) {
      return;
    }
    const mode: PointerMode = ev.button === 0 ? 'orbit' : 'pan';
    this.pointerState = {
      id: ev.pointerId,
      mode,
      lastX: ev.clientX,
      lastY: ev.clientY,
    };
    this.panVelocity[0] = 0;
    this.panVelocity[1] = 0;
    (ev.target as Element | null)?.setPointerCapture?.(ev.pointerId);
    ev.preventDefault();
  }

  onPointerMove(ev: PointerEvent): void {
    if (!this.pointerState || this.pointerState.id !== ev.pointerId) {
      return;
    }
    const dx = ev.clientX - this.pointerState.lastX;
    const dy = ev.clientY - this.pointerState.lastY;
    this.pointerState.lastX = ev.clientX;
    this.pointerState.lastY = ev.clientY;
    if (this.pointerState.mode === 'orbit') {
      this.cam.orbit(dx * this.rotateSpeed, dy * this.rotateSpeed);
    } else {
      const viewport = this.getViewport();
      const { worldDx, worldDy } = this.screenDeltaToWorld(dx, dy, viewport);
      this.cam.pan(worldDx, worldDy);
      this.panVelocity[0] = worldDx;
      this.panVelocity[1] = worldDy;
    }
    ev.preventDefault();
  }

  onPointerUp(ev: PointerEvent): void {
    if (this.pointerState?.id !== ev.pointerId) {
      return;
    }
    (ev.target as Element | null)?.releasePointerCapture?.(ev.pointerId);
    this.pointerState = null;
    ev.preventDefault();
  }

  onKey(ev: KeyboardEvent): void {
    const keyPanAmount = this.panStep * Math.max(1, this.cam.distance * 0.1);
    switch (ev.key) {
      case '+':
      case '=':
        this.cam.dolly(-this.dollyStep * 60);
        ev.preventDefault();
        break;
      case '-':
      case '_':
        this.cam.dolly(this.dollyStep * 60);
        ev.preventDefault();
        break;
      case 'ArrowUp':
        this.cam.pan(0, keyPanAmount);
        ev.preventDefault();
        break;
      case 'ArrowDown':
        this.cam.pan(0, -keyPanAmount);
        ev.preventDefault();
        break;
      case 'ArrowLeft':
        this.cam.pan(keyPanAmount, 0);
        ev.preventDefault();
        break;
      case 'ArrowRight':
        this.cam.pan(-keyPanAmount, 0);
        ev.preventDefault();
        break;
      default:
        break;
    }
  }

  update(_dt: number): boolean {
    void _dt;
    if (this.pointerState) {
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

  private screenDeltaToWorld(
    dxCss: number,
    dyCss: number,
    viewport: Viewport,
  ): {
    worldDx: number;
    worldDy: number;
  } {
    const dpr = viewport.dpr;
    const dxDevice = dxCss * dpr;
    const dyDevice = dyCss * dpr;
    const aspect = viewport.width / viewport.height;
    const halfSpan = Math.tan(this.cam.fov / 2) * this.cam.distance * 2;
    const worldPerPixelY = halfSpan / viewport.height;
    const worldPerPixelX = worldPerPixelY * aspect;
    const worldDx = -dxDevice * worldPerPixelX;
    const worldDy = dyDevice * worldPerPixelY;
    return { worldDx, worldDy };
  }
}
