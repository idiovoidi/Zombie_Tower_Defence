import { describe, expect, it, vi } from 'vitest';

// Scene-graph stand-ins: enough of Container/Graphics for the rig to build, pose and flip
vi.mock('pixi.js', () => {
  class Point {
    x = 0;
    y = 0;
    set(x: number, y = x) {
      this.x = x;
      this.y = y;
    }
  }
  class Container {
    children: Container[] = [];
    parent: Container | null = null;
    position = new Point();
    pivot = new Point();
    scale = new Point();
    visible = true;
    alpha = 1;
    rotation = 0;
    tint = 0xffffff;
    filters: unknown = null;
    destroyed = false;
    constructor() {
      this.scale.set(1, 1);
    }
    get x() {
      return this.position.x;
    }
    set x(v: number) {
      this.position.x = v;
    }
    get y() {
      return this.position.y;
    }
    set y(v: number) {
      this.position.y = v;
    }
    addChild(child: Container) {
      child.parent = this;
      this.children.push(child);
      return child;
    }
    addChildAt(child: Container, index: number) {
      child.parent = this;
      this.children.splice(index, 0, child);
      return child;
    }
    getChildIndex(child: Container) {
      return this.children.indexOf(child);
    }
    removeChildren() {
      this.children = [];
    }
    destroy() {
      this.destroyed = true;
    }
  }
  // Every drawing call is chainable and does nothing
  class Graphics extends Container {
    constructor() {
      super();
      // biome-ignore lint/correctness/noConstructorReturn: proxy makes every draw call chainable
      return new Proxy(this, {
        get(target, prop, receiver) {
          if (prop in target) {
            return Reflect.get(target, prop, receiver);
          }
          return () => receiver;
        },
      });
    }
  }
  class ColorMatrixFilter {
    matrix: number[] = [];
  }
  return { Container, Graphics, ColorMatrixFilter };
});

const { BasicZombieRenderer } = await import('../../src/renderers/zombies/BasicZombieRenderer');
const { Container } = await import('pixi.js');

type RigView = {
  rig: {
    body: { scale: { x: number } };
    leftLeg: { root: { visible: boolean }; stump?: { visible: boolean } };
    rightArm: { root: { visible: boolean }; stump?: { visible: boolean } };
  };
};

function state(overrides: Record<string, unknown> = {}) {
  return {
    position: { x: 0, y: 0 },
    health: 100,
    maxHealth: 100,
    speed: 25,
    direction: { x: 1, y: 0 },
    isMoving: true,
    isDamaged: false,
    statusEffects: [],
    limbs: { leftArm: true, rightArm: true, leftLeg: true, rightLeg: true },
    ...overrides,
  };
}

describe('zombie renderer rig', () => {
  it('shows a stump for a lost limb, and it survives wound redraws', () => {
    const r = new BasicZombieRenderer();
    const parent = new Container();
    const limbs = { leftArm: true, rightArm: false, leftLeg: false, rightLeg: true };

    r.render(parent, state({ limbs }));
    const rig = (r as unknown as RigView).rig;
    expect(rig.leftLeg.root.visible).toBe(false);
    expect(rig.leftLeg.stump?.visible).toBe(true);
    expect(rig.rightArm.stump?.visible).toBe(true);

    // Big health drop redraws the wounds layer
    r.render(parent, state({ limbs, health: 20 }));
    expect(rig.leftLeg.stump?.visible).toBe(true);

    // Pool reuse restores the limbs and hides the stumps
    r.reset();
    r.render(parent, state());
    expect(rig.leftLeg.root.visible).toBe(true);
    expect(rig.leftLeg.stump?.visible).toBe(false);
  });

  it('mirrors the body to face the direction of travel', () => {
    const r = new BasicZombieRenderer();
    const parent = new Container();
    r.render(parent, state({ direction: { x: -1, y: 0 } }));
    expect((r as unknown as RigView).rig.body.scale.x).toBe(-1);

    // Heading straight down keeps the last facing
    r.render(parent, state({ direction: { x: 0, y: 1 } }));
    expect(r.getFacing()).toBe(-1);

    r.render(parent, state({ direction: { x: 0.8, y: 0.6 } }));
    expect((r as unknown as RigView).rig.body.scale.x).toBe(1);
  });
});
