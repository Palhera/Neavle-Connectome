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
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
    { id: 'c', label: 'Gamma' },
    { id: 'd', label: 'Delta' },
  ];
  edges: ConnectomeEdge[] = [
    { source: 'a', target: 'b' },
    { source: 'a', target: 'c' },
    { source: 'b', target: 'd' },
    { source: 'c', target: 'd' },
  ];

  readonly canvasBackground: [number, number, number, number] = [0.05, 0.05, 0.07, 1];
}
