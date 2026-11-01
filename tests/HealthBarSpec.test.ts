import { describe, expect, test } from 'vitest';
import {
  DEFAULT_HEALTH_BAR,
  getThreatBarSpec,
  healthBarColor,
  shouldShowHealthBar,
} from '../src/objects/zombies/HealthBarSpec';

describe('getThreatBarSpec', () => {
  test('big threats get a bar, scaled by size', () => {
    for (const type of ['Boss', 'NecroTank', 'Tank', 'Armored', 'Mechanical']) {
      expect(getThreatBarSpec(type)).not.toBeNull();
    }
    const boss = getThreatBarSpec('Boss');
    const tank = getThreatBarSpec('Tank');
    const armored = getThreatBarSpec('Armored');
    expect(boss?.width).toBeGreaterThan(tank?.width ?? 0);
    expect(tank?.width).toBeGreaterThan(armored?.width ?? 0);
    // Bigger sprites sit higher, so the bar clears the head
    expect(boss?.offsetY).toBeLessThan(tank?.offsetY ?? 0);
  });

  test('small zombies rely on tint (no default bar)', () => {
    for (const type of ['Basic', 'Fast', 'Swarm', 'Stealth', 'Unknown']) {
      expect(getThreatBarSpec(type)).toBeNull();
    }
  });

  test('default bar is the debug fallback size', () => {
    expect(DEFAULT_HEALTH_BAR.width).toBe(30);
  });
});

describe('healthBarColor', () => {
  test('green at/above 50, yellow 25-49, red below 25', () => {
    expect(healthBarColor(100)).toBe(0x3ddc4a);
    expect(healthBarColor(50)).toBe(0x3ddc4a);
    expect(healthBarColor(49.9)).toBe(0xf2c230);
    expect(healthBarColor(25)).toBe(0xf2c230);
    expect(healthBarColor(24.9)).toBe(0xe5322d);
    expect(healthBarColor(1)).toBe(0xe5322d);
  });
});

describe('shouldShowHealthBar', () => {
  test('only when damaged and alive, and enabled for the type', () => {
    expect(shouldShowHealthBar(100, true)).toBe(false); // untouched
    expect(shouldShowHealthBar(99, true)).toBe(true);
    expect(shouldShowHealthBar(0, true)).toBe(false); // dead
    expect(shouldShowHealthBar(60, false)).toBe(false); // type opts out
  });
});
