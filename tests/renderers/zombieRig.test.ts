import { describe, expect, it, vi } from 'vitest';

import { computeHumanoidRigLayout } from '../../src/renderers/zombies/rig/humanoidRigLayout';
import { REST_POSE } from '../../src/renderers/zombies/rig/jointPose';
import {
  getGaitStyle,
  strideLength,
  ZombieAnimator,
} from '../../src/renderers/zombies/ZombieAnimator';

// The renderer module pulls in Pixi; only its pure facing helper is needed here
vi.mock('pixi.js', () => ({
  ColorMatrixFilter: class {},
  Container: class {},
  Graphics: class {},
}));
const { nextFacing } = await import('../../src/renderers/zombies/BaseZombieRenderer');

const flesh = { primary: 0x2d5016, dark: 0x1a3010, eyeGlow: 0xff0000 };
const ALL = { leftArm: true, rightArm: true, leftLeg: true, rightLeg: true };

function run(animator: ZombieAnimator, state: Record<string, unknown>, steps = 120) {
  const frames = [];
  for (let i = 0; i < steps; i++) {
    animator.update(16, { isMoving: true, health: 100, maxHealth: 100, limbs: ALL, ...state });
    frames.push(animator.getCurrentFrame());
  }
  return frames;
}

describe('humanoid rig layout', () => {
  it('stands feet on the ground with the head above the torso', () => {
    const l = computeHumanoidRigLayout(flesh, 15);
    expect(l.groundY).toBe(15);
    expect(l.hipY).toBeLessThan(l.groundY);
    expect(l.neckTopY).toBeLessThan(l.neckBaseY);
    expect(l.shoulderY).toBeLessThan(0);
  });

  it('scales proportions with the scale option', () => {
    const a = computeHumanoidRigLayout(flesh, 15);
    const b = computeHumanoidRigLayout({ ...flesh, scale: 2 }, 30);
    expect(b.thighLen).toBeCloseTo(a.thighLen * 2, 5);
  });
});

describe('zombie joint poses', () => {
  it('keeps walking joints finite and within sane bounds', () => {
    for (const f of run(new ZombieAnimator('BASIC'), {})) {
      for (const v of Object.values(f.joints)) {
        expect(Number.isFinite(v)).toBe(true);
        expect(Math.abs(v)).toBeLessThan(3);
      }
    }
  });

  it('swings the legs in antiphase while walking', () => {
    const frames = run(new ZombieAnimator('BASIC'), {}, 200);
    const maxL = Math.max(...frames.map(f => f.joints.hipL));
    const minL = Math.min(...frames.map(f => f.joints.hipL));
    expect(maxL).toBeGreaterThan(0.05);
    expect(minL).toBeLessThan(-0.05);
    const mid = frames.slice(60);
    const sameSign = mid.filter(f => f.joints.hipL * f.joints.hipR > 0.01).length;
    expect(sameSign).toBeLessThan(mid.length * 0.2);
  });

  it('leaves missing limbs at rest', () => {
    const frames = run(new ZombieAnimator('BASIC'), {
      limbs: { leftArm: false, rightArm: true, leftLeg: false, rightLeg: true },
    });
    for (const f of frames) {
      expect(f.joints.hipL).toBe(0);
      expect(f.joints.shoulderL).toBe(0);
    }
  });

  it('lies prone with the arms reaching ahead once the crawl blends in', () => {
    const f = run(new ZombieAnimator('BASIC'), { isCrawling: true }, 120).pop();
    expect(f?.joints.prone).toBe(1);
    // Torso rotated most of the way to horizontal, towards the facing side
    expect(f?.joints.torsoLean).toBeGreaterThan(1.1);
    expect(f?.joints.torsoLean).toBeLessThan(Math.PI / 2);
    // Remaining legs trail behind
    expect(f?.joints.hipL).toBeLessThan(-0.8);
  });

  it('falls into the crawl over a few frames instead of snapping', () => {
    const frames = run(new ZombieAnimator('BASIC'), { isCrawling: true }, 10);
    const prone = frames.map(f => f.joints.prone);
    expect(prone[0]).toBeGreaterThan(0);
    expect(prone[0]).toBeLessThan(0.2);
    expect(prone[9]).toBeGreaterThan(prone[0]);
  });

  it('idles close to the rest pose', () => {
    const f = run(new ZombieAnimator('BASIC'), { isMoving: false }, 60).pop();
    expect(Math.abs((f?.joints.hipL ?? 1) - REST_POSE.hipL)).toBeLessThan(0.3);
  });
});

