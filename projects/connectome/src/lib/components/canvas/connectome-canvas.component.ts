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

type Vec4 = [number, number, number, number];

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

  protected _ariaStatus = 'Canvas ready';

  private readonly zone = inject(NgZone);
  private _gl: WebGL2RenderingContext | null = null;
  private _ro: ResizeObserver | null = null;
  private _rafId: number | null = null;
  private _zoom = 1;
  private _canvasWidth = 0;
  private _canvasHeight = 0;
  private _vao: WebGLVertexArrayObject | null = null;
  private _program: WebGLProgram | null = null;
  private _vertexShader: WebGLShader | null = null;
  private _fragmentShader: WebGLShader | null = null;
  private _vertexBuffer: WebGLBuffer | null = null;
  private _scaleUniform: WebGLUniformLocation | null = null;

  private readonly _renderFrame = () => {
    this._rafId = null;
    this.drawFrame();
  };

  private readonly _contextLostHandler = (event: Event) => {
    event.preventDefault();
    this.stopRenderLoop();
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
    this.releaseGlResources();
    this.removeContextListeners();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['background'] && !changes['background'].firstChange) {
      this.requestRender();
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

    this.releaseGlResources();
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
    this.setupPipeline(ctx);
    this.observeCanvasSize(canvas);
    this.requestRender();
  }

  private setupPipeline(gl: WebGL2RenderingContext): void {
    const vertexSource = `#version 300 es
precision highp float;
in vec2 a_position;
uniform float u_scale;
void main() {
  vec2 scaled = a_position * u_scale;
  gl_Position = vec4(scaled, 0.0, 1.0);
}`;

    const fragmentSource = `#version 300 es
precision highp float;
out vec4 outColor;
void main() {
  outColor = vec4(0.7, 0.8, 0.95, 1.0);
}`;

    this._vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    this._fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    this._program = this.linkProgram(gl, this._vertexShader, this._fragmentShader);

    const scaleUniform: WebGLUniformLocation | null = gl.getUniformLocation(
      this._program,
      'u_scale',
    );
    if (!scaleUniform) {
      throw new Error('Failed to locate u_scale uniform.');
    }
    this._scaleUniform = scaleUniform;

    this._vao = gl.createVertexArray();
    if (!this._vao) {
      throw new Error('Failed to create vertex array.');
    }
    gl.bindVertexArray(this._vao);

    this._vertexBuffer = gl.createBuffer();
    if (!this._vertexBuffer) {
      throw new Error('Failed to create vertex buffer.');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    const triangleVertices = new Float32Array([0, 0.6, -0.5, -0.3, 0.5, -0.3]);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);

    const positionLocation: number = gl.getAttribLocation(this._program, 'a_position');
    if (positionLocation === -1) {
      throw new Error('Failed to locate a_position attribute.');
    }

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
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
    if (!gl || !this._program || !this._vao || !this._scaleUniform) {
      return;
    }

    gl.viewport(0, 0, this._canvasWidth, this._canvasHeight);
    const bg = this.background;
    gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this._program);
    gl.bindVertexArray(this._vao);
    gl.uniform1f(this._scaleUniform, this._zoom);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  private compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Unable to allocate shader.');
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS) as boolean;
    if (!compiled) {
      const log = gl.getShaderInfoLog(shader) ?? 'Unknown shader error.';
      gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${log}`);
    }
    return shader;
  }

  private linkProgram(
    gl: WebGL2RenderingContext,
    vertex: WebGLShader,
    fragment: WebGLShader,
  ): WebGLProgram {
    const program = gl.createProgram();
    if (!program) {
      throw new Error('Unable to allocate program.');
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS) as boolean;
    if (!linked) {
      const log = gl.getProgramInfoLog(program) ?? 'Unknown program error.';
      gl.deleteProgram(program);
      throw new Error(`Program linking failed: ${log}`);
    }
    return program;
  }

  private adjustZoom(delta: number): void {
    const nextZoom = Math.min(3, Math.max(0.25, this._zoom + delta));
    if (nextZoom === this._zoom) {
      return;
    }
    this._zoom = nextZoom;
    this._ariaStatus = `Zoom ${(this._zoom * 100).toFixed(0)}%`;
    this.requestRender();
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

  private releaseGlResources(): void {
    const gl = this._gl;
    if (!gl) {
      return;
    }

    if (this._vao) {
      gl.deleteVertexArray(this._vao);
      this._vao = null;
    }
    if (this._vertexBuffer) {
      gl.deleteBuffer(this._vertexBuffer);
      this._vertexBuffer = null;
    }
    if (this._program) {
      gl.deleteProgram(this._program);
      this._program = null;
    }
    if (this._vertexShader) {
      gl.deleteShader(this._vertexShader);
      this._vertexShader = null;
    }
    if (this._fragmentShader) {
      gl.deleteShader(this._fragmentShader);
      this._fragmentShader = null;
    }

    this._scaleUniform = null;
    this._gl = null;
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
