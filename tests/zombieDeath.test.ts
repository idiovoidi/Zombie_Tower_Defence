import { beforeEach, describe, expect, test, vi } from 'vitest';

// Minimal Pixi stand-ins with the bits Zombie touches (transform points, children, events)
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
    children: unknown[] = [];
    position = new Point();
    pivot = new Point();
    scale = new Point();
    visible = true;
    alpha = 1;
    parent: unknown = null;
    private handlers = new Map<string, Array<(data: unknown) => void>>();
    addChild(child: unknown) {
      this.children.push(child);
      return child;
    }
    removeChild() {
      return this;
    }
    on(event: string, fn: (data: unknown) => void) {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), fn]);
      return this;
    }
    emit(event: string, data: unknown) {
      for (const fn of this.handlers.get(event) ?? []) fn(data);
      return true;
    }
    removeAllListeners() {
      this.handlers.clear();
      return this;
    }
    destroy() {
      this.children = [];
    }
  }
  class Graphics extends Container {
    clear() {
      return this;
    }
    rect() {
      return this;
    }
    fill() {
      return this;
    }
  }
  return { Container, Graphics };
});

// A fake renderer whose death animation finishes only when the test says so
const deaths: Array<{ killer?: string; angle?: number; finish: () => void }> = [];
vi.mock('../src/renderers/zombies', () => ({
  ZombieRendererFactory: {
    create: () => ({
      setZombieType: vi.fn(),
      render: vi.fn(),
      update: vi.fn(),
      showDamageEffect: vi.fn(),
      reset: vi.fn(),
      destroy: vi.fn(),
      hasRagdollCorpse: () => true,
      takeRagdollCorpse: () => ({ corpse: true }),
      playDeathAnimation: (killer?: string, angle?: number) =>
        new Promise<void>(resolve => deaths.push({ killer, angle, finish: resolve })),
    }),
  },
}));

const { Zombie } = await import('../src/objects/Zombie');

const flush = () => new Promise(r => setTimeout(r, 0));

describe('Zombie death pipeline', () => {
  beforeEach(() => {
    deaths.length = 0;
  });

  test('death carries the killing tower type and the direction away from the source', () => {
    const z = new Zombie('Basic', 100, 100, 1);
    const events: Array<{ killerType: string; impactAngle: number }> = [];
    z.on('zombieDeath', (d: { killerType: string; impactAngle: number }) => events.push(d));

    z.takeDamage(10_000, 'Tesla', 100, 50); // source straight above
    expect(events).toHaveLength(1);
    expect(events[0].killerType).toBe('Tesla');
    expect(events[0].impactAngle).toBeCloseTo(Math.PI / 2); // pushed downwards (+y)
    expect(deaths[0].killer).toBe('Tesla');
  });

  test('a pooled zombie forgets its previous killer', () => {
    const z = new Zombie('Basic', 0, 0, 1);
    z.takeDamage(10_000, 'Shotgun', 10, 0);
    z.init(0, 0, 1);

    const events: Array<{ killerType: string }> = [];
    z.on('zombieDeath', (d: { killerType: string }) => events.push(d));
    z.takeDamage(10_000); // untyped hit (debug kill)
    expect(events[0].killerType).toBe('unknown');
  });

  test('blood and corpse land under the drawn body, including the lane offset', async () => {
    const z = new Zombie('Basic', 200, 300, 1);
    z.pivot.set(-6, 4); // lane offset: drawn 6px right, 4px up
    const deathAt: Array<{ x: number; y: number }> = [];
    const corpseAt: Array<{ x: number; y: number }> = [];
    z.on('zombieDeath', (d: { x: number; y: number }) => deathAt.push(d));
    z.on('zombieCorpse', (d: { x: number; y: number }) => corpseAt.push(d));

    z.takeDamage(10_000, 'Sniper', 0, 300);
    deaths[0].finish();
    await flush();

    expect(deathAt[0]).toMatchObject({ x: 206, y: 296 });
    expect(corpseAt[0]).toMatchObject({ x: 206, y: 296 });
    expect(z.isDeathAnimationComplete()).toBe(true);
  });

  test('a death that finishes after the zombie was reused does not end the new life', async () => {
    const z = new Zombie('Basic', 0, 0, 1);
    const corpses: unknown[] = [];
    z.on('zombieCorpse', c => corpses.push(c));

    z.takeDamage(10_000, 'MachineGun', 10, 0);
    z.init(0, 0, 1); // released and respawned mid-animation
    deaths[0].finish();
    await flush();

    expect(z.isDeathAnimationComplete()).toBe(false);
    expect(z.getIsDying()).toBe(false);
    expect(corpses).toHaveLength(0);
  });

  test('the kill reward is claimed once, only after death', () => {
    const z = new Zombie('Basic', 0, 0, 1);
    expect(z.claimKillReward()).toBe(false); // alive
    z.takeDamage(10_000, 'MachineGun', 10, 0);
    expect(z.claimKillReward()).toBe(true);
    expect(z.claimKillReward()).toBe(false); // still listed while its death animation plays
    z.init(0, 0, 1);
    z.takeDamage(10_000, 'MachineGun', 10, 0);
    expect(z.claimKillReward()).toBe(true); // new life, new reward
  });
});