describe('three-quarter rig layout', () => {
  it('puts the near limbs on the camera side and the face forward', () => {
    const l = computeHumanoidRigLayout(flesh, 15);
    expect(l.hipNearX).toBeLessThan(l.hipFarX);
    expect(l.shoulderNearX).toBeLessThan(l.shoulderFarX);
    expect(l.headX).toBeGreaterThan(0);
    expect(l.faceX).toBeGreaterThan(0);
  });

  it('drops a prone body so the torso lies on the ground, scaled with size', () => {
    const small = computeHumanoidRigLayout({ ...flesh, scale: 0.6, slim: true }, 10);
    const big = computeHumanoidRigLayout({ ...flesh, scale: 1.8, bulky: true }, 24);
    for (const l of [small, big]) {
      // Hips end up half a torso-width above the ground
      expect(l.hipY + l.proneDrop).toBeCloseTo(l.groundY - l.torsoW / 2, 5);
    }
    expect(big.proneDrop).toBeGreaterThan(small.proneDrop);
  });
});

describe('walk cadence', () => {
  it('steps faster when moving faster, and stops stepping when still', () => {
    const slow = new ZombieAnimator('BASIC');
    const fast = new ZombieAnimator('BASIC');
    run(slow, { speed: 10 }, 5);
    run(fast, { speed: 40 }, 5);
    expect(fast.getCadence()).toBeGreaterThan(slow.getCadence() * 2);

    const still = new ZombieAnimator('BASIC');
    run(still, { isMoving: false }, 5);
    expect(still.getCadence()).toBe(0);
  });

  it('plants feet without sliding: leg sweep per step matches distance walked', () => {
    for (const [type, speed, leg] of [
      ['BASIC', 25, 8.7],
      ['TANK', 12.5, 11.7],
      ['FAST', 50, 7.8],
    ] as const) {
      const animator = new ZombieAnimator(type);
      animator.setLimbLengths(leg, 7);
      const frames = run(animator, { speed }, 240);
      const hips = frames.map(f => f.joints.hipR);
      const sweep = leg * (Math.sin(Math.max(...hips)) - Math.sin(Math.min(...hips)));
      const travelPerStep = speed / animator.getCadence() / 2;
      expect(sweep / travelPerStep).toBeGreaterThan(0.8);
      expect(sweep / travelPerStep).toBeLessThan(1.25);
    }
  });

  it('uses the per-type stride from the gait table', () => {
    expect(strideLength(8, getGaitStyle('FAST').legSwing)).toBeGreaterThan(
      strideLength(8, getGaitStyle('TANK').legSwing)
    );
    expect(getGaitStyle('UNKNOWN')).toBe(getGaitStyle('BASIC'));
  });
});

describe('facing', () => {
  it('turns only on a clear horizontal heading', () => {
    expect(nextFacing(1, -0.9, true)).toBe(-1);
    expect(nextFacing(-1, 0.9, true)).toBe(1);
    // Near-vertical path or small wobble keeps the current facing
    expect(nextFacing(1, -0.2, true)).toBe(1);
    expect(nextFacing(-1, 0.25, true)).toBe(-1);
    expect(nextFacing(-1, 0, true)).toBe(-1);
  });

  it('takes the first heading immediately on spawn', () => {
    expect(nextFacing(1, -0.1, false)).toBe(-1);
  });
});
