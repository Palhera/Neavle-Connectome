import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  Connectome,
  ConnectomeCanvasComponent,
  ConnectomeEdge,
  ConnectomeNode,
} from '@neavle/connectome';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Connectome, ConnectomeCanvasComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('connectome-demo');

  nodes: ConnectomeNode[] = [
    { id: 'a', x: -12, y: 12 },
    { id: 'b', x: 12, y: 12 },
    { id: 'c', x: -12, y: -12 },
    { id: 'd', x: 12, y: -12 },
  ];
  edges: ConnectomeEdge[] = [
    { source: 'a', target: 'b' },
    { source: 'a', target: 'c' },
    { source: 'b', target: 'd' },
    { source: 'c', target: 'd' },
  ];

  readonly canvasBackground: [number, number, number, number] = [0.05, 0.05, 0.07, 1];
}
