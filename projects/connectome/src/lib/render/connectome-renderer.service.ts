import { Injectable } from '@angular/core';
import { ConnectomeData, ConnectomeLink, ConnectomeNode, Dimensionality } from '../api/types';
import { linksFragmentShader } from '../shaders/links.frag';
import { linksVertexShader } from '../shaders/links.vert';
import { nodesFragmentShader } from '../shaders/nodes.frag';
import { nodesVertexShader } from '../shaders/nodes.vert';
import { compileProgram } from '../shaders/util';

@Injectable({
  providedIn: 'root',
})
export class ConnectomeRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private dimensionality: Dimensionality = 2;

  private nodeProgram: WebGLProgram | null = null;
  private nodeUniforms: { view: WebGLUniformLocation | null; proj: WebGLUniformLocation | null } = {
    view: null,
    proj: null,
  };
  private nodeBaseBuffer: WebGLBuffer | null = null;
  private nodeInstanceBuffer: WebGLBuffer | null = null;
  private nodeVao: WebGLVertexArrayObject | null = null;
  private nodeCount = 0;
  private nodeInstanceFloatView = new Float32Array(0);
  private nodeInstanceUintView = new Uint32Array(0);
  private nodeInstanceByteView = new Uint8Array(0);

  private linkProgram: WebGLProgram | null = null;
  private linkUniforms: { view: WebGLUniformLocation | null; proj: WebGLUniformLocation | null } = {
    view: null,
    proj: null,
  };
  private linkBaseBuffer: WebGLBuffer | null = null;
  private linkInstanceBuffer: WebGLBuffer | null = null;
  private linkVao: WebGLVertexArrayObject | null = null;
  private linkCount = 0;
  private linkInstanceFloatView = new Float32Array(0);
  private linkInstanceUintView = new Uint32Array(0);
  private linkInstanceByteView = new Uint8Array(0);

  private data?: ConnectomeData;

  private readonly NODE_INSTANCE_WORDS = 5;
  private readonly LINK_INSTANCE_WORDS = 8;
  private readonly DEFAULT_NODE_COLOR = 0xffffffff;
  private readonly DEFAULT_LINK_COLOR = 0x88ffffff;

  init(gl: WebGL2RenderingContext, dimensionality: Dimensionality): void {
    if (this.gl && this.gl !== gl) {
      this.releaseGlResources();
    }
    this.gl = gl;
    this.dimensionality = dimensionality;
    this.buildPrograms();
  }

  setData(data?: ConnectomeData): void {
    this.data = data;
    if (!this.gl || !this.nodeInstanceBuffer || !this.linkInstanceBuffer) {
      return;
    }

    const nodes = data?.nodes ?? [];
    this.updateNodeInstances(nodes);
    const links = data?.links ?? [];
    this.updateLinkInstances(nodes, links);
  }

  draw(view: Float32Array, proj: Float32Array): void {
    if (!this.gl) {
      return;
    }
    this.drawNodes(view, proj);
    this.drawLinks(view, proj);
  }

  dispose(): void {
    this.releaseGlResources();
    this.gl = null;
  }

  private buildPrograms(): void {
    const gl = this.gl;
    if (!gl) {
      return;
    }
    this.releaseGlResources();

    this.nodeProgram = compileProgram(gl, nodesVertexShader, nodesFragmentShader);
    this.nodeUniforms = {
      view: gl.getUniformLocation(this.nodeProgram, 'u_view'),
      proj: gl.getUniformLocation(this.nodeProgram, 'u_proj'),
    };

    this.linkProgram = compileProgram(gl, linksVertexShader, linksFragmentShader);
    this.linkUniforms = {
      view: gl.getUniformLocation(this.linkProgram, 'u_view'),
      proj: gl.getUniformLocation(this.linkProgram, 'u_proj'),
    };

    this.createNodePipeline(gl);
    this.createLinkPipeline(gl);
    if (this.data) {
      this.setData(this.data);
    }
  }

  private createNodePipeline(gl: WebGL2RenderingContext): void {
    const quadCorners = new Float32Array([
      -0.5, -0.5, //
      0.5, -0.5, //
      -0.5, 0.5, //
      -0.5, 0.5, //
      0.5, -0.5, //
      0.5, 0.5,
    ]);

    this.nodeVao = gl.createVertexArray();
    this.nodeBaseBuffer = gl.createBuffer();
    this.nodeInstanceBuffer = gl.createBuffer();

    gl.bindVertexArray(this.nodeVao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeBaseBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadCorners, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeInstanceBuffer);
    const stride = this.NODE_INSTANCE_WORDS * 4;
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(1, 1);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 3 * 4);
    gl.vertexAttribDivisor(2, 1);

    gl.enableVertexAttribArray(3);
    gl.vertexAttribIPointer(3, 1, gl.UNSIGNED_INT, stride, 4 * 4);
    gl.vertexAttribDivisor(3, 1);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private createLinkPipeline(gl: WebGL2RenderingContext): void {
    const segments = new Float32Array([0, 1]);

    this.linkVao = gl.createVertexArray();
    this.linkBaseBuffer = gl.createBuffer();
    this.linkInstanceBuffer = gl.createBuffer();

    gl.bindVertexArray(this.linkVao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.linkBaseBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, segments, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.linkInstanceBuffer);
    const stride = this.LINK_INSTANCE_WORDS * 4;

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(1, 1);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 3 * 4);
    gl.vertexAttribDivisor(2, 1);

    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 6 * 4);
    gl.vertexAttribDivisor(3, 1);

    gl.enableVertexAttribArray(4);
    gl.vertexAttribIPointer(4, 1, gl.UNSIGNED_INT, stride, 7 * 4);
    gl.vertexAttribDivisor(4, 1);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private updateNodeInstances(nodes: ConnectomeNode[]): void {
    const gl = this.gl;
    if (!gl || !this.nodeInstanceBuffer) {
      return;
    }
    this.nodeCount = nodes.length;
    const wordCount = Math.max(1, this.nodeCount) * this.NODE_INSTANCE_WORDS;
    this.ensureNodeCapacity(wordCount);
    const floats = this.nodeInstanceFloatView;
    const uints = this.nodeInstanceUintView;
    for (let i = 0; i < this.nodeCount; i += 1) {
      const node = nodes[i];
      const base = i * this.NODE_INSTANCE_WORDS;
      floats[base] = node.x;
      floats[base + 1] = node.y;
      floats[base + 2] = this.dimensionality === 3 ? node.z ?? 0 : 0;
      floats[base + 3] = node.size ?? 8;
      uints[base + 4] = normalizeColor(node.color, this.DEFAULT_NODE_COLOR);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeInstanceBuffer);
    const uploadBytes = this.nodeCount * this.NODE_INSTANCE_WORDS * 4;
    gl.bufferData(gl.ARRAY_BUFFER, uploadBytes, gl.DYNAMIC_DRAW);
    if (this.nodeCount > 0) {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.nodeInstanceByteView.subarray(0, uploadBytes));
    }
  }

  private updateLinkInstances(nodes: ConnectomeNode[], links: ConnectomeLink[]): void {
    const gl = this.gl;
    if (!gl || !this.linkInstanceBuffer) {
      return;
    }
    this.linkCount = links.length;
    const wordCount = Math.max(1, this.linkCount) * this.LINK_INSTANCE_WORDS;
    this.ensureLinkCapacity(wordCount);
    const floats = this.linkInstanceFloatView;
    const uints = this.linkInstanceUintView;
    const nodeLookup = new Map<ConnectomeNode['id'], ConnectomeNode>();
    for (const node of nodes) {
      nodeLookup.set(node.id, node);
    }

    for (let i = 0; i < this.linkCount; i += 1) {
      const link = links[i];
      const sourceNode = nodeLookup.get(link.source);
      const targetNode = nodeLookup.get(link.target);
      const base = i * this.LINK_INSTANCE_WORDS;
      const sx = sourceNode?.x ?? 0;
      const sy = sourceNode?.y ?? 0;
      const sz = this.dimensionality === 3 ? sourceNode?.z ?? 0 : 0;
      const tx = targetNode?.x ?? 0;
      const ty = targetNode?.y ?? 0;
      const tz = this.dimensionality === 3 ? targetNode?.z ?? 0 : 0;
      floats[base] = sx;
      floats[base + 1] = sy;
      floats[base + 2] = sz;
      floats[base + 3] = tx;
      floats[base + 4] = ty;
      floats[base + 5] = tz;
      floats[base + 6] = link.weight ?? 1;
      uints[base + 7] = normalizeColor(link.color, this.DEFAULT_LINK_COLOR);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.linkInstanceBuffer);
    const uploadBytes = this.linkCount * this.LINK_INSTANCE_WORDS * 4;
    gl.bufferData(gl.ARRAY_BUFFER, uploadBytes, gl.DYNAMIC_DRAW);
    if (this.linkCount > 0) {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.linkInstanceByteView.subarray(0, uploadBytes));
    }
  }

  private drawNodes(view: Float32Array, proj: Float32Array): void {
    if (!this.gl || !this.nodeProgram || !this.nodeVao || this.nodeCount === 0) {
      return;
    }
    const gl = this.gl;
    gl.useProgram(this.nodeProgram);
    if (this.nodeUniforms.view) {
      gl.uniformMatrix4fv(this.nodeUniforms.view, false, view);
    }
    if (this.nodeUniforms.proj) {
      gl.uniformMatrix4fv(this.nodeUniforms.proj, false, proj);
    }
    gl.bindVertexArray(this.nodeVao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.nodeCount);
    gl.bindVertexArray(null);
  }

  private drawLinks(view: Float32Array, proj: Float32Array): void {
    if (!this.gl || !this.linkProgram || !this.linkVao || this.linkCount === 0) {
      return;
    }
    const gl = this.gl;
    gl.useProgram(this.linkProgram);
    if (this.linkUniforms.view) {
      gl.uniformMatrix4fv(this.linkUniforms.view, false, view);
    }
    if (this.linkUniforms.proj) {
      gl.uniformMatrix4fv(this.linkUniforms.proj, false, proj);
    }
    gl.bindVertexArray(this.linkVao);
    gl.drawArraysInstanced(gl.LINES, 0, 2, this.linkCount);
    gl.bindVertexArray(null);
  }

  private ensureNodeCapacity(words: number): void {
    if (this.nodeInstanceFloatView.length >= words) {
      return;
    }
    const buffer = new ArrayBuffer(words * 4);
    this.nodeInstanceFloatView = new Float32Array(buffer);
    this.nodeInstanceUintView = new Uint32Array(buffer);
    this.nodeInstanceByteView = new Uint8Array(buffer);
  }

  private ensureLinkCapacity(words: number): void {
    if (this.linkInstanceFloatView.length >= words) {
      return;
    }
    const buffer = new ArrayBuffer(words * 4);
    this.linkInstanceFloatView = new Float32Array(buffer);
    this.linkInstanceUintView = new Uint32Array(buffer);
    this.linkInstanceByteView = new Uint8Array(buffer);
  }

  private releaseGlResources(): void {
    const gl = this.gl;
    if (!gl) {
      this.nodeProgram = null;
      this.linkProgram = null;
      this.nodeVao = null;
      this.linkVao = null;
      return;
    }
    if (this.nodeVao) {
      gl.deleteVertexArray(this.nodeVao);
      this.nodeVao = null;
    }
    if (this.nodeBaseBuffer) {
      gl.deleteBuffer(this.nodeBaseBuffer);
      this.nodeBaseBuffer = null;
    }
    if (this.nodeInstanceBuffer) {
      gl.deleteBuffer(this.nodeInstanceBuffer);
      this.nodeInstanceBuffer = null;
    }
    if (this.nodeProgram) {
      gl.deleteProgram(this.nodeProgram);
      this.nodeProgram = null;
    }
    if (this.linkVao) {
      gl.deleteVertexArray(this.linkVao);
      this.linkVao = null;
    }
    if (this.linkBaseBuffer) {
      gl.deleteBuffer(this.linkBaseBuffer);
      this.linkBaseBuffer = null;
    }
    if (this.linkInstanceBuffer) {
      gl.deleteBuffer(this.linkInstanceBuffer);
      this.linkInstanceBuffer = null;
    }
    if (this.linkProgram) {
      gl.deleteProgram(this.linkProgram);
      this.linkProgram = null;
    }
    this.nodeUniforms = { view: null, proj: null };
    this.linkUniforms = { view: null, proj: null };
    this.nodeCount = 0;
    this.linkCount = 0;
  }
}

function normalizeColor(color: number | undefined, fallback: number): number {
  if (typeof color === 'number' && Number.isFinite(color)) {
    return color >>> 0;
  }
  return fallback;
}
