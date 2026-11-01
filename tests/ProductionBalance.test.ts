import { describe, expect, test, vi } from 'vitest';
import { DebugConstants } from '../src/config/debugConstants';
import { GameConfig } from '../src/config/gameConfig';
import { TowerManager } from '../src/managers/TowerManager';
import { WaveManager } from '../src/managers/WaveManager';

vi.mock('../src/objects/ZombieFactory', () => ({ ZombieFactory: { createZombie: vi.fn() } }));

/**
 * The shipped game used to run with debug multipliers (0.1x costs, 1.5x range, 0.5x zombie
 * speed, 0.5x spawn rate). Those values are now part of the base balance so production,
 * dev and tests all play the same. These tests pin that.
 */
describe('production balance (debug off)', () => {
  test('debug mode is off under test, so only base values apply', () => {
    expect(DebugConstants.ENABLED).toBe(false);
  });

  test('debug multipliers are neutral so enabling debug does not change the feel', () => {
    expect(DebugConstants.TOWER_COST_MULTIPLIER).toBe(1);
    expect(DebugConstants.UPGRADE_COST_MULTIPLIER).toBe(1);
    expect(DebugConstants.TOWER_RANGE_MULTIPLIER).toBe(1);
    expect(DebugConstants.TOWER_DAMAGE_MULTIPLIER).toBe(1);
    expect(DebugConstants.TOWER_FIRE_RATE_MULTIPLIER).toBe(1);
    expect(DebugConstants.ZOMBIE_SPEED_MULTIPLIER).toBe(1);
    expect(DebugConstants.ZOMBIE_SPAWN_RATE_MULTIPLIER).toBe(1);
    expect(DebugConstants.ZOMBIE_HEALTH_MULTIPLIER).toBe(1);
  });

  test('tower costs and ranges use the tuned scale', () => {
    const tm = new TowerManager();
    expect(tm.getTowerCost('MachineGun')).toBe(25);
    expect(tm.getTowerCost('Sniper')).toBe(90);
    expect(tm.getTowerCost('Shotgun')).toBe(40);
    expect(tm.getTowerCost('Flame')).toBe(75);
    expect(tm.getTowerCost('Tesla')).toBe(150);
    expect(tm.getTowerCost('Grenade')).toBe(125);
    expect(tm.getTowerCost('Sludge')).toBe(80);
    expect(tm.calculateTowerRange('MachineGun', 1)).toBe(210);
    expect(tm.calculateTowerRange('Sniper', 1)).toBe(525);
  });

  test('starting economy is 1000 money / 100 lives', () => {
    expect(GameConfig.STARTING_MONEY).toBe(1000);
    expect(GameConfig.STARTING_LIVES).toBe(100);
  });

  test('wave spawn intervals are scaled by SPAWN_INTERVAL_SCALE', () => {
    const wm = new WaveManager();
    const wave1 = wm.getZombiesForWave(1);
    expect(WaveManager.SPAWN_INTERVAL_SCALE).toBe(2);
    expect(wave1[0].spawnInterval).toBeCloseTo(2.2 * 2);
    expect(wave1[1].spawnInterval).toBeCloseTo(2.6 * 2);
  });
});
