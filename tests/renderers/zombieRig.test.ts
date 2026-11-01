import { describe, expect, it } from 'vitest';
import { computeHumanoidRigLayout } from '../../src/renderers/zombies/rig/humanoidRigLayout';
import { REST_POSE } from '../../src/renderers/zombies/rig/jointPose';
import { ZombieAnimator } from '../../src/renderers/zombies/ZombieAnimator';

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

  it('tucks the legs and reaches forward when crawling', () => {
    const f = run(new ZombieAnimator('BASIC'), { isCrawling: true }).pop();
    expect(f?.joints.kneeL).toBeGreaterThan(0.3);
  });

  it('idles close to the rest pose', () => {
    const f = run(new ZombieAnimator('BASIC'), { isMoving: false }, 60).pop();
    expect(Math.abs((f?.joints.hipL ?? 1) - REST_POSE.hipL)).toBeLessThan(0.3);
  });
});
