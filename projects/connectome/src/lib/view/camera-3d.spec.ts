import { Camera3D } from './camera-3d';

describe('Camera3D', () => {
  it('clamps elevation during orbit', () => {
    const cam = new Camera3D();
    cam.orbit(0, 10);
    expect(cam.elevation).toBeLessThan(Math.PI / 2);
    cam.orbit(0, -10);
    expect(cam.elevation).toBeGreaterThan(-Math.PI / 2);
  });

  it('respects distance bounds when dollying', () => {
    const cam = new Camera3D();
    cam.minDistance = 1;
    cam.maxDistance = 10;
    cam.dolly(5);
    expect(cam.distance).toBeLessThanOrEqual(10);
    cam.dolly(-10);
    expect(cam.distance).toBeGreaterThanOrEqual(1);
  });

  it('updates projection when viewport aspect changes', () => {
    const cam = new Camera3D();
    const projA = new Float32Array(16);
    const projB = new Float32Array(16);
    cam.setViewport(800, 600, 1);
    cam.toProj(projA);
    cam.setViewport(600, 800, 1);
    cam.toProj(projB);
    expect(Array.from(projA)).not.toEqual(Array.from(projB));
  });
});
