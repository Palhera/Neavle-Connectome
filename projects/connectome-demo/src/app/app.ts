import { Component, ViewChild, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  Connectome,
  ConnectomeCanvasComponent,
  ConnectomeData,
  ConnectomeFocusBounds,
  Dimensionality,
} from '@neavle/connectome';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Connectome, ConnectomeCanvasComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  @ViewChild('canvasRef')
  canvas?: ConnectomeCanvasComponent;

  protected readonly title = signal('connectome-demo');

  private readonly graph2d: ConnectomeData = {
    nodes: [
      { id: 'alpha', x: -18, y: 18, size: 18, color: 0xffee8844 },
      { id: 'beta', x: 20, y: 16, size: 14, color: 0xff5cf1ff },
      { id: 'gamma', x: -24, y: -15, size: 12, color: 0xffc766ff },
      { id: 'delta', x: 18, y: -18, size: 16, color: 0xff69f08a },
      { id: 'sigma', x: 0, y: 0, size: 10, color: 0xfff4f19c },
    ],
    links: [
      { source: 'alpha', target: 'beta', weight: 1.1, color: 0x8844ddff },
      { source: 'alpha', target: 'gamma', weight: 0.8, color: 0x88ffa86a },
      { source: 'beta', target: 'delta', weight: 1.2, color: 0x889ad7ff },
      { source: 'gamma', target: 'delta', weight: 1, color: 0x88ff7fd7 },
      { source: 'sigma', target: 'alpha', weight: 0.6 },
      { source: 'sigma', target: 'delta', weight: 0.6 },
    ],
    dimensionality: 2,
  };

  private readonly graph3d: ConnectomeData = {
    nodes: [
      { id: 'apoapsis', x: -25, y: 10, z: -10, size: 12, color: 0xffd580ff },
      { id: 'periapsis', x: 25, y: 10, z: 12, size: 12, color: 0xff80f1ff },
      { id: 'xena', x: -10, y: -25, z: 18, size: 11, color: 0xff84ffa6 },
      { id: 'talos', x: 18, y: -18, z: -18, size: 15, color: 0xfff7bb6a },
      { id: 'atlas', x: 0, y: 0, z: 0, size: 18, color: 0xfff0f0f0 },
    ],
    links: [
      { source: 'apoapsis', target: 'periapsis', weight: 1.2 },
      { source: 'apoapsis', target: 'xena', weight: 1 },
      { source: 'periapsis', target: 'talos', weight: 1 },
      { source: 'xena', target: 'atlas', weight: 1 },
      { source: 'talos', target: 'atlas', weight: 1 },
      { source: 'atlas', target: 'apoapsis', weight: 0.8 },
    ],
    dimensionality: 3,
  };

  private readonly bounds2d: ConnectomeFocusBounds = this.computeBounds(this.graph2d);
  private readonly bounds3d: ConnectomeFocusBounds = this.computeBounds(this.graph3d);

  dimensionality: Dimensionality = 2;
  viewStatus = 'Zoom 100%';

  get canvasData(): ConnectomeData {
    return this.dimensionality === 2 ? this.graph2d : this.graph3d;
  }

  setDimensionality(next: Dimensionality): void {
    if (this.dimensionality === next) {
      return;
    }
    this.dimensionality = next;
    this.viewStatus = next === 2 ? 'Zoom 100%' : 'Distance 5.0';
    setTimeout(() => this.canvas?.resetView());
  }

  focusGraph(): void {
    const bounds = this.dimensionality === 2 ? this.bounds2d : this.bounds3d;
    this.canvas?.focusBounds(bounds);
  }

  resetCamera(): void {
    this.canvas?.resetView();
  }

  handleViewChanged(event: { view: Float32Array; proj: Float32Array }): void {
    if (this.dimensionality === 2) {
      const zoom = Math.abs(event.view[0]) || 1;
      this.viewStatus = `Zoom ${Math.round(zoom * 100)}%`;
    } else {
      const view = event.view;
      const tx = view[12];
      const ty = view[13];
      const tz = view[14];
      const r00 = view[0];
      const r01 = view[4];
      const r02 = view[8];
      const r10 = view[1];
      const r11 = view[5];
      const r12 = view[9];
      const r20 = view[2];
      const r21 = view[6];
      const r22 = view[10];
      const camX = -(r00 * tx + r01 * ty + r02 * tz);
      const camY = -(r10 * tx + r11 * ty + r12 * tz);
      const camZ = -(r20 * tx + r21 * ty + r22 * tz);
      const dist = Math.sqrt(camX * camX + camY * camY + camZ * camZ);
      this.viewStatus = `Camera distance ${dist.toFixed(1)}`;
    }
  }

  private computeBounds(data: ConnectomeData): ConnectomeFocusBounds {
    if (!data.nodes.length) {
      return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
    }
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    let hasZ = false;
    for (const node of data.nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
      if (node.z !== undefined) {
        hasZ = true;
        minZ = Math.min(minZ, node.z);
        maxZ = Math.max(maxZ, node.z);
      }
    }
    const bounds: ConnectomeFocusBounds = { minX, minY, maxX, maxY };
    if (hasZ) {
      bounds.minZ = minZ;
      bounds.maxZ = maxZ;
    }
    return bounds;
  }

  readonly canvasBackground: [number, number, number, number] = [0.05, 0.05, 0.07, 1];
}
