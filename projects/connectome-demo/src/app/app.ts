import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Connectome } from '@neavle/connectome';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Connectome],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('connectome-demo');
}
