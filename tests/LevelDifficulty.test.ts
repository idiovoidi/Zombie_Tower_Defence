import { describe, expect, test, vi } from 'vitest';
import { WaveManager } from '../src/managers/WaveManager';

vi.mock('../src/objects/ZombieFactory', () => ({ ZombieFactory: { createZombie: vi.fn() } }));

describe('level difficulty pressure', () => {
  test('scale table: harder levels apply more pressure', () => {
    const s = WaveManager.DIFFICULTY_SCALE;
    expect(s.Easy).toBeLessThan(s.Normal);
    expect(s.Normal).toBe(1);
    expect(s.Normal).toBeLessThan(s.Hard);
    expect(s.Hard).toBeLessThan(s.Nightmare);
  });

  test('Normal (the default) leaves counts and pacing unchanged', () => {
    const wm = new WaveManager();
    const before = [wm.calculateZombieCount(20, 7), wm.calculateSpawnRate(2, 7)];
    wm.setBaseDifficulty(WaveManager.DIFFICULTY_SCALE.Normal);
    expect([wm.calculateZombieCount(20, 7), wm.calculateSpawnRate(2, 7)]).toEqual(before);
  });

  test('harder levels spawn more zombies, closer together', () => {
    const easy = new WaveManager();
    const nightmare = new WaveManager();
    easy.setBaseDifficulty(WaveManager.DIFFICULTY_SCALE.Easy);
    nightmare.setBaseDifficulty(WaveManager.DIFFICULTY_SCALE.Nightmare);

    expect(nightmare.calculateZombieCount(20, 7)).toBeGreaterThan(easy.calculateZombieCount(20, 7));
    expect(nightmare.calculateSpawnRate(2, 7)).toBeLessThan(easy.calculateSpawnRate(2, 7));
  });

  test('base difficulty survives reset(), and invalid values fall back to 1', () => {
    const wm = new WaveManager();
    wm.setBaseDifficulty(1.2);
    wm.reset(1);
    expect(wm.getBaseDifficulty()).toBe(1.2);
    wm.setBaseDifficulty(0);
    expect(wm.getBaseDifficulty()).toBe(1);
    wm.setBaseDifficulty(-3);
    expect(wm.getBaseDifficulty()).toBe(1);
  });

  test('elite singletons (Boss / NecroTank) are not multiplied past the existing 1.15 cap', () => {
    const wm = new WaveManager();
    wm.setBaseDifficulty(WaveManager.DIFFICULTY_SCALE.Nightmare);
    expect(wm.calculateZombieCount(1, 12, 'NecroTank')).toBe(1);
  });
});
