import { describe, expect, test } from 'vitest';
import { BurnState } from '../src/objects/zombies/BurnState';
import { KnockbackState } from '../src/objects/zombies/KnockbackState';
import { getKnockbackResistance, getSwayAmplitude } from '../src/objects/zombies/ZombieTypeTraits';

describe('ZombieTypeTraits', () => {
  test('knockback resistance per type, with default for unknown/basic', () => {
    const expected: Record<string, number> = {
      Boss: 0.97,
      NecroTank: 0.95,
      Tank: 0.9,
      Armored: 0.7,
      Mechanical: 0.6,
      Stealth: 0.3,
      Fast: 0.2,
      Swarm: 0.1,
      Basic: 0.3,
      Mystery: 0.3,
    };
    for (const [type, value] of Object.entries(expected)) {
      expect(getKnockbackResistance(type)).toBe(value);
    }
  });

  test('sway amplitude per type, with default 8', () => {
    const expected: Record<string, number> = {
      Basic: 8,
      Fast: 5,
      Tank: 12,
      Armored: 7,
      Swarm: 10,
      Stealth: 6,
      Mechanical: 3,
      Boss: 15,
      NecroTank: 14,
      Mystery: 8,
    };
    for (const [type, value] of Object.entries(expected)) {
      expect(getSwayAmplitude(type)).toBe(value);
    }
  });
});

describe('KnockbackState', () => {
  test('moves at 200px/s along its direction and ends when depleted', () => {
    const k = new KnockbackState();
    expect(k.active).toBe(false);
    k.start(1, 0, 30);
    expect(k.active).toBe(true);
    expect(k.step(100)).toEqual({ x: 20, y: 0 }); // 200px/s * 0.1s
    expect(k.active).toBe(true);
    expect(k.step(100)).toEqual({ x: 10, y: 0 }); // clamped to remaining 10px
    expect(k.active).toBe(false);
    expect(k.step(100)).toEqual({ x: 0, y: 0 });
  });

  test('reset cancels an in-progress push', () => {
    const k = new KnockbackState();
    k.start(0, 1, 50);
    k.reset();
    expect(k.active).toBe(false);
  });
});

describe('BurnState', () => {
  test('ignites after 1s of continuous exposure and burns 3s', () => {
    const b = new BurnState();
    expect(b.addExposure(500, true)).toBe(false);
    expect(b.exposureProgress).toBeCloseTo(0.5);
    expect(b.addExposure(500, true)).toBe(true);
    expect(b.isBurning).toBe(true);
    expect(b.burnRemainingMs).toBe(3000);
    expect(b.exposureProgress).toBe(1);
  });

  test('does not ignite while dying, but keeps accumulating exposure', () => {
    const b = new BurnState();
    expect(b.addExposure(1500, false)).toBe(false);
    expect(b.isBurning).toBe(false);
    expect(b.exposureProgress).toBe(1);
    // once allowed, the next exposure tick ignites immediately
    expect(b.addExposure(16, true)).toBe(true);
  });

  test('burn damage is 15 DPS and the burn expires', () => {
    const b = new BurnState();
    b.addExposure(1000, true);
    expect(b.damageFor(1000)).toBe(15);
    expect(b.advance(2999)).toBe(false);
    expect(b.advance(1)).toBe(true);
    expect(b.isBurning).toBe(false);
    expect(b.burnRemainingMs).toBe(0);
  });

  test('standing in fire while burning refreshes duration, capped at 3s', () => {
    const b = new BurnState();
    b.addExposure(1000, true);
    b.advance(2000); // 1000 left
    expect(b.addExposure(1000, true)).toBe(false);
    expect(b.burnRemainingMs).toBe(1500); // +0.5 per ms
    b.addExposure(10000, true);
    expect(b.burnRemainingMs).toBe(3000);
  });

  test('leaving fire clears exposure at end of frame; staying keeps it', () => {
    const b = new BurnState();
    b.addExposure(600, true);
    b.endFrame(); // was in fire this frame -> keep
    expect(b.exposureProgress).toBeCloseTo(0.6);
    b.endFrame(); // not in fire this frame -> reset
    expect(b.exposureProgress).toBe(0);
  });

  test('exposure is kept while burning even if out of fire; reset clears all', () => {
    const b = new BurnState();
    b.addExposure(1000, true);
    b.endFrame();
    b.endFrame();
    expect(b.isBurning).toBe(true);
    b.reset();
    expect(b.isBurning).toBe(false);
    expect(b.exposureProgress).toBe(0);
  });
});
