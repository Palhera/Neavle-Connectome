import { TestBed } from '@angular/core/testing';
import { ConnectomeCanvasComponent } from './connectome-canvas.component';

// Ensure ResizeObserver exists in the test env with correct type
class FakeResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_cb: ResizeObserverCallback) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  observe(_el: Element): void {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  unobserve(_el: Element): void {}
  disconnect(): void {}
}

declare global {
  interface Window {
    ResizeObserver: typeof ResizeObserver;
  }
}

if (!('ResizeObserver' in window)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
}

describe('ConnectomeCanvasComponent', () => {
  let requestAnimationFrameSpy: jasmine.Spy<typeof window.requestAnimationFrame>;
  let cancelAnimationFrameSpy: jasmine.Spy<typeof window.cancelAnimationFrame>;

  const noop = () => {};

  const fakeGl = {
    COLOR_BUFFER_BIT: 0x4000,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88e4,
    FLOAT: 0x1406,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: true,
    LINK_STATUS: true,
    clearColor: noop,
    clear: noop,
    createShader: () => ({}) as WebGLShader,
    shaderSource: noop,
    compileShader: noop,
    getShaderParameter: () => true,
    getShaderInfoLog: () => '',
    createProgram: () => ({}) as WebGLProgram,
    attachShader: noop,
    linkProgram: noop,
    getProgramParameter: () => true,
    getProgramInfoLog: () => '',
    useProgram: noop,
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}) as WebGLUniformLocation,
    createBuffer: () => ({}) as WebGLBuffer,
    bindBuffer: noop,
    bufferData: noop,
    enableVertexAttribArray: noop,
    vertexAttribPointer: noop,
    viewport: noop,
    drawArrays: noop,
    createVertexArray: () => ({}) as WebGLVertexArrayObject,
    bindVertexArray: noop,
    uniform1f: noop,
    deleteProgram: noop,
    deleteShader: noop,
    deleteBuffer: noop,
    deleteVertexArray: noop,
  } as unknown as WebGL2RenderingContext;

  beforeEach(() => {
    spyOn(HTMLCanvasElement.prototype, 'getContext').and.returnValue(fakeGl);

    requestAnimationFrameSpy = spyOn(window, 'requestAnimationFrame').and.callFake(
      (cb: FrameRequestCallback) => {
        window.setTimeout(() => cb(0), 0);
        return 1;
      },
    );

    cancelAnimationFrameSpy = spyOn(window, 'cancelAnimationFrame');
    spyOnProperty(window, 'devicePixelRatio', 'get').and.returnValue(1.5);

    TestBed.configureTestingModule({
      imports: [ConnectomeCanvasComponent],
    });
  });

  it('creates component', () => {
    const fixture = TestBed.createComponent(ConnectomeCanvasComponent);
    expect(fixture.componentInstance).toBeTruthy();
    fixture.detectChanges();
  });

  it('schedules a frame on requestRender', () => {
    const fixture = TestBed.createComponent(ConnectomeCanvasComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.requestRender();

    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrameSpy).not.toHaveBeenCalled();
  });
});
