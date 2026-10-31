import { describe, expect, test } from 'vitest';
import { CampaignProgress, type ProgressStorage } from '../src/managers/CampaignProgress';
import { LevelManager } from '../src/managers/LevelManager';
import { MapManager } from '../src/managers/MapManager';

function memoryStorage(initial: Record<string, string> = {}): ProgressStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: key => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

function makeManager(storage = memoryStorage()) {
  const lm = new LevelManager(new MapManager(), new CampaignProgress(storage));
  return { lm, storage };
}

describe('campaign progression (debug off)', () => {
  test('only the first level is unlocked at the start', () => {
    const { lm } = makeManager();
    expect(lm.getCampaignLevels().map(l => l.id)).toEqual(['level1']);
  });

  test('winning a level unlocks the levels that depend on it', () => {
    const { lm } = makeManager();
    const unlocked = lm.markCompleted('level1');
    expect(unlocked.sort()).toEqual(['level2', 'level7']);
    expect(lm.isLevelUnlocked('level2')).toBe(true);
    expect(lm.isLevelUnlocked('level3')).toBe(false);
    expect(lm.isLevelCompleted('level1')).toBe(true);
  });

  test('replaying a completed level unlocks nothing new', () => {
    const { lm } = makeManager();
    lm.markCompleted('level1');
    expect(lm.markCompleted('level1')).toEqual([]);
  });

  test('unknown level ids are ignored', () => {
    const { lm } = makeManager();
    expect(lm.markCompleted('nope')).toEqual([]);
  });

  test('progress persists across sessions', () => {
    const storage = memoryStorage();
    makeManager(storage).lm.markCompleted('level1');
    makeManager(storage).lm.markCompleted('level2');

    const { lm } = makeManager(storage);
    expect(lm.isLevelUnlocked('level2')).toBe(true);
    expect(lm.isLevelUnlocked('level3')).toBe(true);
    expect(lm.isLevelCompleted('level2')).toBe(true);
    expect(lm.isLevelUnlocked('level4')).toBe(false);
  });

  test('corrupt or foreign saved data is ignored safely', () => {
    const storage = memoryStorage({ 'ztd.campaign.v1': '{not json' });
    expect(() => makeManager(storage)).not.toThrow();
    const odd = memoryStorage({
      'ztd.campaign.v1': JSON.stringify({
        unlocked: ['level3', 42, 'ghost'],
        bestWave: { level1: -4 },
      }),
    });
    const { lm } = makeManager(odd);
    expect(lm.isLevelUnlocked('level3')).toBe(true);
    expect(lm.isLevelUnlocked('ghost')).toBe(false);
    expect(lm.getBestWave('level1')).toBe(0);
  });

  test('missing storage just disables saving', () => {
    const lm = new LevelManager(new MapManager(), new CampaignProgress(null));
    expect(lm.markCompleted('level1')).toContain('level2');
  });

  test('best wave only ever increases', () => {
    const { lm } = makeManager();
    expect(lm.recordBestWave('level1', 5)).toBe(true);
    expect(lm.recordBestWave('level1', 3)).toBe(false);
    expect(lm.recordBestWave('level1', 5)).toBe(false);
    expect(lm.recordBestWave('level1', 7)).toBe(true);
    expect(lm.getBestWave('level1')).toBe(7);
  });

  test('every campaign level has a sensible length; the final level is endless', () => {
    const { lm } = makeManager();
    for (const id of ['level1', 'level2', 'level3', 'level4', 'level5', 'level7']) {
      const waves = lm.getLevel(id)?.totalWaves;
      expect(waves).toBeGreaterThanOrEqual(10);
      expect(waves).toBeLessThanOrEqual(25);
    }
    expect(lm.getLevel('level6')?.totalWaves).toBeUndefined();
  });

  test('clearCurrentLevel forgets the active level so a bare-map run cannot inherit it', () => {
    const { lm } = makeManager();
    expect(lm.loadLevel('level1')).toBe(true);
    expect(lm.getCurrentLevel()?.id).toBe('level1');
    lm.clearCurrentLevel();
    expect(lm.getCurrentLevel()).toBeUndefined();
  });
});
