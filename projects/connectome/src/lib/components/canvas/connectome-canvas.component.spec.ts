import { TestBed } from '@angular/core/testing';
import { ConnectomeData } from '../../api/types';
import { ConnectomeRenderer } from '../../render/connectome-renderer.service';
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
  let rendererSpy: jasmine.SpyObj<ConnectomeRenderer>;

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

    let handle = 1;
    requestAnimationFrameSpy = spyOn(window, 'requestAnimationFrame').and.callFake(
      (cb: FrameRequestCallback) => {
        cb(0);
        return handle++;
      },
    );

    cancelAnimationFrameSpy = spyOn(window, 'cancelAnimationFrame');
    spyOnProperty(window, 'devicePixelRatio', 'get').and.returnValue(1.5);

    rendererSpy = jasmine.createSpyObj<ConnectomeRenderer>('ConnectomeRenderer', [
      'init',
      'setData',
      'draw',
      'dispose',
    ]);
    rendererSpy.draw.and.callFake(() => {});

    TestBed.configureTestingModule({
      imports: [ConnectomeCanvasComponent],
      providers: [{ provide: ConnectomeRenderer, useValue: rendererSpy }],
    });
  });

  it('creates component', () => {
    const fixture = TestBed.createComponent(ConnectomeCanvasComponent);
    fixture.componentInstance.data = demoData();
    expect(fixture.componentInstance).toBeTruthy();
    fixture.detectChanges();
    expect(rendererSpy.init).toHaveBeenCalled();
    expect(rendererSpy.setData).toHaveBeenCalled();
  });

  it('schedules a frame on requestRender', () => {
    const fixture = TestBed.createComponent(ConnectomeCanvasComponent);
    fixture.componentInstance.data = demoData();
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const rafAccessor = component as unknown as { _rafId: number | null };
    rafAccessor._rafId = null;
    const initialCalls = requestAnimationFrameSpy.calls.count();
    component.requestRender();

    expect(requestAnimationFrameSpy.calls.count()).toBe(initialCalls + 1);
    expect(cancelAnimationFrameSpy).not.toHaveBeenCalled();
  });

  it('handles wheel input without errors', () => {
    const fixture = TestBed.createComponent(ConnectomeCanvasComponent);
    fixture.componentInstance.data = demoData();
    fixture.detectChanges();
    const canvas: HTMLCanvasElement = fixture.nativeElement.querySelector('canvas');
    const event = new WheelEvent('wheel', { deltaY: 10, bubbles: true, cancelable: true });
    canvas.dispatchEvent(event);
    expect(rendererSpy.draw).toHaveBeenCalled();
  });
});

function demoData(): ConnectomeData {
  return {
    nodes: [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 1, y: 1 },
    ],
    links: [{ source: 'a', target: 'b' }],
  };
}
