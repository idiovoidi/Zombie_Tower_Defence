import { describe, expect, it, vi } from 'vitest';
import {
  calculateDeathImpulses,
  createRagdollConfig,
  createRagdollStyle,
} from '../../src/renderers/zombies/RagdollConfig';
import { RagdollGore } from '../../src/renderers/zombies/RagdollGore';
import { RagdollSkeleton } from '../../src/renderers/zombies/RagdollSkeleton';

function makeSkeleton(type = 'Basic', killer = 'MachineGun') {
  const config = createRagdollConfig(type, 18);
  const skeleton = new RagdollSkeleton(config);
  skeleton.initializeFromPose(0, 0, 0);
  skeleton.applyImpulses(calculateDeathImpulses(killer, 0.3, type));
  return skeleton;
}

function run(skeleton: RagdollSkeleton, ms: number) {
  for (let t = 0; t < ms; t += 16) {
    skeleton.update(16);
  }
}

describe('ragdoll skeleton', () => {
  it('has two-segment limbs with elbows and knees', () => {
    const names = createRagdollConfig('Basic').bones.map(b => b.name);
    for (const n of ['forearm_l', 'forearm_r', 'shin_l', 'shin_r']) {
      expect(names).toContain(n);
    }
  });

  it('keeps joints attached while falling and settles on the ground', () => {
    const skeleton = makeSkeleton();
    run(skeleton, 3000);
    expect(skeleton.isSettled()).toBe(true);
    const torso = skeleton.getBone('torso');
    const head = skeleton.getBone('head');
    const groundY = createRagdollConfig('Basic', 18).groundY;
    expect(torso).toBeDefined();
    // Head stays within a neck's length of the shoulders
    expect(
      Math.hypot((head?.x ?? 0) - (torso?.x ?? 0), (head?.y ?? 0) - (torso?.y ?? 0))
    ).toBeLessThan(6);
    for (const name of skeleton.getBoneNames()) {
      const bone = skeleton.getBone(name);
      expect(Number.isFinite(bone?.x)).toBe(true);
      expect((bone?.y ?? 0) - groundY).toBeLessThan(2);
    }
  });

  it('draws without throwing, including severed and removed limbs', () => {
    const skeleton = makeSkeleton('Armored', 'Grenade');
    skeleton.detachBone('arm_l');
    skeleton.removeLimb('leg_r');
    skeleton.setStyle(createRagdollStyle('Armored', 'Grenade'));
    run(skeleton, 800);
    const calls = vi.fn();
    const g = new Proxy(
      {},
      {
        get:
          () =>
          (...a: unknown[]) => (calls(...a), g),
      }
    );
    expect(() => skeleton.render(g as never, 1)).not.toThrow();
    expect(calls).toHaveBeenCalled();
  });

  it('reports ground hits for bleeding bones', () => {
    const skeleton = makeSkeleton('Basic', 'Grenade');
    const hits = vi.fn();
    skeleton.onGroundHit = hits;
    skeleton.addBloodEmitPoint('torso', 0.5, 20, 1500);
    skeleton.addBloodEmitPoint('leg_l', 0.5, 20, 1500);
    run(skeleton, 2000);
    expect(hits).toHaveBeenCalled();
  });
});

describe('ragdoll style and gore', () => {
  it('chars flame kills and marks shotgun kills with burst wounds', () => {
    expect(createRagdollStyle('Basic', 'Flame').tint).toBeDefined();
    const shot = createRagdollStyle('Basic', 'Shotgun');
    expect(shot.torsoWounds?.some(w => w.kind === 'burst')).toBe(true);
    expect(createRagdollStyle('Basic', 'Sniper').headWound).toBe(true);
  });

  it('uses oil instead of blood for machines', () => {
    expect(createRagdollStyle('Mechanical', 'Shotgun').blood).toBe(0x1a1a1a);
  });

  it('grows the pool while bleeding, up to a cap', () => {
    const gore = new RagdollGore(0x7a0a0a, 11, 40);
    const circles: number[] = [];
    const g = new Proxy(
      {},
      {
        get: (_t, p) =>
          p === 'ellipse' ? (_x: number, _y: number, rx: number) => (circles.push(rx), g) : () => g,
      }
    );
    gore.update(16, 0, 18, false);
    gore.draw(g as never);
    const early = Math.max(0, ...circles);
    circles.length = 0;
    for (let i = 0; i < 200; i++) gore.update(16, 0, 18, false);
    gore.draw(g as never);
    const late = Math.max(...circles);
    expect(late).toBeGreaterThan(early);
    expect(late).toBeLessThan(11 * 3);
  });
});
