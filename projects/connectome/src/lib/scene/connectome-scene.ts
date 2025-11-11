export interface SceneNode {
  id: string | number;
  x: number;
  y: number;
  z?: number;
  size: number;
  color: number;
  visible: boolean;
  targetX?: number;
  targetY?: number;
  targetZ?: number;
  targetColor?: number;
  velocity?: number;
}

export interface SceneLink {
  id: string | number;
  source: string | number;
  target: string | number;
  color: number;
  visible: boolean;
  targetColor?: number;
}

const DEFAULT_NODE_SIZE = 0.5;
const DEFAULT_COLOR = 0xffffffff;
const REMOVAL_ALPHA_THRESHOLD = 13; // ~5%

export class ConnectomeScene {
  public readonly nodes = new Map<string | number, SceneNode>();
  public readonly links = new Map<string | number, SceneLink>();
  private readonly _tmpColor = new Uint8Array(4);
  private readonly _tmpTargetColor = new Uint8Array(4);

  update(data: { nodes?: Array<Partial<SceneNode>>; links?: Array<Partial<SceneLink>> }): void {
    const { nodes = [], links = [] } = data ?? {};

    for (const patch of nodes) {
      if (patch.id === undefined) {
        continue;
      }
      const existing = this.nodes.get(patch.id);
      if (!existing) {
        const node: SceneNode = {
          id: patch.id,
          x: patch.x ?? 0,
          y: patch.y ?? 0,
          z: patch.z ?? 0,
          size: patch.size ?? DEFAULT_NODE_SIZE,
          color: patch.color ?? DEFAULT_COLOR,
          visible: patch.visible ?? true,
        };
        if (patch.targetX !== undefined) {
          node.targetX = patch.targetX;
        }
        if (patch.targetY !== undefined) {
          node.targetY = patch.targetY;
        }
        if (patch.targetZ !== undefined) {
          node.targetZ = patch.targetZ;
        }
        if (patch.targetColor !== undefined) {
          node.targetColor = patch.targetColor;
        }
        if (patch.velocity !== undefined) {
          node.velocity = patch.velocity;
        }
        this.nodes.set(patch.id, node);
      } else {
        if (patch.size !== undefined) {
          existing.size = patch.size;
        }
        if (patch.visible !== undefined) {
          existing.visible = patch.visible;
        }
        if (patch.velocity !== undefined) {
          existing.velocity = patch.velocity;
        }
        if (patch.x !== undefined) {
          existing.targetX = patch.x;
        }
        if (patch.y !== undefined) {
          existing.targetY = patch.y;
        }
        if (patch.z !== undefined) {
          existing.targetZ = patch.z;
        }
        if (patch.color !== undefined) {
          existing.targetColor = patch.color;
        }
      }
    }

    for (const patch of links) {
      if (patch.id === undefined || patch.source === undefined || patch.target === undefined) {
        continue;
      }
      const existing = this.links.get(patch.id);
      if (!existing) {
        const link: SceneLink = {
          id: patch.id,
          source: patch.source,
          target: patch.target,
          color: patch.color ?? DEFAULT_COLOR,
          visible: patch.visible ?? true,
        };
        if (patch.targetColor !== undefined) {
          link.targetColor = patch.targetColor;
        }
        this.links.set(patch.id, link);
      } else {
        existing.source = patch.source;
        existing.target = patch.target;
        if (patch.visible !== undefined) {
          existing.visible = patch.visible;
        }
        if (patch.color !== undefined) {
          existing.targetColor = patch.color;
        }
      }
    }
  }

  remove(ids: Array<string | number>, type: 'node' | 'link'): void {
    if (!ids.length) {
      return;
    }
    const collection = type === 'node' ? this.nodes : this.links;
    for (const id of ids) {
      const item = collection.get(id);
      if (!item) {
        continue;
      }
      item.visible = false;
      const faded = (item.color ?? DEFAULT_COLOR) & 0x00ffffff;
      if (type === 'node') {
        (item as SceneNode).targetColor = faded;
      } else {
        (item as SceneLink).targetColor = faded;
      }
    }
  }

