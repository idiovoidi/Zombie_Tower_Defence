import { describe, expect, test } from 'vitest';
import { buildEffectStats, type EffectLimits } from '../src/renderers/effects/EffectStats';

const limits: EffectLimits = {
  maxShellCasings: 50,
  maxMuzzleFlashes: 30,
  maxBulletTrails: 20,
  maxImpactFlashes: 30,
  maxScopeGlints: 10,
  maxBurningGroundEffects: 20,
};

const zero = {
  shellCasings: 0,
  muzzleFlashes: 0,
  bulletTrails: 0,
  impactFlashes: 0,
  scopeGlints: 0,
  burningGroundEffects: 0,
};
const pool = { active: 0, available: 0, created: 0, reused: 0 };
const pools = {
  shellCasings: pool,
  muzzleFlashes: pool,
  bulletTrails: pool,
  impactFlashes: pool,
  scopeGlints: pool,
  burningGroundEffects: pool,
};

describe('buildEffectStats', () => {
  test('no warnings when counts are low; total is the sum', () => {
    const stats = buildEffectStats({ ...zero, shellCasings: 3, scopeGlints: 2 }, limits, pools);
    expect(stats.warnings).toEqual([]);
    expect(stats.currentCounts.total).toBe(5);
  });

  test('warns above 80% of a limit, with the original wording', () => {
    const stats = buildEffectStats(
      { ...zero, shellCasings: 41, burningGroundEffects: 17 },
      limits,
      pools
    );
    expect(stats.warnings).toEqual([
      'High shell casing count: 41/50',
      'High burning ground effect count: 17/20',
    ]);
  });

  test('exactly 80% does not warn; total over 100 does', () => {
    expect(buildEffectStats({ ...zero, shellCasings: 40 }, limits, pools).warnings).toEqual([]);
    const big = {
      ...zero,
      shellCasings: 40,
      muzzleFlashes: 24,
      bulletTrails: 16,
      impactFlashes: 24,
      scopeGlints: 8,
    };
    expect(buildEffectStats(big, limits, pools).warnings).toEqual(['High total effect count: 112']);
  });

  test('reuse rate is reused / (created + reused) as a percentage', () => {
    const stats = buildEffectStats(zero, limits, {
      ...pools,
      muzzleFlashes: { active: 1, available: 2, created: 25, reused: 75 },
    });
    expect(stats.poolStats.muzzleFlashes.reuseRate).toBe(75);
    expect(stats.poolStats.shellCasings.reuseRate).toBe(0);
  });
});
