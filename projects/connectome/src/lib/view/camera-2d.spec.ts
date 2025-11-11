import { Camera2D } from './camera-2d';

describe('Camera2D', () => {
  it('anchors zoom around cursor', () => {
    const cam = new Camera2D();
    cam.setViewport(800, 600, 1);
    const point = { x: 50, y: -20 };
    const before = screenDelta(cam, point);
    cam.zoomAt(2, point.x, point.y);
    const after = screenDelta(cam, point);
    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
  });

  it('clamps zoom between min and max', () => {
    const cam = new Camera2D();
    cam.minZoom = 0.5;
    cam.maxZoom = 2;
    cam.zoomAt(10, 0, 0);
    expect(cam.zoom).toBe(2);
    cam.zoomAt(0.01, 0, 0);
    expect(cam.zoom).toBe(0.5);
  });
});

function screenDelta(cam: Camera2D, point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: (point.x - cam.position[0]) * cam.zoom,
    y: (point.y - cam.position[1]) * cam.zoom,
  };
}
