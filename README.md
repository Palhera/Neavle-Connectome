# Neavle Connectome

@neavle/connectome is an Angular-first WebGL2 rendering engine built for exploring massive graphs in 2D and 3D. It powers immersive network visualizations with smooth interactions even when thousands of nodes, connections, and annotations are on screen.

## Key features

- Real-time WebGL2 renderer tuned for tens of thousands of nodes and edges
- 2D/3D scene graph with camera controls, selection helpers, and GPU-accelerated layouts
- Angular standalone components that drop into any Angular 20+ workspace
- Extensible data model plus utility APIs for streaming updates and custom shaders

## Installation

```bash
npm install @neavle/connectome
```

Peer dependencies: make sure your host application provides `@angular/core` and `@angular/common` at version `>= 20.0.0`.

## Monorepo layout

- `projects/connectome`: the publishable Angular library (`ng build connectome`)
- `projects/connectome-demo`: a demo application showcasing live graph rendering

To explore the demo locally:

```bash
npm install
npm run start
```

The demo runs at http://localhost:4200 and consumes the local library build.
