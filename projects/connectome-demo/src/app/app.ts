import { Component } from '@angular/core';
import { ConnectomeCanvasComponent, ConnectomeData, ConnectomeScene } from '@neavle/connectome';

@Component({
  selector: 'app-root',
  imports: [ConnectomeCanvasComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly scene = new ConnectomeScene();
  tick = 0;
  readonly canvasBackground: [number, number, number, number] = [0.05, 0.05, 0.07, 1];

  constructor() {
    this.seedScene();
    this.startLoop();
  }

  get canvasData(): ConnectomeData {
    return {
      nodes: [...this.scene.nodes.values()].map((node) => ({
        id: node.id,
        x: node.x,
        y: node.y,
        z: node.z,
        size: node.size,
        color: node.color,
      })),
      links: [...this.scene.links.values()].map((link) => ({
        id: link.id,
        source: link.source,
        target: link.target,
        color: link.color,
      })),
    };
  }

  private seedScene(): void {
    const nodes = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: Math.cos((i / 10) * Math.PI * 2) * 6,
      y: Math.sin((i / 10) * Math.PI * 2) * 6,
      size: 0.6,
      color: 0xff3399ff,
      visible: true,
    }));
    const links = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      source: i,
      target: (i + 1) % 10,
      color: 0xffaaccee,
      visible: true,
    }));
    this.scene.update({ nodes, links });
  }

  private startLoop(): void {
    setInterval(() => {
      this.tick++;
      const nodes = [...this.scene.nodes.values()];
      if (nodes.length) {
        const node = nodes[Math.trunc(Math.random() * nodes.length)];
        node.targetX = node.x + (Math.random() - 0.5) * 4;
        node.targetY = node.y + (Math.random() - 0.5) * 4;
        node.targetColor = 0xff0000ff;
      }

      if (this.tick % 5 === 0) {
        const id = Date.now();
        this.scene.update({
          nodes: [
            {
              id,
              x: Math.random() * 12 - 6,
              y: Math.random() * 12 - 6,
              size: 0.4,
              color: 0xff33cc66,
              visible: true,
            },
          ],
        });
      }

      if (this.tick % 7 === 0 && nodes.length > 4) {
        const victim = nodes[Math.trunc(Math.random() * nodes.length)];
        if (victim) {
          this.scene.remove([victim.id], 'node');
        }
      }
    }, 1000);
  }
}
