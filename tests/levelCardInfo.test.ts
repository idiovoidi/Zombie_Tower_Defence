import { describe, expect, test } from 'vitest';
import type { LevelData } from '../src/managers/LevelManager';
import { describeCampaignLevel } from '../src/ui/levelCardInfo';

const level = (over: Partial<LevelData> = {}): LevelData => ({
  id: 'level3',
  name: 'Urban Maze',
  description: '',
  map: 'city',
  difficulty: 'Hard',
  startingMoney: 600,
  startingLives: 60,
  totalWaves: 15,
  resourceModifiers: { wood: 1, metal: 1, energy: 1 },
  ...over,
});

describe('describeCampaignLevel', () => {
  test('shows difficulty and wave count', () => {
    expect(describeCampaignLevel(level())).toBe('HARD · 15 WAVES');
  });

  test('endless levels say so', () => {
    expect(describeCampaignLevel(level({ totalWaves: undefined }))).toBe('HARD · ENDLESS');
  });

  test('completed levels show CLEARED, otherwise the best wave if any', () => {
    expect(describeCampaignLevel(level(), { isCompleted: () => true, bestWave: () => 15 })).toBe(
      'HARD · 15 WAVES\nCLEARED'
    );
    expect(describeCampaignLevel(level(), { isCompleted: () => false, bestWave: () => 7 })).toBe(
      'HARD · 15 WAVES\nBEST WAVE 7'
    );
    expect(describeCampaignLevel(level(), { isCompleted: () => false, bestWave: () => 0 })).toBe(
      'HARD · 15 WAVES'
    );
  });

  test('locked levels say LOCKED regardless of earlier progress', () => {
    expect(
      describeCampaignLevel(level(), {
        isCompleted: () => false,
        bestWave: () => 3,
        isUnlocked: () => false,
      })
    ).toBe('HARD · 15 WAVES\nLOCKED');
  });
});
