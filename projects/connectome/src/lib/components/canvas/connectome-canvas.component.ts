import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { ConnectomeData, Dimensionality } from '../../api/types';
import { ConnectomeRenderer } from '../../render/connectome-renderer.service';
import { Camera2D } from '../../view/camera-2d';
import { Camera3D } from '../../view/camera-3d';
import { Controls2D } from '../../view/controls-2d';
import { Controls3D } from '../../view/controls-3d';

type Vec4 = [number, number, number, number];

export interface ConnectomeFocusBounds {
  minX: number;
  minY: number;
  minZ?: number;
  maxX: number;
  maxY: number;
  maxZ?: number;
}

@Component({
  selector: 'ncx-connectome-canvas',
  standalone: true,
  template: `
    <canvas
      #canvas
      class="ncx-canvas"
      role="img"
      aria-label="Connectome canvas"
      tabindex="0"
    ></canvas>
    <div class="visually-hidden" aria-live="polite">{{ _ariaStatus }}</div>
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
      }

      .ncx-canvas {
        display: block;
        width: 100%;
        height: 100%;
        outline: none;
      }

      .visually-hidden {
        border: 0;
        clip: rect(0 0 0 0);
        height: 1px;
        width: 1px;
        margin: -1px;
        padding: 0;
        overflow: hidden;
        position: absolute;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectomeCanvasComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input()
  antialias = true;

  @Input()
  powerPreference: WebGLPowerPreference = 'high-performance';

  @Input()
  background: Vec4 = [0.08, 0.08, 0.09, 1];

  @Input()
  data?: ConnectomeData;

  @Input()
  dimensionality: Dimensionality = 2;

  @Output()
  viewChanged = new EventEmitter<{ view: Float32Array; proj: Float32Array }>();

  protected _ariaStatus = 'Canvas ready';

  private readonly renderer = inject(ConnectomeRenderer);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  private _gl: WebGL2RenderingContext | null = null;
  private _ro: ResizeObserver | null = null;
  private _rafId: number | null = null;
  private _canvasElement: HTMLCanvasElement | null = null;
  private _lastFrameTime = 0;
  private _pendingDataUpdate = false;

  private _camera2d: Camera2D | null = null;
  private _camera3d: Camera3D | null = null;
  private _controls2d: Controls2D | null = null;
  private _controls3d: Controls3D | null = null;

  private _canvasWidth = 0;
  private _canvasHeight = 0;
  private _viewport = { width: 1, height: 1, dpr: 1 };

  private readonly _view2d = new Float32Array(9);
  private readonly _proj2d = new Float32Array(9);
  private readonly _viewMatrix4 = new Float32Array(16);
  private readonly _projMatrix4 = new Float32Array(16);
  private readonly _viewChangePayload = { view: this._viewMatrix4, proj: this._projMatrix4 };

  private _lastAnnouncedZoom = 1;
  private _lastAnnouncedDistance = 0;

  private readonly _renderFrame = (timestamp: number) => {
    this._rafId = null;
    this.drawFrame(timestamp);
  };

  private readonly _contextLostHandler = (event: Event) => {
    event.preventDefault();
    this.stopRenderLoop();
    this.renderer.dispose();
    this._gl = null;
  };

  private readonly _contextRestoredHandler = () => {
    this.initializeContext();
  };

  private readonly _pointerDownHandler = (ev: PointerEvent) => this.handlePointerDown(ev);
  private readonly _pointerMoveHandler = (ev: PointerEvent) => this.handlePointerMove(ev);
  private readonly _pointerUpHandler = (ev: PointerEvent) => this.handlePointerUp(ev);
  private readonly _pointerCancelHandler = (ev: PointerEvent) => this.handlePointerUp(ev);
  private readonly _wheelHandler = (ev: WheelEvent) => this.handleWheel(ev);
  private readonly _keyHandler = (ev: KeyboardEvent) => this.handleKey(ev);

  get gl(): WebGL2RenderingContext | null {
    return this._gl;
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.initializeContext());
  }

  ngOnDestroy(): void {
    this.stopRenderLoop();
    this.disconnectResizeObserver();
    this.detachInputListeners();
    this.renderer.dispose();
    this.removeContextListeners();
    this._gl = null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['background'] && !changes['background'].firstChange) {
      this.requestRender();
    }

    if (changes['data']) {
      this._pendingDataUpdate = true;
      this.pushDataToRenderer();
    }

    if (changes['dimensionality'] && !changes['dimensionality'].firstChange) {
      if (this._gl) {
        this.renderer.init(this._gl, this.dimensionality);
        this.createControllers();
        this.pushDataToRenderer(true);
        this.requestRender();
      }
    }
  }

  public requestRender(): void {
    if (!this._gl || typeof window === 'undefined' || this._rafId !== null) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      if (this._rafId === null && typeof window !== 'undefined') {
        this._rafId = window.requestAnimationFrame(this._renderFrame);
      }
    });
  }

  public resetView(): void {
    if (this._camera2d && this.dimensionality === 2) {
      this._camera2d.reset();
    } else if (this._camera3d && this.dimensionality === 3) {
      this._camera3d.reset();
    }
    this.requestRender();
  }

  public focusBounds(bounds: ConnectomeFocusBounds): void {
    if (this.dimensionality === 2 && this._camera2d) {
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const width = Math.max(1e-3, bounds.maxX - bounds.minX);
      const height = Math.max(1e-3, bounds.maxY - bounds.minY);
      const margin = 1.2;
      const targetZoom = Math.min(
        this._canvasWidth / (width * margin),
        this._canvasHeight / (height * margin),
      );
      const factor = targetZoom / this._camera2d.zoom;
      this._camera2d.zoomAt(factor, centerX, centerY);
      this.requestRender();
    } else if (this.dimensionality === 3 && this._camera3d) {
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const centerZ = ((bounds.minZ ?? 0) + (bounds.maxZ ?? 0)) / 2;
      const dx = bounds.maxX - bounds.minX;
      const dy = bounds.maxY - bounds.minY;
      const dz = (bounds.maxZ ?? 0) - (bounds.minZ ?? 0);
      const radius = Math.max(1e-3, Math.sqrt(dx * dx + dy * dy + dz * dz) / 2);
      const marginRadius = radius * 1.4;
      const distance = marginRadius / Math.sin(this._camera3d.fov / 2);
      this._camera3d.target[0] = centerX;
      this._camera3d.target[1] = centerY;
      this._camera3d.target[2] = centerZ;
      this._camera3d.distance = Math.min(
        this._camera3d.maxDistance,
        Math.max(this._camera3d.minDistance, distance),
      );
      this._camera3d.azimuth = Math.PI / 4;
      this._camera3d.elevation = Math.PI / 6;
      this.requestRender();
    }
  }

  private initializeContext(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }

    this.renderer.dispose();
    this.disconnectResizeObserver();
    this.detachInputListeners();
    this.removeContextListeners();
    this.addContextListeners();

    const contextOptions: WebGLContextAttributes & { powerPreference: WebGLPowerPreference } = {
      antialias: this.antialias,
      powerPreference: this.powerPreference,
      alpha: false,
      desynchronized: true,
      preserveDrawingBuffer: false,
    };
    const ctx = canvas.getContext('webgl2', contextOptions);

    if (!ctx) {
      console.error('WebGL2 is not available in this environment.');
      return;
    }

    this._gl = ctx;
    this.renderer.init(ctx, this.dimensionality);
    this._canvasElement = canvas;
    this.attachInputListeners(canvas);
    this.observeCanvasSize(canvas);
    this.createControllers();
    this.pushDataToRenderer(true);
    this.requestRender();
  }

  private createControllers(): void {
    if (!this._gl) {
      return;
    }

    this._camera2d = null;
    this._camera3d = null;
    this._controls2d = null;
    this._controls3d = null;

    if (this.dimensionality === 2) {
      this._camera2d = new Camera2D();
      this._camera2d.setViewport(this._canvasWidth, this._canvasHeight, this._viewport.dpr);
      this._controls2d = new Controls2D(this._camera2d, () => this._viewport);
      this._lastAnnouncedZoom = this._camera2d.zoom;
    } else {
      this._camera3d = new Camera3D();
      this._camera3d.setViewport(this._canvasWidth, this._canvasHeight, this._viewport.dpr);
      this._controls3d = new Controls3D(this._camera3d, () => this._viewport);
      this._lastAnnouncedDistance = this._camera3d.distance;
    }
  }

  private observeCanvasSize(canvas: HTMLCanvasElement): void {
    if (typeof ResizeObserver === 'undefined') {
      const rect = canvas.getBoundingClientRect();
      this.resizeCanvas(rect.width || canvas.clientWidth, rect.height || canvas.clientHeight);
      return;
    }

    if (!this._ro) {
      this._ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }
        this.resizeCanvas(entry.contentRect.width, entry.contentRect.height);
      });
    }

    this._ro.observe(canvas);
    const rect = canvas.getBoundingClientRect();
    this.resizeCanvas(rect.width, rect.height);
  }

  private resizeCanvas(width: number, height: number): void {
    const canvas = this.canvasRef?.nativeElement;
    const gl = this._gl;
    if (!canvas || !gl) {
      return;
    }
    const fallbackWidth = width || canvas.clientWidth || canvas.width || 1;
    const fallbackHeight = height || canvas.clientHeight || canvas.height || 1;

    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    const pixelWidth = Math.max(1, Math.floor(fallbackWidth * dpr));
    const pixelHeight = Math.max(1, Math.floor(fallbackHeight * dpr));

    if (pixelWidth === this._canvasWidth && pixelHeight === this._canvasHeight) {
      return;
    }

    this._canvasWidth = pixelWidth;
    this._canvasHeight = pixelHeight;
    this._viewport = { width: pixelWidth, height: pixelHeight, dpr };
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;

    this._camera2d?.setViewport(pixelWidth, pixelHeight, dpr);
    this._camera3d?.setViewport(pixelWidth, pixelHeight, dpr);
    this.requestRender();
  }

  private pushDataToRenderer(force = false): void {
    if (!this._gl) {
      return;
    }
    if (!this._pendingDataUpdate && !force) {
      return;
    }
    const payload: ConnectomeData = this.data ?? { nodes: [] };
    this.renderer.setData(payload);
    this._pendingDataUpdate = false;
    this.requestRender();
  }

  private drawFrame(timestamp: number): void {
    const gl = this._gl;
    if (!gl) {
      return;
    }

    const dt = this._lastFrameTime === 0 ? 0 : (timestamp - this._lastFrameTime) / 1000;
    this._lastFrameTime = timestamp;

    const controls = this.activeControls;
    const animated = controls?.update(dt) ?? false;

    gl.viewport(0, 0, this._canvasWidth, this._canvasHeight);
    const bg = this.background;
    gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.updateCameraMatrices();
    this.renderer.draw(this._viewMatrix4, this._projMatrix4);
    this.viewChanged.emit(this._viewChangePayload);

    if (animated) {
      this.requestRender();
    }
  }

  private updateCameraMatrices(): void {
    if (this.dimensionality === 2 && this._camera2d) {
      this._camera2d.toView(this._view2d);
      this._camera2d.toProj(this._proj2d);
      mat3ToMat4(this._viewMatrix4, this._view2d);
      mat3ToMat4(this._projMatrix4, this._proj2d);
      this.announceZoom(this._camera2d.zoom);
    } else if (this.dimensionality === 3 && this._camera3d) {
      this._camera3d.toView(this._viewMatrix4);
      this._camera3d.toProj(this._projMatrix4);
      this.announceDistance(this._camera3d.distance);
    }
  }

  private announceZoom(zoom: number): void {
    if (Math.abs(zoom - this._lastAnnouncedZoom) < 1e-3) {
      return;
    }
    this._lastAnnouncedZoom = zoom;
    this._ariaStatus = `Zoom ${(zoom * 100).toFixed(0)}%`;
    this.cdr.markForCheck();
  }

  private announceDistance(distance: number): void {
    if (Math.abs(distance - this._lastAnnouncedDistance) < 1e-3) {
      return;
    }
    this._lastAnnouncedDistance = distance;
    this._ariaStatus = `Distance ${distance.toFixed(1)}`;
    this.cdr.markForCheck();
  }

  private stopRenderLoop(): void {
    if (this._rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this._rafId);
      this._rafId = null;
      this._lastFrameTime = 0;
    }
  }

  private disconnectResizeObserver(): void {
    this._ro?.disconnect();
    this._ro = null;
  }

  private addContextListeners(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }
    canvas.addEventListener('webglcontextlost', this._contextLostHandler, false);
    canvas.addEventListener('webglcontextrestored', this._contextRestoredHandler, false);
  }

  private removeContextListeners(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }
    canvas.removeEventListener('webglcontextlost', this._contextLostHandler, false);
    canvas.removeEventListener('webglcontextrestored', this._contextRestoredHandler, false);
  }

  private attachInputListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', this._pointerDownHandler);
    canvas.addEventListener('pointermove', this._pointerMoveHandler);
    canvas.addEventListener('pointerup', this._pointerUpHandler);
    canvas.addEventListener('pointercancel', this._pointerCancelHandler);
    canvas.addEventListener('wheel', this._wheelHandler, { passive: false });
    canvas.addEventListener('keydown', this._keyHandler);
  }

  private detachInputListeners(): void {
    const canvas = this._canvasElement;
    if (!canvas) {
      return;
    }
    canvas.removeEventListener('pointerdown', this._pointerDownHandler);
    canvas.removeEventListener('pointermove', this._pointerMoveHandler);
    canvas.removeEventListener('pointerup', this._pointerUpHandler);
    canvas.removeEventListener('pointercancel', this._pointerCancelHandler);
    canvas.removeEventListener('wheel', this._wheelHandler);
    canvas.removeEventListener('keydown', this._keyHandler);
    this._canvasElement = null;
  }

  private handlePointerDown(event: PointerEvent): void {
    this._canvasElement?.focus();
    this.activeControls?.onPointerDown(event);
    this.requestRender();
  }

  private handlePointerMove(event: PointerEvent): void {
    this.activeControls?.onPointerMove(event);
    this.requestRender();
  }

  private handlePointerUp(event: PointerEvent): void {
    this.activeControls?.onPointerUp(event);
    this.requestRender();
  }

  private handleWheel(event: WheelEvent): void {
    this.activeControls?.onWheel(event);
    this.requestRender();
  }

  private handleKey(event: KeyboardEvent): void {
    this.activeControls?.onKey(event);
    this.requestRender();
  }

  private get activeControls(): Controls2D | Controls3D | null {
    return this.dimensionality === 2 ? this._controls2d : this._controls3d;
  }
}

function mat3ToMat4(out: Float32Array, mat: Float32Array): Float32Array {
  out[0] = mat[0];
  out[1] = mat[1];
  out[2] = 0;
  out[3] = mat[2];

  out[4] = mat[3];
  out[5] = mat[4];
  out[6] = 0;
  out[7] = mat[5];

  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;

  out[12] = mat[6];
  out[13] = mat[7];
  out[14] = 0;
  out[15] = mat[8];
  return out;
}