  animate(dt: number): boolean {
    if (dt <= 0) {
      return false;
    }
    const smoothing = 1 - Math.pow(1 - 0.15, dt * 60);
    const epsilon = 1e-3;
    let changed = false;

    for (const node of this.nodes.values()) {
      changed = this.animateNode(node, smoothing, epsilon) || changed;
    }

    for (const link of this.links.values()) {
      changed = this.animateLink(link, smoothing) || changed;
    }

    return changed;
  }

  private animateNode(node: SceneNode, factor: number, epsilon: number): boolean {
    let dirty = false;

    if (node.targetX !== undefined) {
      const delta = node.targetX - node.x;
      if (Math.abs(delta) > epsilon) {
        node.x += delta * factor;
        dirty = true;
      } else {
        node.x = node.targetX;
        node.targetX = undefined;
      }
    }

    if (node.targetY !== undefined) {
      const delta = node.targetY - node.y;
      if (Math.abs(delta) > epsilon) {
        node.y += delta * factor;
        dirty = true;
      } else {
        node.y = node.targetY;
        node.targetY = undefined;
      }
    }

    if (node.targetZ !== undefined) {
      const currentZ = node.z ?? 0;
      const delta = node.targetZ - currentZ;
      if (Math.abs(delta) > epsilon) {
        node.z = currentZ + delta * factor;
        dirty = true;
      } else {
        node.z = node.targetZ;
        node.targetZ = undefined;
      }
    }

    if (node.targetColor !== undefined) {
      const result = this.lerpColor(node.color, node.targetColor, factor);
      if (result.changed) {
        node.color = result.value;
        dirty = true;
      } else {
        node.color = node.targetColor;
        node.targetColor = undefined;
      }
    } else if (!node.visible && ((node.color >>> 24) & 0xff) > 0) {
      // Ensure invisible nodes fade out.
      const faded = node.color & 0x00ffffff;
      const result = this.lerpColor(node.color, faded, factor);
      if (result.changed) {
        node.color = result.value;
        dirty = true;
      }
    }

    const alpha = (node.color >>> 24) & 0xff;
    if (!node.visible && alpha <= REMOVAL_ALPHA_THRESHOLD) {
      this.nodes.delete(node.id);
      dirty = true;
    }

    return dirty;
  }

  private animateLink(link: SceneLink, factor: number): boolean {
    let dirty = false;
    if (link.targetColor !== undefined) {
      const result = this.lerpColor(link.color, link.targetColor, factor);
      if (result.changed) {
        link.color = result.value;
        dirty = true;
      } else {
        link.color = link.targetColor;
        link.targetColor = undefined;
      }
    } else if (!link.visible && ((link.color >>> 24) & 0xff) > 0) {
      const faded = link.color & 0x00ffffff;
      const result = this.lerpColor(link.color, faded, factor);
      if (result.changed) {
        link.color = result.value;
        dirty = true;
      }
    }

    const alpha = (link.color >>> 24) & 0xff;
    if (!link.visible && alpha <= REMOVAL_ALPHA_THRESHOLD) {
      this.links.delete(link.id);
      dirty = true;
    }

    return dirty;
  }

  private lerpColor(
    current: number,
    target: number,
    amount: number,
  ): { value: number; changed: boolean } {
    if (current === target) {
      return { value: current >>> 0, changed: false };
    }

    const curr = this.unpackColor(current, this._tmpColor);
    const targ = this.unpackColor(target, this._tmpTargetColor);

    const r = this.lerpComponent(curr[0], targ[0], amount);
    const g = this.lerpComponent(curr[1], targ[1], amount);
    const b = this.lerpComponent(curr[2], targ[2], amount);
    const a = this.lerpComponent(curr[3], targ[3], amount);

    const packed = ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
    return { value: packed >>> 0, changed: packed !== current };
  }

  private unpackColor(color: number, out: Uint8Array): Uint8Array {
    out[0] = color & 0xff;
    out[1] = (color >>> 8) & 0xff;
    out[2] = (color >>> 16) & 0xff;
    out[3] = (color >>> 24) & 0xff;
    return out;
  }

  private lerpComponent(current: number, target: number, factor: number): number {
    if (Math.abs(target - current) < 1) {
      return target;
    }
    return Math.round(current + (target - current) * factor);
  }
}
