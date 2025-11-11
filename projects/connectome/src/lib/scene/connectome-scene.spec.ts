import { ConnectomeScene } from './connectome-scene';

describe('ConnectomeScene', () => {
  it('adds nodes with defaults via update', () => {
    const scene = new ConnectomeScene();
    scene.update({
      nodes: [{ id: 'a', x: 1, y: 2 }],
    });
    const node = scene.nodes.get('a');
    expect(node).toBeDefined();
    expect(node?.size).toBeCloseTo(0.5);
    expect(node?.color).toBe(0xffffffff);
    expect(node?.visible).toBeTrue();
  });

  it('animates node positions toward targets', () => {
    const scene = new ConnectomeScene();
    scene.update({
      nodes: [{ id: 'b', x: 0, y: 0 }],
    });
    const node = scene.nodes.get('b');
    expect(node).toBeDefined();
    if (node) {
      node.targetX = 10;
      node.targetY = 10;
    }
    scene.animate(0.5);
    expect(node?.x ?? 0).toBeGreaterThan(0);
    expect(node?.y ?? 0).toBeGreaterThan(0);
    scene.animate(1);
    expect(node?.x ?? 0).toBeCloseTo(10, 1);
    expect(node?.y ?? 0).toBeCloseTo(10, 1);
  });

  it('removes nodes after fade out', () => {
    const scene = new ConnectomeScene();
    scene.update({
      nodes: [{ id: 'c', x: 0, y: 0, color: 0xffffffff }],
    });
    scene.remove(['c'], 'node');
    expect(scene.nodes.has('c')).toBeTrue();
    for (let i = 0; i < 20; i += 1) {
      scene.animate(0.5);
    }
    expect(scene.nodes.has('c')).toBeFalse();
  });
});
