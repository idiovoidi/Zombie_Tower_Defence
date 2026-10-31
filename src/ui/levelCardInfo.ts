import type { LevelData } from '../managers/LevelManager';

/** Optional campaign progress used to annotate level cards. */
export interface LevelProgressInfo {
  isCompleted(levelId: string): boolean;
  bestWave(levelId: string): number;
  /** Defaults to unlocked when omitted. */
  isUnlocked?(levelId: string): boolean;
}

/**
 * Card subtitle for a campaign level: "HARD · 15 WAVES", plus a second line
 * "LOCKED", "CLEARED" or "BEST WAVE 7" once the player has progress on it.
 */
export function describeCampaignLevel(level: LevelData, progress?: LevelProgressInfo): string {
  const lines = [
    `${level.difficulty.toUpperCase()} · ${
      level.totalWaves === undefined ? 'ENDLESS' : `${level.totalWaves} WAVES`
    }`,
  ];
  if (progress?.isUnlocked && !progress.isUnlocked(level.id)) {
    lines.push('LOCKED');
  } else if (progress?.isCompleted(level.id)) {
    lines.push('CLEARED');
  } else {
    const best = progress?.bestWave(level.id) ?? 0;
    if (best > 0) {
      lines.push(`BEST WAVE ${best}`);
    }
  }
  return lines.join('\n');
}
