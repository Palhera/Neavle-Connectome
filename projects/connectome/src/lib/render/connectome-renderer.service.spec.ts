import { TestBed } from '@angular/core/testing';
import { ConnectomeData } from '../api/types';
import { ConnectomeRenderer } from './connectome-renderer.service';

describe('ConnectomeRenderer', () => {
  let service: ConnectomeRenderer;
  let gl: WebGL2RenderingContext;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConnectomeRenderer);
    gl = createFakeGl();
  });

  afterEach(() => {
    service.dispose();
  });

  it('initializes without errors', () => {
    expect(() => service.init(gl, 2)).not.toThrow();
  });

  it('accepts data updates', () => {
    service.init(gl, 2);
    const data: ConnectomeData = {
      nodes: [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 1, y: 0 },
        { id: 'c', x: 0, y: 1 },
      ],
      links: [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
      ],
    };
    expect(() => service.setData(data)).not.toThrow();
  });

  it('draws without errors', () => {
    service.init(gl, 2);
    service.setData({
      nodes: [{ id: 'a', x: 0, y: 0 }],
      links: [],
    });
    const identity = new Float32Array([
      1, 0, 0, 0, //
      0, 1, 0, 0, //
      0, 0, 1, 0, //
      0, 0, 0, 1,
    ]);
    expect(() => service.draw(identity, identity)).not.toThrow();
  });
});

function createFakeGl(): WebGL2RenderingContext {
  const shaders = new Set<WebGLShader>();
  const programs = new Set<WebGLProgram>();
  const gl: Partial<WebGL2RenderingContext> & Record<string, unknown> = {
    TRIANGLES: 0x0004,
    LINES: 0x0001,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88e4,
    DYNAMIC_DRAW: 0x88e8,
    FLOAT: 0x1406,
    UNSIGNED_INT: 0x1405,
    COLOR_BUFFER_BIT: 0x4000,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
  };

  gl.createShader = () => {
    const shader = {} as WebGLShader;
    shaders.add(shader);
    return shader;
  };
  gl.shaderSource = () => {};
  gl.compileShader = () => {};
  gl.getShaderParameter = () => true;
  gl.getShaderInfoLog = () => '';
  gl.deleteShader = () => {};
  gl.isShader = (obj: WebGLShader) => shaders.has(obj);

  gl.createProgram = () => {
    const program = {} as WebGLProgram;
    programs.add(program);
    return program;
  };
  gl.attachShader = () => {};
  gl.linkProgram = () => {};
  gl.getProgramParameter = () => true;
  gl.getProgramInfoLog = () => '';
  gl.deleteProgram = () => {};
  gl.isProgram = (obj: WebGLProgram) => programs.has(obj);

  gl.createVertexArray = () => ({} as WebGLVertexArrayObject);
  gl.bindVertexArray = () => {};
  gl.deleteVertexArray = () => {};

  gl.createBuffer = () => ({} as WebGLBuffer);
  gl.bindBuffer = () => {};
  gl.deleteBuffer = () => {};
  gl.bufferData = () => {};
  gl.bufferSubData = () => {};
  gl.vertexAttribPointer = () => {};
  gl.vertexAttribIPointer = () => {};
  gl.enableVertexAttribArray = () => {};
  gl.vertexAttribDivisor = () => {};

  gl.useProgram = () => {};
  gl.uniformMatrix4fv = () => {};
  gl.getUniformLocation = () => ({} as WebGLUniformLocation);

  gl.drawArraysInstanced = () => {};
  gl.clear = () => {};
  gl.clearColor = () => {};
  gl.viewport = () => {};

  return gl as WebGL2RenderingContext;
}
