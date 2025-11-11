import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { ConnectomeRenderer } from '../../render/connectome-renderer.service';
import { ConnectomeData, Dimensionality } from '../../api/types';

type Vec4 = [number, number, number, number];

const createIdentity = (): Float32Array =>
  new Float32Array([
    1,
    0,
    0,
    0, //
    0,
    1,
    0,
    0, //
    0,
    0,
    1,
    0, //
    0,
    0,
    0,
    1,
  ]);

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

  protected _ariaStatus = 'Canvas ready';

  private readonly renderer = inject(ConnectomeRenderer);
  private readonly zone = inject(NgZone);

  private _gl: WebGL2RenderingContext | null = null;
  private _ro: ResizeObserver | null = null;
  private _rafId: number | null = null;
  private _zoom = 1;
  private _canvasWidth = 0;
  private _canvasHeight = 0;
  private _pendingDataUpdate = false;

  private readonly _viewMatrix = createIdentity();
  private readonly _projMatrix = createIdentity();

  private readonly _renderFrame = () => {
    this._rafId = null;
    this.drawFrame();
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

  get gl(): WebGL2RenderingContext | null {
    return this._gl;
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.initializeContext());
  }

  ngOnDestroy(): void {
    this.stopRenderLoop();
    this.disconnectResizeObserver();
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

    if (changes['dimensionality'] && !changes['dimensionality'].firstChange && this._gl) {
      this.renderer.init(this._gl, this.dimensionality);
      this.pushDataToRenderer(true);
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
    this._zoom = 1;
    this.updateViewMatrix();
    this._ariaStatus = 'Zoom 100%';
    this.requestRender();
  }

  @HostListener('keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.key === '+' || event.key === '=') {
      this.adjustZoom(0.1);
    } else if (event.key === '-' || event.key === '_') {
      this.adjustZoom(-0.1);
    }
  }

  private initializeContext(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }

    this.renderer.dispose();
    this.disconnectResizeObserver();
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
    this.observeCanvasSize(canvas);
    this.pushDataToRenderer(true);
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
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    this.requestRender();
  }

  private drawFrame(): void {
    const gl = this._gl;
    if (!gl) {
      return;
    }

    gl.viewport(0, 0, this._canvasWidth, this._canvasHeight);
    const bg = this.background;
    gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.renderer.draw(this._viewMatrix, this._projMatrix);
  }

  private adjustZoom(delta: number): void {
    const nextZoom = Math.min(3, Math.max(0.25, this._zoom + delta));
    if (nextZoom === this._zoom) {
      return;
    }
    this._zoom = nextZoom;
    this.updateViewMatrix();
    this._ariaStatus = `Zoom ${(this._zoom * 100).toFixed(0)}%`;
    this.requestRender();
  }

  private updateViewMatrix(): void {
    this._viewMatrix[0] = this._zoom;
    this._viewMatrix[5] = this._zoom;
    this._viewMatrix[10] = this._zoom;
  }

  private stopRenderLoop(): void {
    if (this._rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this._rafId);
      this._rafId = null;
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
}
